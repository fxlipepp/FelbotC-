const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const settings = require('../settings');
const isOwnerOrSudo = require('../lib/isOwner');

const PROTECTED_GIT_PATHS = ['session', 'baileys_store.json', 'tmp', 'temp', 'data'];

function hasCommand(command) {
    try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function getRestartStrategy() {
    if (process.env.BOT_RESTART_MODE === 'pm2') return 'pm2';
    if (process.env.PM2_HOME || process.env.PM2_JSON_PROCESSING || process.env.NODE_APP_INSTANCE !== undefined) return 'pm2';
    if (hasCommand('pm2')) return 'pm2';
    return 'process_exit';
}

function getProtectedGitPaths() {
    return [...PROTECTED_GIT_PATHS];
}

function buildSafeGitUpdatePlan() {
    return [
        'git fetch --all --prune',
        'git reset --hard origin/main',
        'npm install --no-audit --no-fund'
    ];
}

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString()));
            resolve((stdout || '').toString());
        });
    });
}

async function hasGitRepo() {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) return false;
    try {
        await run('git --version');
        return true;
    } catch {
        return false;
    }
}

async function updateViaGit() {
    const oldRev = (await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
    const beforePull = (await run('git status --short').catch(() => '')).trim();
    await run('git fetch --all --prune');
    const remoteMain = (await run('git rev-parse origin/main').catch(() => '')).trim();
    if (!remoteMain) {
        throw new Error('No se encontró la rama origin/main en este repositorio Git.');
    }

    const alreadyUpToDate = oldRev === remoteMain;
    if (!alreadyUpToDate) {
        await run('git reset --hard origin/main');
    }

    const newRev = (await run('git rev-parse HEAD').catch(() => remoteMain)).trim();
    const commits = alreadyUpToDate ? '' : await run(`git log --pretty=format:"%h %s (%an)" ${oldRev}..${newRev}`).catch(() => '');
    const files = alreadyUpToDate ? '' : await run(`git diff --name-status ${oldRev} ${newRev}`).catch(() => '');
    const needsNpmInstall = /(^|\/)(package\.json|package-lock\.json)$/.test((await run('git diff --name-only HEAD@{1} HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD').catch(() => '')).trim());

    return { oldRev, newRev, alreadyUpToDate, commits, files, needsNpmInstall, beforePull };
}

function downloadFile(url, dest, visited = new Set()) {
    return new Promise((resolve, reject) => {
        try {
            // Avoid infinite redirect loops
            if (visited.has(url) || visited.size > 5) {
                return reject(new Error('Too many redirects'));
            }
            visited.add(url);

            const useHttps = url.startsWith('https://');
            const client = useHttps ? require('https') : require('http');
            const req = client.get(url, {
                headers: {
                    'User-Agent': 'KnightBot-Updater/1.0',
                    'Accept': '*/*'
                }
            }, res => {
                // Handle redirects
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    const location = res.headers.location;
                    if (!location) return reject(new Error(`HTTP ${res.statusCode} without Location`));
                    const nextUrl = new URL(location, url).toString();
                    res.resume();
                    return downloadFile(nextUrl, dest, visited).then(resolve).catch(reject);
                }

                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }

                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', err => {
                    try { file.close(() => {}); } catch {}
                    fs.unlink(dest, () => reject(err));
                });
            });
            req.on('error', err => {
                fs.unlink(dest, () => reject(err));
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function extractZip(zipPath, outDir) {
    // Try to use platform tools; no extra npm modules required
    if (process.platform === 'win32') {
        const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir.replace(/\\/g, '/')}' -Force"`;
        await run(cmd);
        return;
    }
    // Linux/mac: try unzip, else 7z, else busybox unzip
    try {
        await run('command -v unzip');
        await run(`unzip -o '${zipPath}' -d '${outDir}'`);
        return;
    } catch {}
    try {
        await run('command -v 7z');
        await run(`7z x -y '${zipPath}' -o'${outDir}'`);
        return;
    } catch {}
    try {
        await run('busybox unzip -h');
        await run(`busybox unzip -o '${zipPath}' -d '${outDir}'`);
        return;
    } catch {}
    throw new Error("No system unzip tool found (unzip/7z/busybox). Git mode is recommended on this panel.");
}

function copyRecursive(src, dest, ignore = [], relative = '', outList = []) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        if (ignore.includes(entry)) continue;
        const s = path.join(src, entry);
        const d = path.join(dest, entry);
        const stat = fs.lstatSync(s);
        if (stat.isDirectory()) {
            copyRecursive(s, d, ignore, path.join(relative, entry), outList);
        } else {
            fs.copyFileSync(s, d);
            if (outList) outList.push(path.join(relative, entry).replace(/\\/g, '/'));
        }
    }
}

