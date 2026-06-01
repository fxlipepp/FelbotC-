const { isJidGroup } = require('@whiskeysockets/baileys');
const { getAntilink, incrementWarningCount, resetWarningCount, isSudo } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');
const config = require('../config');

const WARN_COUNT = config.WARN_COUNT || 3;

/**
 * Checks if a string contains a URL.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string contains a URL, otherwise false.
 */
function containsURL(str) {
	const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
	return urlRegex.test(str);
}

/**
 * Handles the Antilink functionality for group chats.
 *
 * @param {object} msg - The message object to process.
 * @param {object} sock - The socket object to use for sending messages.
 */
async function Antilink(msg, sock) {
	const jid = msg.key.remoteJid;
	if (!isJidGroup(jid)) return;

	const SenderMessage = msg.message?.conversation || 
						 msg.message?.extendedTextMessage?.text || '';
	if (!SenderMessage || typeof SenderMessage !== 'string') return;

	const sender = msg.key.participant;
	if (!sender) return;
	
	// Skip if sender is group admin or sudo
	try {
		const { isSenderAdmin } = await isAdmin(sock, jid, sender);
		if (isSenderAdmin) return;
	} catch (_) {}
	const senderIsSudo = await isSudo(sender);
	if (senderIsSudo) return;

	if (!containsURL(SenderMessage.trim())) return;
	
	const antilinkConfig = await getAntilink(jid, 'on');
	if (!antilinkConfig) return;

	const action = antilinkConfig.action;
	
	try {
		// Delete message first
		await sock.sendMessage(jid, { delete: msg.key });

		switch (action) {
			case 'delete':
				await sock.sendMessage(jid, {
					text: `╔═ AVISO ═╗\n║ @${sender.split('@')[0]}\n║ No se permiten enlaces aquí.\n╚══════════╝`,
					mentions: [sender]
				});
				break;

			case 'kick':
				// En modo 'kick' damos avisos y al llegar a WARN_COUNT expulsamos.
				{
					const warningCount = await incrementWarningCount(jid, sender);
					if (warningCount >= WARN_COUNT) {
						await sock.groupParticipantsUpdate(jid, [sender], 'remove');
						await resetWarningCount(jid, sender);
						await sock.sendMessage(jid, {
							text: `⚠️ \`\`\`@${sender.split('@')[0]} expulsado tras ${WARN_COUNT}/${WARN_COUNT} avisos por enviar enlaces.\`\`\``,
							mentions: [sender]
						});
					} else {
						await sock.sendMessage(jid, {
							text: `⚠️ \`\`\`@${sender.split('@')[0]} advertencia ${warningCount}/${WARN_COUNT} por enviar enlaces.\`\`\``,
							mentions: [sender]
						});
					}
				}
				break;

			case 'warn':
				{
					const warningCount = await incrementWarningCount(jid, sender);
					if (warningCount >= WARN_COUNT) {
						await sock.groupParticipantsUpdate(jid, [sender], 'remove');
						await resetWarningCount(jid, sender);
						await sock.sendMessage(jid, {
							text: `⚠️ \`\`\`@${sender.split('@')[0]} expulsado tras ${WARN_COUNT}/${WARN_COUNT} avisos por enviar enlaces.\`\`\``,
							mentions: [sender]
						});
					} else {
						await sock.sendMessage(jid, {
							text: `⚠️ \`\`\`@${sender.split('@')[0]} advertencia ${warningCount}/${WARN_COUNT} por enviar enlaces.\`\`\``,
							mentions: [sender]
						});
					}
				}
				break;
		}
	} catch (error) {
		console.error('Error in Antilink:', error);
	}
}

module.exports = { Antilink };