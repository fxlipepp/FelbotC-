const path = require('path');

const settings = {
  packname: '𝕱𝖊𝖑𝖇𝖔𝖙 夜',
  author: '‎',
  botName: "𝕱𝖊𝖑𝖇𝖔𝖙 夜",

  ownerNumber: '573117354305',
  OWNER_NUMBER: '573117354305', // 👈 Cambia este número para recibir las imágenes en tu WhatsApp personal
  ownerLid: '274517599482100@lid', // 👈 ESTE ES EL IMPORTANTE

  // Audio general para todas las bienvenidas de Felbot.
  // El archivo actual del bot está en: /workspaces/FelbotC-/assets/welcome.mp3
  // También busca una copia en /assets/audio/welcome.mp3 si la mueves después.
  welcomeAudioPath: process.env.WELCOME_AUDIO_PATH || path.join(__dirname, 'assets', 'welcome.mp3'),
  goodbyeAudioPath: process.env.GOODBYE_AUDIO_PATH || path.join(__dirname, 'assets', 'goodbye.mp3'),
  goodbyeImagePath: process.env.GOODBYE_IMAGE_PATH || path.join(__dirname, 'assets', 'imagenes', 'welcome', 'welcome.jpg'),

  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  maxStoreMessages: 20,
  storeWriteInterval: 10000,
  description: "Bot",
  version: "3.0.7",
};

module.exports = settings;