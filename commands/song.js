const axios = require('axios')
const yts = require('yt-search')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { pipeline } = require('stream')
const { promisify } = require('util')
const ffmpeg = require('fluent-ffmpeg')

const streamPipe = promisify(pipeline)
const API_BASE = (process.env.API_BASE || 'https://api.orbitxspace.com').replace(/\/+$/, '')
const API_KEY = process.env.API_KEY || 'Russellxz'
const API_RESOLVE = API_BASE + '/youtube/resolve'
const RESOLVE_TIMEOUT = 300000
const DOWNLOAD_TIMEOUT = 300000
const DEFAULT_VIDEO_QUALITY = '360'
const DEFAULT_AUDIO_FORMAT = 'mp3'
const MAX_MB = 200
const VALID_QUALITIES = new Set(['144', '240', '360', '720'])
const pending = new Map()
const TMP_DIR = path.join(os.tmpdir(), 'felbot-play')

function ensureTmp() {
   fs.mkdirSync(TMP_DIR, { recursive: true })
   return TMP_DIR
}
function safeName(name = 'Felbot') {
   return String(name).slice(0, 90).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim() || 'Felbot'
}
function fileSizeMB(file) { return fs.statSync(file).size / (1024 * 1024) }
function extractQuality(text = '') {
   const match = String(text).toLowerCase().match(/\b(144|240|360|720)\s*p?\b/)
   return match ? match[1] : ''
}
function splitQueryAndQuality(raw = '') {
   const parts = String(raw).trim().split(/\s+/).filter(Boolean)
   const match = (parts[parts.length - 1] || '').toLowerCase().match(/^(144|240|360|720)p?$/)
   if (match) { parts.pop(); return { query: parts.join(' ').trim(), quality: match[1] } }
   return { query: parts.join(' ').trim(), quality: '' }
}
function isIphone(message) { return /^3A.{18}$/.test(String(message?.key?.id || '')) }
function isApiUrl(url) {
   try { return new URL(url).host === new URL(API_BASE).host } catch { return false }
}
function absoluteUrl(url) {
   if (!url || typeof url !== 'string') return ''
   return url.startsWith('/') ? API_BASE + url : url
}
function mediaCandidates(result) {
   const media = result?.media
   if (typeof media === 'string') return [absoluteUrl(media)].filter(Boolean)
   return [...new Set([
      absoluteUrl(media?.direct), absoluteUrl(media?.dl_download), absoluteUrl(media?.dl_inline),
      absoluteUrl(media?.url || media?.download), absoluteUrl(result?.url || result?.download)
   ].filter(Boolean))]
}
async function callYoutubeResolve(videoUrl, options = {}) {
   const isAudio = options.type === 'audio'
   const body = isAudio
      ? { url: videoUrl, type: 'audio', format: options.format || DEFAULT_AUDIO_FORMAT }
      : { url: videoUrl, type: 'video', quality: options.quality || DEFAULT_VIDEO_QUALITY }
   const response = await axios.post(API_RESOLVE, body, {
      timeout: RESOLVE_TIMEOUT,
      headers: { 'Content-Type': 'application/json', apikey: API_KEY, Accept: 'application/json, */*' },
      validateStatus: () => true
   })
   const data = response.data
   if (!data || typeof data !== 'object') throw new Error('La API no devolvió una respuesta JSON')
   const ok = data.status === true || data.status === 'true' || data.ok === true || data.success === true
   if (!ok) throw new Error(data.message || data.error || ('HTTP_' + response.status))
   const result = data.result || data.data || data
   const candidates = mediaCandidates(result)
   if (!candidates.length) throw new Error('La API no devolvió enlaces de descarga')
   return { title: result.title || 'YouTube', thumbnail: result.thumbnail || result.cover || '', candidates }
}
async function downloadToFile(url, file) {
   const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      Accept: '*/*'
   }
   if (isApiUrl(url)) headers.apikey = API_KEY
   const response = await axios.get(url, {
      responseType: 'stream', timeout: DOWNLOAD_TIMEOUT, headers, maxRedirects: 5, validateStatus: () => true
   })
   if (response.status >= 400) throw new Error('HTTP_' + response.status)
   const contentType = String(response.headers?.['content-type'] || '')
   if (/text\/html|application\/json/i.test(contentType)) {
      response.data.destroy()
      throw new Error('El enlace devolvió ' + contentType.split(';')[0] + ', no un archivo')
   }
   const expected = Number(response.headers?.['content-length'] || 0)
   await streamPipe(response.data, fs.createWriteStream(file))
   const actual = fs.statSync(file).size
   if (!actual) throw new Error('El archivo descargado está vacío')
   if (expected && actual !== expected) throw new Error('Descarga incompleta: ' + actual + ' de ' + expected + ' bytes')
   return file
}
async function downloadCandidates(urls, file, validator) {
   const backup = file + '.alt'
   let lastError
   for (const url of urls) {
      try {
         await downloadToFile(url, file)
         if (!validator || validator(file)) return { formatOk: true }
         lastError = new Error('Formato de archivo no compatible')
         try { fs.unlinkSync(backup) } catch {}
         fs.renameSync(file, backup)
      } catch (error) {
         lastError = error
         try { fs.unlinkSync(file) } catch {}
      }
   }
   if (fs.existsSync(backup)) { fs.renameSync(backup, file); return { formatOk: false } }
   throw lastError || new Error('No hay enlaces de descarga disponibles')
}
function readHeader(file, size = 12) {
   const fd = fs.openSync(file, 'r')
   const buffer = Buffer.alloc(size)
   try { fs.readSync(fd, buffer, 0, size, 0) } finally { fs.closeSync(fd) }
   return buffer
}
function isMp4(file) {
   try { return readHeader(file).slice(4, 8).toString('latin1') === 'ftyp' } catch { return false }
}
function audioFormat(file) {
   try {
      const b = readHeader(file)
      if (b.slice(0, 3).toString('latin1') === 'ID3') return 'mp3'
      if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'mp3'
      if (b.slice(4, 8).toString('latin1') === 'ftyp') return 'm4a'
      if (b.slice(0, 4).toString('latin1') === 'OggS') return 'ogg'
      if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm'
      return ''
   } catch { return '' }
}
function cleanup(...files) {
   for (const file of files) { if (file) { try { if (fs.existsSync(file)) fs.unlinkSync(file) } catch {} } }
}
function getMessageText(message) {
   return String(message?.message?.conversation || message?.message?.extendedTextMessage?.text || '').trim()
}
function getQuotedId(message) {
   return message?.message?.extendedTextMessage?.contextInfo?.stanzaId ||
      message?.message?.buttonsResponseMessage?.contextInfo?.stanzaId ||
      message?.message?.listResponseMessage?.contextInfo?.stanzaId ||
      message?.message?.templateButtonReplyMessage?.contextInfo?.stanzaId ||
      message?.message?.interactiveResponseMessage?.contextInfo?.stanzaId || ''
}
function getSelectedId(message) {
   const interactive = message?.message?.interactiveResponseMessage?.nativeFlowResponseMessage
   if (message?.message?.listResponseMessage?.singleSelectReply?.selectedRowId) return message.message.listResponseMessage.singleSelectReply.selectedRowId
   if (message?.message?.buttonsResponseMessage?.selectedButtonId) return message.message.buttonsResponseMessage.selectedButtonId
   if (message?.message?.templateButtonReplyMessage?.selectedId) return message.message.templateButtonReplyMessage.selectedId
   if (interactive?.paramsJson) { try { return JSON.parse(interactive.paramsJson).id || '' } catch {} }
   return interactive?.body?.text || ''
}
async function react(sock, message, emoji) {
   try { await sock.sendMessage(message.key.remoteJid, { react: { text: emoji, key: message.key } }) } catch {}
}
async function sendText(sock, chatId, text, quoted) {
   return sock.sendMessage(chatId, { text }, quoted ? { quoted } : {})
}
async function searchVideo(query) {
   console.log('[play] Buscando en YouTube:', query)
   const result = await yts(query)
   const video = result.videos?.[0]
   if (!video) throw new Error('No encontré resultados para esa búsqueda')
   return {
      url: video.url, title: video.title || 'YouTube', thumbnail: video.thumbnail || '',
      duration: video.timestamp || '—', views: Number(video.views || 0),
      author: video.author?.name || video.author || 'Desconocido', published: video.ago || ''
   }
}
async function getVideoFromUrl(url) {
   const match = String(url).match(/(?:v=|youtu\.be\/|shorts\/)([0-9A-Za-z_-]{11})/)
   if (!match) return { url, title: 'YouTube', thumbnail: '', duration: '—', views: 0, author: 'YouTube', published: '' }
   try {
      const result = await yts({ videoId: match[1] })
      if (result) return {
         url, title: result.title || 'YouTube', thumbnail: result.thumbnail || '',
         duration: result.timestamp || '—', views: Number(result.views || 0),
         author: result.author?.name || 'YouTube', published: result.ago || ''
      }
   } catch {}
   return { url, title: 'YouTube', thumbnail: '', duration: '—', views: 0, author: 'YouTube', published: '' }
}
async function downloadAudio(sock, job, asDocument, quoted) {
   const { chatId, videoUrl, title } = job
   let resolved
   try { resolved = await callYoutubeResolve(videoUrl, { type: 'audio', format: DEFAULT_AUDIO_FORMAT }) }
   catch (error) { return sendText(sock, chatId, '❌ Error de la API (audio): ' + error.message, quoted) }
   const base = safeName(title)
   const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8)
   const input = path.join(ensureTmp(), stamp + '_audio.bin')
   const output = path.join(ensureTmp(), stamp + '_' + base + '.mp3')
   let finalFile = output
   try {
      await downloadCandidates(resolved.candidates, input)
      if (audioFormat(input) === 'mp3') fs.renameSync(input, output)
      else {
         try {
            await new Promise((resolve, reject) => {
               ffmpeg(input).audioCodec('libmp3lame').audioBitrate('128k').format('mp3')
                  .on('end', resolve).on('error', reject).save(output)
            })
            cleanup(input)
         } catch (error) {
            console.error('[play] FFmpeg audio:', error.message)
            finalFile = input
            asDocument = true
         }
      }
      if (fileSizeMB(finalFile) > MAX_MB) throw new Error('El audio supera el límite de ' + MAX_MB + ' MB')
      const format = audioFormat(finalFile)
      await sock.sendMessage(chatId, {
         [asDocument ? 'document' : 'audio']: { url: finalFile },
         mimetype: format === 'mp3' ? 'audio/mpeg' : 'application/octet-stream',
         ptt: false,
         fileName: base + (format === 'mp3' ? '.mp3' : '.' + (format || 'bin'))
      }, { quoted })
   } catch (error) {
      await sendText(sock, chatId, '❌ Error descargando audio: ' + error.message, quoted)
   } finally { cleanup(input, output) }
}
async function downloadVideo(sock, job, asDocument, quoted) {
   const { chatId, videoUrl, title } = job
   const quality = VALID_QUALITIES.has(job.videoQuality) ? job.videoQuality : DEFAULT_VIDEO_QUALITY
   let resolved
   try { resolved = await callYoutubeResolve(videoUrl, { type: 'video', quality }) }
   catch (error) { return sendText(sock, chatId, '❌ Error de la API (video): ' + error.message, quoted) }
   const base = safeName(title)
   const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8)
   const file = path.join(ensureTmp(), stamp + '_' + base + '_' + quality + 'p.mp4')
   try {
      const state = await downloadCandidates(resolved.candidates, file, isMp4)
      if (!state.formatOk) {
         asDocument = true
         await sendText(sock, chatId, '⚠️ La API no entregó un MP4 reproducible; te lo envío como documento.', quoted)
      }
      if (fileSizeMB(file) > MAX_MB) throw new Error('El video supera el límite de ' + MAX_MB + ' MB')
      await sock.sendMessage(chatId, {
         [asDocument ? 'document' : 'video']: { url: file },
         mimetype: isMp4(file) ? 'video/mp4' : 'application/octet-stream',
         fileName: base + '_' + quality + 'p' + (isMp4(file) ? '.mp4' : '.bin')
      }, { quoted })
   } catch (error) {
      await sendText(sock, chatId, '❌ Error descargando video: ' + error.message, quoted)
   } finally { cleanup(file, file + '.alt') }
}
async function processChoice(sock, job, choice, quoted) {
   const chatId = job.chatId
   if (choice === 'audio' || choice === 'audiodoc') {
      await react(sock, quoted, choice === 'audio' ? '🎵' : '📄')
      await sendText(sock, chatId, choice === 'audio' ? '🎶 Descargando audio MP3...' : '🎶 Descargando audio como documento...', quoted)
      return downloadAudio(sock, job, choice === 'audiodoc', quoted)
   }
   const match = choice.match(/^(video|videodoc)(?:_(144|240|360|720))?$/i)
   if (match) {
      const doc = match[1].toLowerCase() === 'videodoc'
      const quality = match[2] || job.videoQuality || DEFAULT_VIDEO_QUALITY
      await react(sock, quoted, doc ? '📁' : '🎬')
      await sendText(sock, chatId, '🎥 Descargando video (' + quality + 'p)...', quoted)
      return downloadVideo(sock, { ...job, videoQuality: quality }, doc, quoted)
   }
}
async function handleIncoming(sock, event) {
   for (const message of event.messages || []) {
      if (!message?.message || message.key?.fromMe) continue
      const chatId = message.key?.remoteJid
      if (!chatId) continue
      if (message.message.reactionMessage) {
         const targetId = message.message.reactionMessage.key?.id
         const job = pending.get(targetId)
         if (!job || job.sock !== sock || job.chatId !== chatId) continue
         const map = { '👍': 'audio', '❤️': 'video', '📄': 'audiodoc', '📁': 'videodoc' }
         const choice = map[message.message.reactionMessage.text]
         if (choice) await processChoice(sock, job, choice, job.previewMessage)
         continue
      }
      const selectedId = getSelectedId(message)
      if (selectedId) {
         const quotedId = getQuotedId(message)
         let job = quotedId ? pending.get(quotedId) : null
         if (!job) job = [...pending.values()].filter(item => item.sock === sock && item.chatId === chatId)
            .sort((a, b) => b.createdAt - a.createdAt)[0]
         if (!job || job.sock !== sock || job.chatId !== chatId) continue
         const id = String(selectedId)
         if (id.endsWith('play_audio')) await processChoice(sock, job, 'audio', message)
         else if (id.endsWith('play_audiodoc')) await processChoice(sock, job, 'audiodoc', message)
         else {
            const videoDoc = id.match(/play_videodoc_(144|240|360|720)$/)
            const video = id.match(/play_video_(144|240|360|720)$/)
            if (videoDoc) await processChoice(sock, job, 'videodoc_' + videoDoc[1], message)
            else if (video) await processChoice(sock, job, 'video_' + video[1], message)
         }
         continue
      }
      const quotedId = getQuotedId(message)
      const job = pending.get(quotedId)
      if (!job || job.sock !== sock || job.chatId !== chatId) continue
      const text = getMessageText(message).toLowerCase()
      const first = text.split(/\s+/)[0] || ''
      const quality = extractQuality(text)
      if (['1', 'audio'].includes(first)) await processChoice(sock, job, 'audio', message)
      else if (['4', 'audiodoc'].includes(first)) await processChoice(sock, job, 'audiodoc', message)
      else if (['2', 'video'].includes(first)) await processChoice(sock, { ...job, videoQuality: quality || job.videoQuality }, 'video_' + (quality || job.videoQuality), message)
      else if (['3', 'videodoc'].includes(first)) await processChoice(sock, { ...job, videoQuality: quality || job.videoQuality }, 'videodoc_' + (quality || job.videoQuality), message)
   }
}
async function songCommand(sock, chatId, message) {
   const text = getMessageText(message)
   const raw = text.replace(/^\s*\.\S+\s*/, '').trim()
   const parsed = splitQueryAndQuality(raw)
   if (!parsed.query) {
      return sendText(sock, chatId, '🎵 *FELBOT PLAY*\n\nUsa: *.play nombre de la canción [calidad]*\nEjemplo: *.play Canserbero Es épico 720*', message)
   }
   await react(sock, message, '⏳')
   try {
      const video = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(parsed.query)
         ? await getVideoFromUrl(parsed.query)
         : await searchVideo(parsed.query)
      const quality = VALID_QUALITIES.has(parsed.quality) ? parsed.quality : DEFAULT_VIDEO_QUALITY
      const caption = [
         '𝕱𝖊𝖑𝖇𝖔𝖙 夜  •  *RESULTADO ENCONTRADO*',
         '',
         '> 🎵 *Título:* ' + video.title,
         '> 👤 *Canal:* ' + video.author,
         '> ⏱️ *Duración:* ' + video.duration,
         '> 👀 *Vistas:* ' + Number(video.views || 0).toLocaleString(),
         '> 🔗 *Enlace:* ' + video.url,
         '',
         '📥 *Selecciona qué deseas descargar:*',
         '• Audio MP3',
         '• Video de 144p a 720p',
         '• Enviar como documento',
         '',
         'Si no te aparecen los botones, responde citando este mensaje:',
         '*1* Audio · *2* Video · *3* Video documento · *4* Audio documento',
         '',
         'Puedes indicar calidad: _video 720_ o _videodoc 240_.'
      ].join('\n')
      const menu = [{
         text: '📥 Menú de descarga',
         sections: [
            { title: '🎵 AUDIO', rows: [
               { title: '🎵 Audio MP3', description: 'Audio reproducible', id: '.play_audio' },
               { title: '📄 Audio como documento', description: 'Archivo MP3', id: '.play_audiodoc' }
            ]},
            { title: '🎬 VIDEO', rows: [
               { title: '🎬 Video 144p', description: 'El más liviano', id: '.play_video_144' },
               { title: '🎬 Video 240p', description: 'Liviano', id: '.play_video_240' },
               { title: '🎬 Video 360p', description: 'Calidad estándar', id: '.play_video_360' },
               { title: '🎬 Video 720p', description: 'HD', id: '.play_video_720' }
            ]},
            { title: '📁 VIDEO COMO DOCUMENTO', rows: [
               { title: '📁 Documento 144p', description: 'MP4 descargable', id: '.play_videodoc_144' },
               { title: '📁 Documento 240p', description: 'MP4 descargable', id: '.play_videodoc_240' },
               { title: '📁 Documento 360p', description: 'MP4 descargable', id: '.play_videodoc_360' },
               { title: '📁 Documento 720p', description: 'MP4 descargable', id: '.play_videodoc_720' }
            ]}
         ]
      }]
      let preview
      if (!isIphone(message)) {
         try {
            preview = await sock.sendMessage(chatId, {
               image: video.thumbnail ? { url: video.thumbnail } : undefined,
               caption, footer: '❦ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 — Selecciona una opción ❦',
               buttons: menu, headerType: 4
            }, { quoted: message })
         } catch (error) {
            console.log('[play] Menú interactivo no disponible; usando alternativa:', error.message)
         }
      }
      if (!preview) {
         const fallback = caption + (isIphone(message)
            ? '\n\nReacciona: 👍 audio · ❤️ video · 📄 audio documento · 📁 video documento'
            : '')
         preview = await sock.sendMessage(chatId, video.thumbnail
            ? { image: { url: video.thumbnail }, caption: fallback }
            : { text: fallback }, { quoted: message })
      }
      const job = {
         sock, chatId, videoUrl: video.url, title: video.title, thumbnail: video.thumbnail,
         duration: video.duration, views: video.views, author: video.author,
         videoQuality: quality, previewMessage: preview, createdAt: Date.now()
      }
      pending.set(preview.key.id, job)
      job.timer = setTimeout(() => pending.delete(preview.key.id), 10 * 60 * 1000)
      await react(sock, message, '✅')
      if (!sock._felbotPlayListener) {
         sock._felbotPlayListener = true
         sock.ev.on('messages.upsert', event => {
            handleIncoming(sock, event).catch(error => console.error('[play] Listener:', error))
         })
      }
      return true
   } catch (error) {
      console.error('[play] Error:', error?.response?.data || error.message || error)
      await react(sock, message, '❌')
      return sendText(sock, chatId, '❌ No pude encontrar esa canción o preparar el menú.\n\n' + error.message, message)
   }
}
async function handleSongButton() { return false }

module.exports = songCommand
module.exports.songCommand = songCommand
module.exports.handleSongButton = handleSongButton
