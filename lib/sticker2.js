const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ffmpeg = require('fluent-ffmpeg')
const webp = require('node-webpmux')
const FileType = require('file-type')

async function sticker(img, url, packname, author) {

    const tmpFile = path.join(
        process.cwd(),
        'temp',
        `${crypto.randomBytes(6).readUIntLE(0, 6)}`
    )

    const outFile = `${tmpFile}.webp`

    const type = await FileType.fromBuffer(img)

    if (!type) throw 'Archivo inválido.'

    const inputFile = `${tmpFile}.${type.ext}`

    fs.writeFileSync(inputFile, img)

    await new Promise((resolve, reject) => {

        ffmpeg(inputFile)
            .on('error', reject)
            .on('end', resolve)
            .addOutputOptions([
                '-vcodec',
                'libwebp',
                '-vf',
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
                '-lossless',
                '1',
                '-compression_level',
                '6',
                '-q:v',
                '50',
                '-loop',
                '0',
                '-preset',
                'default',
                '-an',
                '-vsync',
                '0'
            ])
            .toFormat('webp')
            .save(outFile)

    })

    const buffer = fs.readFileSync(outFile)

    fs.unlinkSync(inputFile)
    fs.unlinkSync(outFile)

    const imgWebp = new webp.Image()

    const stickerPackId = crypto.randomBytes(32).toString('hex')

    const json = {
        'sticker-pack-id': stickerPackId,
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        emojis: ['😈']
    }

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ])

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')

    const exif = Buffer.concat([exifAttr, jsonBuffer])

    exif.writeUIntLE(jsonBuffer.length, 14, 4)

    await imgWebp.load(buffer)

    imgWebp.exif = exif

    return await imgWebp.save(null)
}

module.exports = {
    sticker
}
