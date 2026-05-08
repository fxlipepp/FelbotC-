const fs = require('fs');
const path = require('path');

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

async function helpCommand(sock, chatId, message) {

    const uptime = formatUptime(process.uptime());
    const version = '2.0.0';

    const videoPath = path.join('assets', 'gifs', 'menu', 'menu.mp4');

    const helpMessage = `
╭━〔 𝐌𝐄𝐍𝐔 - 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━╮
┃ ✦ Canal: ✧ FELBOT 夜 | Oficial ✧
┃ 👑 Creador: Fxlipe 夜
┃ ⚙️ Versión : v${version}
┃ ⏳ Uptime: ${uptime}
╰━━━━━━━━━╯

┏━✦「 🌐 𝐆𝐄𝐍𝐄𝐑𝐀𝐋 」✦━┓
⪼ .menu
⪼ .ping
⪼ .alive
⪼ .tts
⪼ .owner
⪼ .attp 
⪼ .8ball
⪼ .groupinfo
⪼ .staff / .admins
⪼ .vv
⪼ .trt
⪼ .ss
⪼ .jid
⪼ .url
┗━━━━━━━━━┛

┏━✦「 👮‍♂️ 𝐀𝐃𝐌𝐈𝐍 」✦━┓
⪼ .ban
⪼ .promote
⪼ .demote
⪼ .mute
⪼ .unmute
⪼ .delete / .del
⪼ .kick
⪼ .warnings
⪼ .warn
⪼ .antilink
⪼ .antibadword
⪼ .clear
⪼ .tag
⪼ .tagall
⪼ .hidetag
⪼ .setgdesc
⪼ .setgname
┗━━━━━━━━━┛

┏━✦「 🔒 𝐎𝐖𝐍𝐄𝐑 」✦━┓
⪼ .mode
⪼ .clearsession
⪼ .update
⪼ .settings
⪼ .autoreact
⪼ .autotyping
⪼ .autoread
⪼ .anticall
⪼ .pmblocker
⪼ .setmention
┗━━━━━━━━━┛

┏━✦「 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 」✦━┓
⪼ .sticker
⪼ .take
⪼ .emojimix
⪼ .meme
⪼ .removebg
┗━━━━━━━━━┛

┏━✦「 🎮 𝐆𝐀𝐌𝐄𝐒 」✦━┓
⪼ .tictactoe
⪼ .hangman
⪼ .guess
⪼ .trivia
⪼ .truth
⪼ .dare
┗━━━━━━━━━┛

┏━✦「 🎯 𝐅𝐔𝐍 」✦━┓
⪼ .compliment
⪼ .insult
⪼ .flirt
⪼ .ship
⪼ .simp
⪼ .stupid
┗━━━━━━━━━┛

┏✦「 📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 」✦┓
⪼ .play
⪼ .song
⪼ .spotify
⪼ .tiktok
⪼ .facebook
⪼ .instagram
⪼ .ytmp4
┗━━━━━━━━━┛

┏━✦「 🧩 𝐌𝐈𝐒𝐂 」✦━┓
⪼ .heart
⪼ .horny
⪼ .circle
⪼ .lgbt
⪼ .lolice
⪼ .tweet
⪼ .gay
⪼ .jail
⪼ .triggered
┗━━━━━━━━━┛

✦〔 ⚡ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 v${version} ⚡ 〕✦
🔥 FELBOT • POWERED BY Fxlipe 夜
`;

    try {

        if (fs.existsSync(videoPath)) {

            const videoBuffer = fs.readFileSync(videoPath);

            await sock.sendMessage(chatId, {
                video: videoBuffer,
                gifPlayback: true,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409628624676@newsletter',
                        newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
                    }
                }
            }, { quoted: message });

        } else {

            await sock.sendMessage(chatId, {
                text: helpMessage
            }, { quoted: message });

        }

    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: helpMessage }, { quoted: message });
    }
}

module.exports = helpCommand;