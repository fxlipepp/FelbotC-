const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

let messageCountsCache = null;
let saveTimer = null;
let savePending = false;

function loadMessageCounts() {
    if (messageCountsCache) return messageCountsCache;

    try {
        if (!fs.existsSync(dataFilePath)) {
            messageCountsCache = {};
            return messageCountsCache;
        }

        const raw = fs.readFileSync(dataFilePath, 'utf8');
        messageCountsCache = JSON.parse(raw);
        return messageCountsCache;
    } catch {
        messageCountsCache = {};
        return messageCountsCache;
    }
}

function flushMessageCounts() {
    if (!messageCountsCache || !savePending) return;

    try {
        fs.writeFileSync(
            dataFilePath,
            JSON.stringify(messageCountsCache, null, 2)
        );
        savePending = false;
    } catch (error) {
        console.error('Error saving message counts:', error);
    }
}

function scheduleSave() {
    savePending = true;

    if (saveTimer) return;

    // Batch frequent message-count updates instead of blocking the event loop
    // with a disk write for every single WhatsApp message.
    saveTimer = setTimeout(() => {
        saveTimer = null;
        flushMessageCounts();
    }, 5000);
}

function saveMessageCounts(messageCounts) {
    messageCountsCache = messageCounts;
    scheduleSave();
}

// Flush pending counters before process shutdown.
process.once('SIGINT', flushMessageCounts);
process.once('SIGTERM', flushMessageCounts);

function incrementMessageCount(groupId, userId) {
    const messageCounts = loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;
    saveMessageCounts(messageCounts);
}

function topMembers(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: 'This command is only available in group chats.' });
        return;
    }

    const messageCounts = loadMessageCounts();
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (sortedMembers.length === 0) {
        sock.sendMessage(chatId, { text: 'No message activity recorded yet.' });
        return;
    }

    let message = '🏆 Top Members Based on Message Count:\n\n';
    sortedMembers.forEach(([userId, count], index) => {
        message += `${index + 1}. @${userId.split('@')[0]} - ${count} messages\n`;
    });

    sock.sendMessage(chatId, { text: message, mentions: sortedMembers.map(([userId]) => userId) });
}

module.exports = { incrementMessageCount, topMembers };