async function updateViaZip(sock, chatId, message, zipOverride) {
    const zipUrl = (zipOverride || settings.updateZipUrl || process.env.UPDATE_ZIP_URL || '').trim();
    if (!zipUrl) {
        throw new Error('No ZIP URL configured. Set settings.updateZipUrl or UPDATE_ZIP_URL env.');
    }
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const zipPath = path.join(tmpDir, 'update.zip');
    await downloadFile(zipUrl, zipPath);
    const extractTo = path.join(tmpDir, 'update_extract');
    if (fs.existsSync(extractTo)) fs.rmSync(extractTo, { recursive: true, force: true });
    await extractZip(zipPath, extractTo);

    // Find the top-level extracted folder (GitHub zips create REPO-branch folder)
    const [root] = fs.readdirSync(extractTo).map(n => path.join(extractTo, n));
    const srcRoot = fs.existsSync(root) && fs.lstatSync(root).isDirectory() ? root : extractTo;

    // Copy over while preserving runtime dirs/files
    const ignore = ['node_modules', '.git', 'session', 'tmp', 'tmp/', 'temp', 'data', 'baileys_store.json'];
    const copied = [];
    // Preserve ownerNumber from existing settings.js if present
    let preservedOwner = null;
    let preservedBotOwner = null;
    try {
        const currentSettings = require('../settings');
        preservedOwner = currentSettings && currentSettings.ownerNumber ? String(currentSettings.ownerNumber) : null;
        preservedBotOwner = currentSettings && currentSettings.botOwner ? String(currentSettings.botOwner) : null;
    } catch {}
    copyRecursive(srcRoot, process.cwd(), ignore, '', copied);
    if (preservedOwner) {
        try {
            const settingsPath = path.join(process.cwd(), 'settings.js');
            if (fs.existsSync(settingsPath)) {
                let text = fs.readFileSync(settingsPath, 'utf8');
                text = text.replace(/ownerNumber:\s*'[^']*'/, `ownerNumber: '${preservedOwner}'`);
                if (preservedBotOwner) {
                    text = text.replace(/botOwner:\s*'[^']*'/, `botOwner: '${preservedBotOwner}'`);
                }
                fs.writeFileSync(settingsPath, text);
            }
        } catch {}
    }
    // Cleanup extracted directory
    try { fs.rmSync(extractTo, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(zipPath, { force: true }); } catch {}
    return { copiedFiles: copied };
}

async function restartProcess(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { text: '♻️ Felbot se está reiniciando para aplicar los cambios...' }, { quoted: message });
    } catch {}

    const strategy = getRestartStrategy();
    if (strategy === 'pm2') {
        try {
            await run('pm2 restart all');
            return;
        } catch {}
    }

    setTimeout(() => {
        process.exit(0);
    }, 700);
}

async function updateCommand(sock, chatId, message, zipOverride) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { text: 'Only bot owner or sudo can use .update' }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(chatId, { text: '🔍 Revisando actualizaciones de GitHub...' }, { quoted: message });

        if (await hasGitRepo()) {
            const { oldRev, newRev, alreadyUpToDate, commits, files, needsNpmInstall } = await updateViaGit();

            if (alreadyUpToDate) {
                await sock.sendMessage(chatId, { text: `✅ Felbot ya está actualizado. Último commit: ${newRev.slice(0, 7)}` }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, { text: `✅ Se encontraron cambios nuevos. Actualizando desde ${oldRev.slice(0, 7)} a ${newRev.slice(0, 7)}...` }, { quoted: message });

            if (needsNpmInstall) {
                await sock.sendMessage(chatId, { text: '📦 Se detectó un cambio en dependencias. Instalando paquetes...' }, { quoted: message });
                await run('npm install --no-audit --no-fund');
            }

            await restartProcess(sock, chatId, message);
            await sock.sendMessage(chatId, { text: '✅ Actualización aplicada correctamente.' }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ No se encontró un repositorio Git activo. Usando modo ZIP alternativo.' }, { quoted: message });
            const { copiedFiles } = await updateViaZip(sock, chatId, message, zipOverride);
            await sock.sendMessage(chatId, { text: `✅ Descarga y aplicación completada (${copiedFiles?.length || 0} archivos).` }, { quoted: message });
            await restartProcess(sock, chatId, message);
        }
    } catch (err) {
        console.error('Update failed:', err);
        await sock.sendMessage(chatId, { text: `❌ Falló la actualización:\n${String(err.message || err)}` }, { quoted: message });
    }
}

module.exports = updateCommand;
module.exports.updateViaGit = updateViaGit;
module.exports.getProtectedGitPaths = getProtectedGitPaths;
module.exports.buildSafeGitUpdatePlan = buildSafeGitUpdatePlan;
module.exports.restartProcess = restartProcess;
module.exports.getRestartStrategy = getRestartStrategy;

