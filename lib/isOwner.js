const settings = require('../settings');
const { isSudo } = require('./index');

function normalize(id = '') {
    return id.toString().split(':')[0].split('@')[0].trim();
}

async function isOwnerOrSudo(senderId, sock = null) {

    const ownerNumber = normalize(settings.ownerNumber);
    const ownerLid = normalize(settings.ownerLid);
    const privilegedNumbers = (settings.privilegedNumbers || []).map(normalize);
    const senderClean = normalize(senderId);

    // 👑 owner por número
    if (senderClean === ownerNumber || privilegedNumbers.includes(senderClean)) return true;

    // 👑 owner por LID
    if (senderId === settings.ownerLid || senderClean === ownerLid) return true;

    // 🤖 match bot LID (opcional)
    if (sock?.user?.lid) {
        const botLid = normalize(sock.user.lid);
        if (senderClean === botLid) return true;
    }

    // 🛠 sudo fallback
    try {
        return await isSudo(senderId);
    } catch {
        return false;
    }
}

module.exports = isOwnerOrSudo;