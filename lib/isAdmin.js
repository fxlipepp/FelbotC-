// isAdmin.js
const settings = require('../settings');

function normalizeJid(value) {
    if (!value) return '';
    const raw = String(value).trim().toLowerCase();
    if (!raw) return '';

    const at = raw.lastIndexOf('@');
    if (at === -1) {
        return raw.replace(/:\d+$/, '').replace(/[^0-9]/g, '');
    }

    const user = raw.slice(0, at).replace(/:\d+$/, '');
    const server = raw.slice(at + 1);
    return user && server ? `${user}@${server}` : '';
}

function jidMatches(left, right) {
    const a = normalizeJid(left);
    const b = normalizeJid(right);
    if (!a || !b) return false;
    if (a === b) return true;

    const aHasDomain = a.includes('@');
    const bHasDomain = b.includes('@');
    if (!aHasDomain || !bHasDomain) {
        return a.split('@')[0] === b.split('@')[0];
    }

    // No comparar un número telefónico con un LID solo porque ambos sean numéricos.
    return false;
}

function participantIds(participant) {
    return [
        participant?.id,
        participant?.jid,
        participant?.lid,
        participant?.phoneNumber
    ].filter(Boolean);
}

function isAdminRole(participant) {
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

async function isAdmin(sock, chatId, senderId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];

        // Baileys puede entregar el remitente como PN o LID; conservar todos los alias.
        const senderIds = (Array.isArray(senderId) ? senderId : [senderId]).filter(Boolean);

        const ownerNumbers = [settings.ownerNumber]
            .filter(Boolean)
            .map(number => String(number).replace(/[^0-9]/g, ''))
            .filter(Boolean);

        const senderIsOwner = senderIds.some(id => {
            const normalized = normalizeJid(id);
            const domain = normalized.includes('@') ? normalized.split('@').pop() : '';
            // El número del owner solo se compara con identificadores telefónicos, nunca con LID.
            if (domain && domain !== 's.whatsapp.net' && domain !== 'c.us') return false;
            const digits = normalized.split('@')[0].replace(/[^0-9]/g, '');
            return digits && ownerNumbers.includes(digits);
        });

        const botIds = [
            sock.user?.id,
            sock.user?.lid,
            sock.user?.phoneNumber
        ].filter(Boolean);

        const isBotAdmin = participants.some(participant =>
            isAdminRole(participant) &&
            participantIds(participant).some(participantId =>
                botIds.some(botId => jidMatches(botId, participantId))
            )
        );

        const isSenderAdmin = senderIsOwner || participants.some(participant =>
            isAdminRole(participant) &&
            participantIds(participant).some(participantId =>
                senderIds.some(sender => jidMatches(sender, participantId))
            )
        );

        return { isSenderAdmin, isBotAdmin };
    } catch (err) {
        console.error('❌ Error in isAdmin:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;
