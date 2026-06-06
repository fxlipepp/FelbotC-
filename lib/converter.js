/**
 * Knight Bot - Optimized Converter
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const crypto = require('crypto')

const TEMP_DIR = path.join(__dirname, '../temp')

if (!fs.existsSync(TEMP_DIR)) {
   fs.mkdirSync(TEMP_DIR, { recursive: true })
}

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {

   return new Promise(async (resolve, reject) => {

      const id = crypto.randomBytes(8).toString('hex')

      const input = path.join(
         TEMP_DIR,
         `${id}.${ext}`
      )

      const output = path.join(
         TEMP_DIR,
         `${id}.${ext2}`
      )

      try {

         await fs.promises.writeFile(
            input,
            buffer
         )

         const ff = spawn(
            'ffmpeg',
            [
               '-y',
               '-loglevel',
               'error',
               '-i',
               input,
               ...args,
               output
            ]
         )

         ff.on('error', async err => {

            try {
               await fs.promises.unlink(input)
            } catch {}

            reject(err)
         })

         ff.on('close', async code => {

            try {

               await fs.promises.unlink(input)

               if (code !== 0) {

                  try {
                     await fs.promises.unlink(output)
                  } catch {}

                  return reject(
                     new Error(
                        `FFmpeg exited with code ${code}`
                     )
                  )
               }

               const result =
                  await fs.promises.readFile(output)

               await fs.promises.unlink(output)

               resolve(result)

            } catch (err) {

               reject(err)
            }
         })

      } catch (err) {

         try {
            await fs.promises.unlink(input)
         } catch {}

         try {
            await fs.promises.unlink(output)
         } catch {}

         reject(err)
      }
   })
}

/**
 * Audio -> MP3
 */

function toAudio(buffer, ext) {

   return ffmpeg(
      buffer,
      [
         '-vn',
         '-ac',
         '2',

         '-b:a',
         '96k',

         '-ar',
         '22050',

         '-preset',
         'ultrafast',

         '-f',
         'mp3'
      ],
      ext,
      'mp3'
   )
}

/**
 * Audio -> WhatsApp PTT
 */

function toPTT(buffer, ext) {

   return ffmpeg(
      buffer,
      [
         '-vn',

         '-c:a',
         'libopus',

         '-b:a',
         '64k',

         '-vbr',
         'on',

         '-compression_level',
         '10',

         '-application',
         'voip'
      ],
      ext,
      'opus'
   )
}

/**
 * Video -> MP4
 */

function toVideo(buffer, ext) {

   return ffmpeg(
      buffer,
      [
         '-c:v',
         'libx264',

         '-preset',
         'ultrafast',

         '-crf',
         '35',

         '-c:a',
         'aac',

         '-b:a',
         '96k',

         '-ar',
         '22050'
      ],
      ext,
      'mp4'
   )
}

module.exports = {
   ffmpeg,
   toAudio,
   toPTT,
   toVideo
}