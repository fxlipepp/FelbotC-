// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const chalk = require('chalk');
const User = require('./models/User')
const Group = require('./models/Group')
const path = require('path');

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Auto-cleaner every 3 hours
setInterval(() => {
    fs.readdir(customTemp, (err, files) => {
        if (err) return;
        for (const file of files) {
            const filePath = path.join(customTemp, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
                    fs.unlink(filePath, () => { });
                }
            });
        }
    });
    console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const { follarCommand } = require('./commands/follar')
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');

// Command imports
const tagAllCommand = require('./commands/tagall');
const topCommand = require('./commands/top');
const helpCommand = require('./commands/menu');
const { cumCommand } = require('./commands/cum')
const { spamCommand, getSpamConfig } = require('./commands/spam');
const { masturbarseCommand } = require('./commands/masturbarse')
const banCommand = require('./commands/ban');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const bratCommand = require('./commands/brat')
const groupCloseCommand = require('./commands/groupclose')
const muteCommand = require('./commands/mute');
const protegerCommand = require('./commands/proteger');
const desprotegerCommand = require('./commands/desproteger');
const { nsfwCommand } = require('./commands/nsfw')
const { xnxxCommand, xnxxNumberReply} = require('./commands/xnxx')
const modoAdminCommand = require('./commands/modoadmin')
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { versusCommand, handleVersusReaction, handleVersusButton, upVersusCommand} = require('./commands/versus');
const {propuestaCommand,aceptarPropuesta,rechazarPropuesta,handleProposalButton,divorcioCommand,divortioCommand} = require('./commands/propuesta')
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { scheduleCommand, deleteScheduleCommand, deleteAllSchedulesCommand } = require('./commands/schedule');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand } = require('./commands/mention');
const memeCommand = require('./commands/meme');
const { besarCommand } = require('./commands/besar')
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const kickCommand = require('./commands/kick');
const simageCommand = require('./commands/simage');
const { welcomeCommand, handleJoinEvent } = require('./commands/welcome')
const { goodbyeCommand, handleLeaveEvent } = require('./commands/goodbye');
const attpCommand = require('./commands/attp');
const { startHangman, guessLetter } = require('./commands/hangman');
const { startTrivia, answerTrivia } = require('./commands/trivia');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const { eightBallCommand } = require('./commands/eightball');
const { dareCommand } = require('./commands/dare');
const { truthCommand } = require('./commands/truth');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const infoCommand = require('./commands/info');
const blurCommand = require('./commands/img-blur');
const piropoCommand = require('./commands/piropo');
const githubCommand = require('./commands/github');
const { handleChatbotCommand, handleChatbotResponse } = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const { flirtCommand } = require('./commands/flirt');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const shipCommand = require('./commands/ship');
const parejasCommand = require('./commands/parejas');
const groupInfoCommand = require('./commands/groupinfo');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
const { simpCommand } = require('./commands/simp');
const { stupidCommand } = require('./commands/stupid');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const clearTmpCommand = require('./commands/cleartmp');
const { panelCommand, handlePanelButton } = require('./commands/panel');
const setProfilePicture = require('./commands/setpp');
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./commands/groupmanage');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const spotifyCommand = require('./commands/spotify');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');
const songModule = require('./commands/song');
const songCommand = songModule.songCommand || songModule;
const { handleSongButton } = songModule;
const formatsCommand = require('./commands/formats');
const aiCommand = require('./commands/ai');
const { handleTranslateCommand } = require('./commands/translate');
const { addCommandReaction, handleAreactCommand } = require('./lib/reactions');
const { goodnightCommand } = require('./commands/goodnight');
const { shayariCommand } = require('./commands/shayari');
const { rosedayCommand } = require('./commands/roseday');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');
const { miscCommand, handleHeart } = require('./commands/misc');
const { animeCommand } = require('./commands/anime');
const { piesCommand, piesAlias } = require('./commands/pies');
const stickercropCommand = require('./commands/stickercrop');
const updateCommand = require('./commands/update');
const removebgCommand = require('./commands/removebg');
const { reminiCommand } = require('./commands/remini');
const { igsCommand } = require('./commands/igs');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const soraCommand = require('./commands/sora');
const { handleGameCommand, handleGameInput } = require('./commands/gameSystem');
const { showEconomyMenu, registerMe, toggleEconomy, showSaldo, showPerfil, showTop, dailyReward, workCommand, mineCommand, processTransfer, removeCoinsFromUser, handleRobbery, protectMe, openShop, buyProduct, viewCompanies, openCompanyDetails, buyCompany, upgradeCompany, mysteryBox, rouletteGame, slotsGame, blackjackInitial, blackjackHit, blackjackStand, crashGame, withdrawCrash, handleEconomyButton, formatCountdown, isEconomyCommand, resetEconomy } = require('./commands/felcoins');
const { getEconomyEnabled, ensureEconomyUser, formatFelCoins, deductBalance, isOwnerAccount, parseAmount, getCommandCost, chargeCommandCost, hasRoyalProtection } = require('./lib/felcoins');
const { AIRich, Button, ButtonV2, Carousel, Toolkit } = require('./lib/airich');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A";
global.ytch = "Mr Unique Hacker";

