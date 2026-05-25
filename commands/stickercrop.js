const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const webp = require('node-webpmux');
const crypto = require('crypto');

async function stickercropCommand(sock, chatId, message) {

    // 📌 Mensaje que se citará
    const messageToQuote = message;

    // 📌 Mensaje que contiene el multimedia
    let targetMessage = message;

    // 📌 Detectar mensaje respondido
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {

        const quotedInfo =
            message.message.extendedTextMessage.contextInfo;

        targetMessage = {

            key: {
                remoteJid: chatId,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },

            message: quotedInfo.quotedMessage
        };
    }

    // 📌 Detectar multimedia
    const mediaMessage =
        targetMessage.message?.imageMessage ||
        targetMessage.message?.videoMessage ||
        targetMessage.message?.documentMessage ||
        targetMessage.message?.stickerMessage;

    // ❌ Sin multimedia
    if (!mediaMessage) {

        await sock.sendMessage(chatId, {

            text:
'❌ Responde a una imagen/video/sticker usando *.crop* o envía el archivo con *.crop* como descripción.'

        }, { quoted: messageToQuote });

        return;
    }

    try {

        // 📥 Descargar multimedia
        const mediaBuffer = await downloadMediaMessage(

            targetMessage,
            'buffer',
            {},

            {
                logger: undefined,
                reuploadRequest: sock.updateMediaMessage
            }
        );

        // ❌ Error descargando
        if (!mediaBuffer) {

            await sock.sendMessage(chatId, {

                text:
'❌ No pude descargar el archivo.'

            });

            return;
        }

        // 📂 Crear carpeta temporal
        const tmpDir =
            path.join(process.cwd(), 'tmp');

        if (!fs.existsSync(tmpDir)) {

            fs.mkdirSync(tmpDir, {
                recursive: true
            });
        }

        // 📌 Archivos temporales
        const tempInput =
            path.join(tmpDir, `temp_${Date.now()}`);

        const tempOutput =
            path.join(tmpDir, `crop_${Date.now()}.webp`);

        // 💾 Guardar multimedia
        fs.writeFileSync(tempInput, mediaBuffer);

        // 🎞️ Detectar si es video/gif
        const isAnimated =

            mediaMessage.mimetype?.includes('gif') ||

            mediaMessage.mimetype?.includes('video') ||

            mediaMessage.seconds > 0;

        // 📏 Detectar tamaño
        const fileSizeKB =
            mediaBuffer.length / 1024;

        const isLargeFile =
            fileSizeKB > 5000;

        // ⚙️ Comando ffmpeg
        let ffmpegCommand;

        if (isAnimated) {

            if (isLargeFile) {

                // 📉 Video pesado
                ffmpegCommand =
`ffmpeg -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;

            } else {

                // 🎞️ Video normal
                ffmpegCommand =
`ffmpeg -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
            }

        } else {

            // 🖼️ Imagen normal
            ffmpegCommand =
`ffmpeg -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
        }

        // 🚀 Ejecutar ffmpeg
        await new Promise((resolve, reject) => {

            exec(ffmpegCommand,

                (error, stdout, stderr) => {

                    if (error) {

                        console.error(
                            'FFmpeg error:',
                            error
                        );

                        console.error(
                            'FFmpeg stderr:',
                            stderr
                        );

                        reject(error);

                    } else {

                        console.log(
                            'FFmpeg stdout:',
                            stdout
                        );

                        resolve();
                    }
                });
        });

        // ❌ Verificar salida
        if (!fs.existsSync(tempOutput)) {

            throw new Error(
                'FFmpeg no creó el archivo'
            );
        }

        // ❌ Archivo vacío
        const outputStats =
            fs.statSync(tempOutput);

        if (outputStats.size === 0) {

            throw new Error(
                'FFmpeg creó un archivo vacío'
            );
        }

        // 📥 Leer sticker
        let webpBuffer =
            fs.readFileSync(tempOutput);

        // 📏 Tamaño final
        const finalSizeKB =
            webpBuffer.length / 1024;

        console.log(
`Tamaño final: ${Math.round(finalSizeKB)} KB`
        );

        // ⚠️ Sticker pesado
        if (finalSizeKB > 1000) {

            console.log(
`⚠️ Sticker pesado (${Math.round(finalSizeKB)} KB)`
            );
        }

        // 🏷️ Agregar metadata
        const img = new webp.Image();

        await img.load(webpBuffer);

        // 📌 Datos sticker
        const json = {

            'sticker-pack-id':
                crypto.randomBytes(32).toString('hex'),

            'sticker-pack-name':
                settings.packname || 'Felbot 夜',

            'emojis': ['✂️']
        };

        // 📌 EXIF
        const exifAttr = Buffer.from([

            0x49,0x49,0x2A,0x00,
            0x08,0x00,0x00,0x00,
            0x01,0x00,0x41,0x57,
            0x07,0x00,0x00,0x00,
            0x00,0x00,0x16,0x00,
            0x00,0x00
        ]);

        const jsonBuffer =
            Buffer.from(
                JSON.stringify(json),
                'utf8'
            );

        const exif =
            Buffer.concat([
                exifAttr,
                jsonBuffer
            ]);

        exif.writeUIntLE(
            jsonBuffer.length,
            14,
            4
        );

        // 📌 Agregar metadata
        img.exif = exif;

        // 📦 Buffer final
        const finalBuffer =
            await img.save(null);

        // 📤 Enviar sticker
        await sock.sendMessage(chatId, {

            sticker: finalBuffer

        }, { quoted: messageToQuote });

        // 🧹 Limpiar archivos
        try {

            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);

        } catch (err) {

            console.error(
                'Error borrando temporales:',
                err
            );
        }

    } catch (error) {

        console.error(
            'Error en stickercrop:',
            error
        );

        await sock.sendMessage(chatId, {

            text:
'❌ No pude crear el sticker recortado.'

        });
    }
}

module.exports = stickercropCommand;