const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

function getSafeCleanupTargets() {
    return [
        path.join(process.cwd(), 'tmp'),
        path.join(process.cwd(), 'temp')
    ];
}

function shouldSkipPath(targetPath) {
    const relative = path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
    const clean = relative.startsWith('../') ? relative.slice(3) : relative;
    const lower = clean.toLowerCase();

    return [
        'session',
        'session/',
        'node_modules',
        'node_modules/',
        'package.json',
        'package-lock.json',
        '.git',
        '.git/',
        'data',
        'data/',
        'commands',
        'commands/',
        'lib',
        'lib/',
        'models',
        'models/'
    ].includes(lower) || lower.startsWith('session/') || lower.startsWith('node_modules/') || lower.startsWith('data/') || lower.startsWith('lib/') || lower.startsWith('models/');
}

function getDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;

    let total = 0;
    for (const entry of fs.readdirSync(dirPath)) {
        const targetPath = path.join(dirPath, entry);
        const stat = fs.lstatSync(targetPath);
        if (stat.isDirectory()) {
            total += getDirectorySize(targetPath);
        } else {
            total += stat.size;
        }
    }
    return total;
}

function clearDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            return { success: true, message: `No existía ${path.basename(dirPath)}.`, count: 0, size: 0 };
        }

        const entries = fs.readdirSync(dirPath);
        let deletedCount = 0;
        let deletedSize = 0;

        for (const entry of entries) {
            const targetPath = path.join(dirPath, entry);
            if (shouldSkipPath(targetPath)) continue;

            try {
                const stat = fs.lstatSync(targetPath);
                if (stat.isDirectory()) {
                    const nested = getDirectorySize(targetPath);
                    fs.rmSync(targetPath, { recursive: true, force: true });
                    deletedCount += 1;
                    deletedSize += nested;
                } else {
                    deletedSize += stat.size;
                    fs.unlinkSync(targetPath);
                    deletedCount += 1;
                }
            } catch (err) {
                console.error(`Error deleting file ${entry}:`, err);
            }
        }

        const baseName = path.basename(dirPath) || dirPath;
        const sizeLabel = deletedSize >= 1024 * 1024 ? `${(deletedSize / (1024 * 1024)).toFixed(1)} MB` : `${deletedSize} bytes`;
        return {
            success: true,
            message: `Se limpiaron ${deletedCount} elementos de ${baseName} (${sizeLabel}).`,
            count: deletedCount,
            size: deletedSize
        };
    } catch (error) {
        console.error('Error in clearDirectory:', error);
        return { success: false, message: `No se pudo limpiar ${path.basename(dirPath)}.`, error: error.message };
    }
}

async function clearTmpDirectory() {
    const targets = getSafeCleanupTargets();
    const results = targets.map(clearDirectory);
    const success = results.every(r => r.success);
    const totalDeleted = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
    const sizeLabel = totalSize >= 1024 * 1024 ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB` : `${totalSize} bytes`;

    return {
        success,
        message: success ? `✅ Limpieza completada: ${totalDeleted} archivos eliminados (${sizeLabel}).` : '❌ No se pudo completar la limpieza segura.',
        count: totalDeleted,
        size: totalSize
    };
}

async function clearTmpCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Este comando solo está disponible para el owner.' });
            return;
        }

        const result = await clearTmpDirectory();
        await sock.sendMessage(chatId, { text: result.message || '✅ Limpieza finalizada.' });
    } catch (error) {
        console.error('Error in cleartmp command:', error);
        await sock.sendMessage(chatId, { text: '❌ No se pudieron limpiar los archivos temporales.' });
    }
}

function startAutoClear() {
    clearTmpDirectory().catch(err => console.error('[Auto Clear]', err));

    setInterval(async () => {
        const result = await clearTmpDirectory();
        if (!result.success) {
            console.error(`[Auto Clear] ${result.message}`);
        }
    }, 6 * 60 * 60 * 1000);
}

function hasCommand(command) {
    try {
        const { execSync } = require('child_process');
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

function isTestRuntime() {
    return (
        process.env.NODE_ENV === 'test' ||
        process.env.NODE_ENV === 'testing' ||
        process.argv.includes('--test') ||
        process.argv.some((arg) => /node:test|jest|mocha/.test(arg)) ||
        typeof process.env.JEST_WORKER_ID !== 'undefined'
    );
}

if (!global.__felbotAutoClearStarted && !isTestRuntime()) {
    startAutoClear();
    global.__felbotAutoClearStarted = true;
}

module.exports = clearTmpCommand;
module.exports.clearTmpDirectory = clearTmpDirectory;
module.exports.clearDirectory = clearDirectory;
module.exports.getSafeCleanupTargets = getSafeCleanupTargets;
module.exports.getRestartStrategy = getRestartStrategy;