// Add this near the top of main.js with other global configurations
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363409628624676@newsletter',
            newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧',
            serverMessageId: -1
        }
    }
};

const menuButtonIds = new Set([
    'view_full_menu',
    'owner',
    'report_error',
    'request_command',
    'buy_bot'
]);

function getButtonId(messageContent) {
    const nativeParamsJson = messageContent?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

    if (nativeParamsJson) {
        try {
            const params = JSON.parse(nativeParamsJson);
            return params?.id || params?.button_id || params?.selected_id || null;
        } catch (error) {
            console.error('❌ Error leyendo botón nativo:', error.message);
        }
    }

    return messageContent?.buttonsResponseMessage?.selectedButtonId
        || messageContent?.templateButtonReplyMessage?.selectedId
        || messageContent?.listResponseMessage?.singleSelectReply?.selectedRowId
        || null;
}

async function handleNativeMenuButton(sock, chatId, buttonId, message) {
    if (buttonId === 'owner') {
        const ownerCommand = require('./commands/owner');
        await ownerCommand(sock, chatId);
        return true;
    }

    if (buttonId === 'request_command') {
        const ownerNumber = settings.ownerNumber.replace(/[^0-9]/g, '');
        const requestMessage = 'Buenas tengo una solicitud de comando, puedes ayudarme?';
        const requestUrl = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(requestMessage)}`;
        await sock.sendMessage(chatId, {
            text: `📩 Para solicitar un comando, abre este enlace:\n${requestUrl}`
        }, { quoted: message });
        return true;
    }

    if (buttonId === 'buy_bot') {
        const ownerNumber = settings.ownerNumber.replace(/[^0-9]/g, '');
        const buyMessage = 'Buenas deseo adquirir el bot, me puedes asesorar?';
        const buyUrl = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(buyMessage)}`;
        await sock.sendMessage(chatId, {
            text: `📩 Para adquirir el bot, abre este enlace:\n${buyUrl}`
        }, { quoted: message });
        return true;
    }

    if (buttonId === 'report_error') {
        const ownerNumber = settings.ownerNumber.replace(/[^0-9]/g, '');
        const errorMessage = 'Buenas, deseo reportar un error en el bot ❗';
        const errorUrl = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(errorMessage)}`;
        await sock.sendMessage(chatId, {
            text: `🐞 Para reportar un error, abre este enlace:\n${errorUrl}`
        }, { quoted: message });
        return true;
    }

    if (buttonId === 'view_full_menu') {
        await helpCommand.handleMenuButton(sock, chatId, buttonId, message);
        return true;
    }

    return false;
}

async function economyCommandLocked(sock, chatId, senderId, message, product) {
    try {
        const enabled = await getEconomyEnabled();
        if (!enabled || isOwnerAccount(senderId)) return false;
        const user = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
        if (!user || !user.registered) {
            await sock.sendMessage(chatId, { text: '⚠️ **NO ESTÁS REGISTRADO**\\n\\nUsa .registrarme para entrar al sistema FelCoins.' }, { quoted: message });
            return true;
        }
        if (Number(user.inventory?.[product]?.quantity || 0) <= 0) {
            const labels = { tiktok: '.tiktok', instagram: '.instagram', brat: '.brat', vv: '.vv' };
            await sock.sendMessage(chatId, { text: `🔒 **${labels[product] || product} BLOQUEADO**\\n\\nDebes comprar el acceso en .tienda para poder usarlo.` }, { quoted: message });
            return true;
        }
        return false;
    } catch (error) { console.error('[FELCOINS GATE]', error); return false; }
}

async function handleMessages(sock, messageUpdate, printLog) {
    let chatId
    let senderId
    let isGroup

    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        chatId = message.key?.remoteJid;
        senderId = message.key?.participant || message.participant || message.key?.remoteJid;
        isGroup = chatId?.endsWith('@g.us');


        // Handle autoread functionality
        await handleAutoread(sock, message);

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        let messageContent = message.message;
        if (messageContent?.ephemeralMessage?.message) {
            messageContent = messageContent.ephemeralMessage.message;
        }
        if (messageContent?.viewOnceMessage?.message) {
            messageContent = messageContent.viewOnceMessage.message;
        }
        if (messageContent?.viewOnceMessageV2?.message) {
            messageContent = messageContent.viewOnceMessageV2.message;
        }
        if (messageContent?.viewOnceMessageV2Extension?.message) {
            messageContent = messageContent.viewOnceMessageV2Extension.message;
        }

        const nativeButtonId = getButtonId(messageContent);

        if (menuButtonIds.has(nativeButtonId)) {
            console.log(`🔘 Botón del menú: ${nativeButtonId} | Usuario: ${senderId} | Chat: ${chatId}`);
            await handleNativeMenuButton(sock, chatId, nativeButtonId, message);
            return;
        }

        const mutedUser = await User.findOne({ userId: senderId })

if (mutedUser?.muted) {

    // opcional: borrar mensaje
    try {
        await sock.sendMessage(chatId, {
            delete: message.key
        })
    } catch {}

    return
}

        //Ban
        message.key.participant || message.key.remoteJid

let userData = await User.findOne({
   userId: senderId
})

if (userData?.banned) {
   return
}

        // Read native-flow responses from the message that contains the click.
        const buttonId = getButtonId(messageContent);

        if (buttonId) {
            const chatId = message.key.remoteJid;

            if (buttonId === 'channel') {
                await sock.sendMessage(chatId, {
                    text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A'
                }, { quoted: message });
                return;
            } else if (buttonId.startsWith('propuesta::')) {
                const handled = await handleProposalButton(sock, chatId, senderId, buttonId);
                if (handled) return;
                return;
            } else if (buttonId.startsWith('versus::')) {
                await handleVersusButton(sock, senderId, buttonId, message);
                return;
            } else if (buttonId === 'support') {
                await sock.sendMessage(chatId, {
                    text: `🔗 *Support*\n\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt`
                }, { quoted: message });
                return;
            } else if (buttonId.startsWith('panel::')) {
                await handlePanelButton(sock, senderId, buttonId, message);
                return;
            } else if (buttonId.startsWith('song::')) {
                const handled = await handleSongButton(sock, chatId, senderId, buttonId, message);
                if (handled) return;
                return;
            } else if (buttonId.startsWith('felcoin::')) {
                const handled = await handleEconomyButton(sock, chatId, senderId, buttonId, message);
                if (handled !== false) return;
                return;
            }
        }

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const senderIsSudo = senderIsOwnerOrSudo || await isSudo(senderId);

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        // Preserve raw message for commands like .tag that need original casing
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // Only log command usage
        if (userMessage.startsWith('.')) {
            const sourceLabel = isGroup ? 'Grupo' : 'Privado';
            const commandLabel = userMessage.split(' ')[0];
            const senderName = message.pushName || senderId.split('@')[0];
            let groupName = sourceLabel;

            if (isGroup) {
                try {
                    const metadata = await sock.groupMetadata(chatId);
                    groupName = metadata?.subject || chatId;
                } catch (error) {
                    groupName = chatId;
                }
            }

            console.log(chalk.blue('────────────────────────────────────────'));
            console.log(chalk.cyan.bold('📝 COMANDO EJECUTADO'));
            console.log(chalk.white(`  • Origen     : ${chalk.yellow(sourceLabel)}`));
            console.log(chalk.white(`  • Remitente  : ${chalk.magenta(senderName)}`));
            console.log(chalk.white(`  • Grupo      : ${chalk.green(groupName)}`));
            console.log(chalk.white(`  • Comando    : ${chalk.green(commandLabel)}`));
            console.log(chalk.white(`  • Texto      : ${userMessage}`));
            console.log(chalk.blue('────────────────────────────────────────'));
        }
        // Read bot mode once; don't early-return so moderation can still run in private mode
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:', error);
            // default isPublic=true on error
        }
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;
        // Check if user is banned (skip ban check for unban command)
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            // Only respond occasionally to avoid spam
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
                    ...channelInfo
                });
            }
            return;
        }

        // ===============================
        if (/^[1-9]$/.test(userMessage) || ['.hit', '.stand'].includes(userMessage)) {
            if (await handleGameInput(sock, chatId, senderId, message, userMessage)) return;
        }

        if (!userMessage.startsWith('.') && await handleGameInput(sock, chatId, senderId, message, userMessage)) return;

// 🔞 XNXX NUMBER REPLY
// ===============================

if (/^\d+$/.test(userMessage)) {

    const handled =
        await xnxxNumberReply(
            sock,
            chatId,
            message,
            userMessage
        )

    if (handled) return

}

        // First check if it's a game move
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        /*  // Basic message response in private chat
          if (!isGroup && (userMessage === 'hi' || userMessage === 'hello' || userMessage === 'bot' || userMessage === 'hlo' || userMessage === 'hey' || userMessage === 'bro')) {
              await sock.sendMessage(chatId, {
                  text: 'Hi, How can I help you?\nYou can use .menu for more info and commands.',
                  ...channelInfo
              });
              return;
          } */

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Check for bad words and antilink FIRST, before ANY other processing
        // Always run moderation in groups, regardless of mode
        if (isGroup) {
            // Antilink checks message text internally, so run it even if userMessage is empty
            await Antilink(message, sock);
        }

        // PM blocker: block non-owner DMs when enabled (do not ban)
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    // Inform user, delay, then block without banning globally
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }


        if (/^\d+$/.test(userMessage)) {

    const handled =
        await xnxxNumberReply(
            sock,
            chatId,
            message,
            userMessage
        )

    if (handled) return

}

        // Then check for command prefix
        if (!userMessage.startsWith('.')) {
            const normalizedPlainText = (rawText || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const isRicoTrigger =
                normalizedPlainText.includes('que rico') ||
                normalizedPlainText.includes('que rica estas');

            if (isRicoTrigger) {
                await viewOnceCommand(sock, chatId, message);
                return;
            }

            // Show typing indicator if autotyping is enabled
            await handleAutotypingForMessage(sock, chatId, userMessage);

            if (isGroup) {

    const spamConfig = getSpamConfig(chatId)

    // 💬 SPAM AUTOMÁTICO
    if (
        spamConfig?.enabled &&
        spamConfig.message &&
        !message.key.fromMe
    ) {
        await sock.sendMessage(chatId, {
            text: spamConfig.message
        })

        return
    }

    await handleTagDetection(sock, chatId, message, senderId)
    await handleMentionDetection(sock, chatId, message)

    if (isPublic || isOwnerOrSudoCheck) {
        await handleChatbotResponse(
            sock,
            chatId,
            message,
            userMessage,
            senderId
        )
    }
}
            return;
        }
        // In private mode, only owner/sudo can run commands
        const isMenuCommand = ['.menu', '.help', '.bot', '.list'].includes(userMessage.split(/\s+/)[0]);
        if (!isPublic && !isOwnerOrSudoCheck && !isMenuCommand) {
            return;
        }

        // List of admin commands
        const adminCommands = ['.mute', '.proteger', '.desproteger', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // List of owner commands
        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.panel', '.setpp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup) {

    const adminStatus = await isAdmin(
        sock,
        chatId,
        senderId
    )

    isSenderAdmin = adminStatus.isSenderAdmin
    isBotAdmin = adminStatus.isBotAdmin
}

        // Check admin status only for admin commands in groups
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.', ...channelInfo }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('.mute') ||
                userMessage === '.unmute' ||
                userMessage.startsWith('.ban') ||
                userMessage.startsWith('.unban') ||
                userMessage.startsWith('.promote') ||
                userMessage.startsWith('.demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: 'Sorry, only group admins can use this command.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
            }
        }

        // Check owner status for owner commands
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
                return;
            }
        }


        const groupData = await Group.findOne({
    groupId: chatId
})

const isCommand = userMessage.startsWith('.')

// 🔴 FELBOT GLOBAL BLOCK
if (isGroup && isCommand) {

    const groupData = await Group.findOne({ groupId: chatId })

    // si está apagado y NO es el comando de control
    if (groupData && groupData.felbot?.enabled === false && !userMessage.startsWith('.felbot')) {
        return
    }
}

if (
    isGroup &&
    groupData?.adminMode &&
    !isSenderAdmin &&
    !message.key.fromMe &&
    !isEconomyCommand(userMessage)
) {
    const senderUser = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
    if (!hasRoyalProtection(senderUser)) {
        return;
    }
}

// ===============================
// 🔞 XNXX NUMBER REPLY
// ===============================

if (/^\d+$/.test(userMessage)) {

    const handled =
        await xnxxNumberReply(
            sock,
            chatId,
            message,
            userMessage
        )

    if (handled) return

}

const command = rawText.split(' ')[0].toLowerCase()
        // Command handlers - Execute commands immediately without waiting for typing indicator
        // We'll show typing indicator after command execution if needed
        let commandExecuted = false;

        switch (true) {
            case userMessage === '.simage': {
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMessage?.stickerMessage) {
                    await simageCommand(sock, quotedMessage, chatId);
                } else {
                    await sock.sendMessage(chatId, { text: 'Please reply to a sticker with the .simage command to convert it.', ...channelInfo }, { quoted: message });
                }
                commandExecuted = true;
                break;
            }
            case userMessage.startsWith('.kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
                break;
           
        case userMessage.startsWith('.mute'):

    await muteCommand(
        sock,
        chatId,
        senderId,
        message
    )

    break;

    case userMessage.startsWith('.proteger'):
    await protegerCommand(sock, chatId, senderId, message)
    break;

    case userMessage.startsWith('.desproteger'):
    await desprotegerCommand(sock, chatId, senderId, message)
    break;

    case userMessage.startsWith('.propuesta'):
    await propuestaCommand(
        sock,
        chatId,
        senderId,
        message
    )
    break;

    case userMessage === '.divorcio' || userMessage === '.credoe' || userMessage.startsWith('.divorcio') || userMessage.startsWith('.credoe'):
    await divorcioCommand(
        sock,
        chatId,
        senderId,
        message
    )
    break;

    case userMessage === '.si':
    if (await aceptarPropuesta(
        sock,
        chatId,
        senderId
    )) break
    break;

    case userMessage === '.no':
    if (await rechazarPropuesta(
        sock,
        chatId,
        senderId
    )) break
    break;

        case userMessage.startsWith('.unmute'):
    await unmuteCommand(sock, chatId, senderId, message)
    break;

            case userMessage.startsWith('.ban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .ban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.unban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .unban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list':
                await helpCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;
            case userMessage === '.economia':
                await showEconomyMenu(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.modoeconomia'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: '❌ Solo el OWNER puede activar la economía.' }, { quoted: message });
                    break;
                }
                const economyAction = userMessage.split(' ')[1]?.toLowerCase();
                if (economyAction === 'on') await toggleEconomy(sock, chatId, senderId, message, true);
                else if (economyAction === 'off') await toggleEconomy(sock, chatId, senderId, message, false);
                else await sock.sendMessage(chatId, { text: 'Uso: .modoeconomia on|off' }, { quoted: message });
                commandExecuted = true;
                break;
            case userMessage === '.registrarme':
                await registerMe(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.reiniciar economia' || userMessage === '.reiniciarEconomia' || userMessage.startsWith('.reiniciar') && userMessage.includes('economia'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: '❌ Solo el OWNER puede reiniciar la economía.' }, { quoted: message });
                    break;
                }
                await resetEconomy(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.saldo':
                await showSaldo(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.perfil':
                await showPerfil(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.quitar'):
                await removeCoinsFromUser(sock, chatId, senderId, message, rawText);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.transferir'):
                await processTransfer(sock, chatId, senderId, message, rawText);
                commandExecuted = true;
                break;
            case userMessage === '.diaria':
                await dailyReward(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.trabajar':
                await workCommand(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.minar':
                await mineCommand(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.caja':
                await mysteryBox(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.mejorarempresa' || userMessage.startsWith('.mejorarempresa '):
                const upgradeTarget = rawText.split(/\s+/).slice(1).join(' ').trim();
                const currentEconomyUser = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
                await upgradeCompany(sock, chatId, senderId, message, upgradeTarget || currentEconomyUser?.empresa);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.robar'):
                const robTarget = rawText.split(/\s+/).slice(1).join(' ');
                const robMention = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || robTarget;
                await handleRobbery(sock, chatId, senderId, message, robMention);
                commandExecuted = true;
                break;
            case userMessage === '.protegerse' || userMessage.startsWith('.protegerse '):
                await protectMe(sock, chatId, senderId, message, userMessage.split(/\s+/)[1] || null);
                commandExecuted = true;
                break;
            case userMessage === '.tienda':
                await openShop(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.comprar'):
                {
                    const product = rawText.split(/\s+/).slice(1).join(' ');
                    await buyProduct(sock, chatId, senderId, message, product || 'glove');
                }
                commandExecuted = true;
                break;
            case userMessage === '.empresas':
                await viewCompanies(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.ruleta'):
                {
                    const amount = parseAmount(rawText.split(/\s+/).slice(1).join(' '));
                    await rouletteGame(sock, chatId, senderId, message, amount || 100);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.slots'):
                {
                    const amount = parseAmount(rawText.split(/\s+/).slice(1).join(' '));
                    await slotsGame(sock, chatId, senderId, message, amount || 100);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.blackjack'):
                {
                    const amount = parseAmount(rawText.split(/\s+/).slice(1).join(' '));
                    await blackjackInitial(sock, chatId, senderId, message, amount || 100);
                }
                commandExecuted = true;
                break;
            case userMessage === '.pedir':
                await blackjackHit(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.plantarse':
                await blackjackStand(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.crash'):
                {
                    const amount = parseAmount(rawText.split(/\s+/).slice(1).join(' '));
                    await crashGame(sock, chatId, senderId, message, amount || 100);
                }
                commandExecuted = true;
                break;
            case userMessage === '.retirar':
                await withdrawCrash(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                {
                    const enabled = await getEconomyEnabled();
                    if (enabled) {
                        const currentUser = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
                        if (!currentUser || !currentUser.registered) {
                            await sock.sendMessage(chatId, { text: '⚠️ **NO ESTÁS REGISTRADO**\n\nUsa .registrarme para entrar al sistema FelCoins.' }, { quoted: message });
                            break;
                        }
                        const stickerUnlocked = isOwnerAccount(senderId) || Number(currentUser.inventory?.sticker?.quantity || 0) > 0;
                        if (!stickerUnlocked) {
                            await sock.sendMessage(chatId, { text: '🔒 **.STICKER BLOQUEADO**\n\nDebes comprar el acceso a .sticker en .tienda para poder usarlo.' }, { quoted: message });
                            break;
                        }
                    }
                    await stickerCommand(sock, chatId, message);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.warnings'):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock, chatId, mentionedJidListWarnings);
                break;
                case userMessage.startsWith('.cum'):
    await cumCommand(
        sock,
        chatId,
        message
    )
    commandExecuted = true
    break;

   case userMessage.startsWith('.masturbarsef'):

    await masturbarseCommand(
        sock,
        chatId,
        message,
        'f'
    )

    commandExecuted = true
    break;

case userMessage.startsWith('.masturbarsem'):

    await masturbarseCommand(
        sock,
        chatId,
        message,
        'm'
    )

    commandExecuted = true
    break;

case userMessage === '.masturbarse':

    await masturbarseCommand(
        sock,
        chatId,
        message
    )//a

    commandExecuted = true
    break;
    
            case userMessage.startsWith('.warn'):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
                break;
                case userMessage.startsWith('.modoadmin'):
{
    if (!isGroup) {
        await sock.sendMessage(chatId, {
            text: '❌ Este comando funciona solo dentro de un grupo. Por favor, úsalo allí.'
        }, { quoted: message })
        return
    }

    if (!isSenderAdmin && !message.key.fromMe) {
        await sock.sendMessage(chatId, {
            text: '🚫 Solo administradores pueden usar este comando.'
        }, { quoted: message })
        return
    }

    const args = userMessage.split(' ').slice(1)

    await modoAdminCommand(
        sock,
        chatId,
        message,
        args
    )
}
break;
            case userMessage.startsWith('.tts'):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, text, message);
                break;
            case userMessage.startsWith('.2vs2') || userMessage.startsWith('.2v2') || userMessage.startsWith('.4vs4') || userMessage.startsWith('.4v4') || userMessage.startsWith('.6vs6') || userMessage.startsWith('.6v6') || userMessage.startsWith('.int2') || userMessage.startsWith('.int4') || userMessage.startsWith('.int6'):
                await versusCommand(sock, chatId, senderId, message);
                break;
                case userMessage.startsWith('.up'):
    await upVersusCommand(sock, chatId, message);
    break;
            case userMessage.startsWith('.top'):
                await topCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.dltall'):
                await deleteAllSchedulesCommand(sock, chatId, message, userMessage, senderId);
                break;
            case userMessage.startsWith('.dlt '):
                await deleteScheduleCommand(sock, chatId, message, userMessage, senderId);
                break;
            case userMessage.startsWith('.horario'):
                await scheduleCommand(sock, chatId, message, rawText, senderId);
                break;
            case userMessage.startsWith('.delete') || userMessage.startsWith('.del'):
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case userMessage.startsWith('.attp'):
                await attpCommand(sock, chatId, message);
                break;

            case userMessage === '.prueba': {
                const imagePath = path.join(__dirname, 'assets', 'imagenes', 'admin', 'admin.png');
                const thumbnail = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;

                await sock.sendMessage(chatId, { text: '🔧 Método usado: ButtonV2 (botones interactivos)' }, { quoted: message });

                const pruebaButtons = new ButtonV2(sock)
                    .setThumbnail(thumbnail)
                    .setBody('🎉 Prueba de botones activos')
                    .setFooter('FelbotC - comando .prueba | Builder: ButtonV2')
                    .addButton('Opción 1', 'prueba_1')
                    .addButton('Opción 2', 'prueba_2')
                    .addButton('Ayuda', 'prueba_help');

                await pruebaButtons.send(chatId, { quoted: message });

                await sock.sendMessage(chatId, { text: '🔧 Método usado: Carousel (tarjeta de carrusel)' }, { quoted: message });

                const pruebaCarousel = new Carousel(sock).addCard({
                    header: { hasMediaAttachment: true },
                    body: { text: 'Builder: Carousel' },
                    footer: { text: 'Carousel / card test' },
                    title: 'Card 1',
                    description: 'Usando Carousel para mostrar tarjetas',
                    media: {
                        image: { url: 'https://i.imgur.com/MZ4Ca1o.jpeg' },
                    },
                });
                await pruebaCarousel.send(chatId, { quoted: message });

                await sock.sendMessage(chatId, { text: '🔧 Método usado: AIRich (mensaje enriquecido AI)' }, { quoted: message });

                const richMessage = new AIRich(sock)
                    .setTitle('Prueba Completa')
                    .setBody('Esto prueba botones, carrusel y mensaje enriquecido')
                    .addText('Hola! Esto es un mensaje enriquecido con enlace [Felbot](https://github.com) y latex [x^2](<https://latex.codecogs.com/png.latex?x%5E2>)')
                    .addSuggest(['Prueba 1', 'Prueba 2', 'Ayuda'])
                    .addSource([['https://i.imgur.com/MZ4Ca1o.jpeg', 'https://github.com', 'Felbot en GitHub']]);

                await sock.sendMessage(chatId, await richMessage.build({ quoted: message }));

                commandExecuted = true;
                break;
            }

            case userMessage === '.settings':
                await settingsCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mode'):
                // Check if sender is the owner
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!', ...channelInfo }, { quoted: message });
                    return;
                }
                // Read current data first
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    console.error('Error reading access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to read bot mode status', ...channelInfo });
                    return;
                }

                const action = userMessage.split(' ')[1]?.toLowerCase();
                // If no argument provided, show current status
                if (!action) {
                    const currentMode = data.isPublic ? 'public' : 'private';
                    await sock.sendMessage(chatId, {
                        text: `Current bot mode: *${currentMode}*\n\nUsage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only`,
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }

                if (action !== 'public' && action !== 'private') {
                    await sock.sendMessage(chatId, {
                        text: 'Usage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }

                try {
                    // Update access mode
                    data.isPublic = action === 'public';

                    // Save updated data
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));

                    await sock.sendMessage(chatId, { text: `Bot is now in *${action}* mode`, ...channelInfo });
                } catch (error) {
                    console.error('Error updating access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to update bot access mode', ...channelInfo });
                }
                break;
            case userMessage.startsWith('.anticall'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Only owner/sudo can use anticall.' }, { quoted: message });
                    break;
                }
              case userMessage.startsWith('.felbot'):
{
    if (!isGroup) return

    if (!senderIsOwnerOrSudo && !message.key.fromMe) {
        await sock.sendMessage(chatId, {
            text: '🚫 Solo el owner puede ejecutar este comando.'
        }, { quoted: message })
        break
    }

    let groupData = await Group.findOne({ groupId: chatId })

    if (!groupData) {
        groupData = await Group.create({ groupId: chatId })
    }

    const action = userMessage.split(' ')[1]

    const imagePath = path.join(
        __dirname,
        'assets',
        'imagenes',
        'admin',
        'admin.png'
    )

    const imageBuffer = fs.readFileSync(imagePath)

    // =========================
    // 📌 MENÚ
    // =========================
    if (!action) {
        await sock.sendMessage(chatId, {
            text:
`╭─〔 👋  𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕─╮

