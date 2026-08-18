async function infoCommand(sock, chatId, message) {
    const infoText = `                 夜
    ── 𝐅𝐄𝐋𝐁𝐎𝐓 ──

              𝟎𝟎𝟏
        𝐅𝐱𝐥𝐢𝐩𝐞 夜
          𝑪𝒓𝒆𝒂𝒅𝒐𝒓

              𝟎𝟎𝟐
       *Yamileth* 🪷
        𝑪𝒐-𝑪𝒓𝒆𝒂𝒅𝒐𝒓𝒂


      ⟡ ───── ⟡
             夜
        𝐄𝐧𝐝 𝐨𝐟 𝐈𝐧𝐟𝐨`;

    await sock.sendMessage(chatId, { text: infoText }, { quoted: message });
}

module.exports = infoCommand;