📌 ESTADO: ${groupData.felbot?.enabled ? 'ON' : 'OFF'}

✅ .felbot on
> Activar felbot en el grupo

❌ .felbot off
> Desactivar felbot en el grupo

╰────────────────╯`
        }, { quoted: message })

        break
    }

    // =========================
    // 📌 ON
    // =========================
    if (action === 'on') {

        groupData.felbot.enabled = true
        await groupData.save()

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption:
`> 𝕱𝖊𝖑𝖇𝖔𝖙 夜 ᴀᴄᴛɪᴠᴀᴅᴏ ᴇɴ ᴇꜱᴛᴇ ɢʀᴜᴘᴏ
> ESTADO: ON`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝗅 ✧'
                }
            }
        }, { quoted: message })

        break
    }

    // =========================
    // 📌 OFF
    // =========================
    if (action === 'off') {

        groupData.felbot.enabled = false
        await groupData.save()

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption:
`> 𝕱𝖊𝖑𝖇𝖔𝖙 夜 ᴅᴇꜱᴀᴄᴛɪᴠᴀᴅᴏ ᴇɴ ᴇꜱᴛᴇ ɢʀᴜᴘᴏ
> ESTADO: OFF`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝗅 ✧'
                }
            }
        }, { quoted: message })

        break
    }

    // =========================
    // ❌ ERROR
    // =========================
    await sock.sendMessage(chatId, {
        text: '❌ Usa: .felbot on / .felbot off'
    }, { quoted: message })
}
break
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await anticallCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.pmblocker'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await pmblockerCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                break;
                case userMessage.startsWith('.besar'):
    await besarCommand(
        sock,
        chatId,
        message
    )
    break;
            case userMessage.startsWith('.todos'):
                await tagAllCommand(sock, chatId, senderId, message);
                break;
            case userMessage === '.tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.hidetag'):
                {
                    const messageText = rawText.slice(8).trim();
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                }
                break;
            case command === '.n':
                const messageText = rawText.substring(2).trim();// use rawText here, not userMessage
                const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                await tagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                break;
            case userMessage.startsWith('.antilink'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'This command can only be used in groups.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Please make the bot an admin first.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith('.antitag'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'This command can only be used in groups.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Please make the bot an admin first.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage === '.meme':
                await memeCommand(sock, chatId, message);
                break;                  
            case userMessage.startsWith('.ppt'):
            case userMessage.startsWith('.dados'):
            case userMessage.startsWith('.moneda'):
            case userMessage.startsWith('.ruleta'):
            case userMessage.startsWith('.8ball'):
            case userMessage.startsWith('.adivina'):
            case userMessage === '.quiz':
            case userMessage.startsWith('.duelo'):
            case userMessage === '.blackjack':
            case userMessage === '.slots':
            case userMessage === '.memoria':
            case userMessage === '.rank':
            case userMessage.startsWith('.perfil'):
                await handleGameCommand(sock, chatId, senderId, message, userMessage.split(/\s+/)[0].slice(1), rawText.split(/\s+/).slice(1).join(' '));
                break;
            case userMessage.startsWith('.ttt') || userMessage.startsWith('.tictactoe'):
                const tttText = userMessage.split(' ').slice(1).join(' ');
                await tictactoeCommand(sock, chatId, senderId, tttText);
                break;
            case userMessage.startsWith('.move'):
                const position = parseInt(userMessage.split(' ')[1]);
                if (isNaN(position)) {
                    await sock.sendMessage(chatId, { text: 'Please provide a valid position number for Tic-Tac-Toe move.', ...channelInfo }, { quoted: message });
                } else {
                    tictactoeMove(sock, chatId, senderId, position);
                }
                break;
            case userMessage === '.topmembers':
                topMembers(sock, chatId, isGroup);
                break;
            case userMessage.startsWith('.hangman'):
                startHangman(sock, chatId);
                break;
            case userMessage.startsWith('.guess'):
                const guessedLetter = userMessage.split(' ')[1];
                if (guessedLetter) {
                    guessLetter(sock, chatId, guessedLetter);
                } else {
                    sock.sendMessage(chatId, { text: 'Please guess a letter using .guess <letter>', ...channelInfo }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.trivia'):
                startTrivia(sock, chatId);
                break;
            case userMessage.startsWith('.answer'):
                const answer = userMessage.split(' ').slice(1).join(' ');
                if (answer) {
                    answerTrivia(sock, chatId, answer);
                } else {
                    sock.sendMessage(chatId, { text: 'Please provide an answer using .answer <answer>', ...channelInfo }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.compliment'):
                await complimentCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.insult'):
                await insultCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.8ball'):
                const question = userMessage.split(' ').slice(1).join(' ');
                await eightBallCommand(sock, chatId, question);
                break;
            case userMessage.startsWith('.simp'):
                const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await simpCommand(sock, chatId, quotedMsg, mentionedJid, senderId);