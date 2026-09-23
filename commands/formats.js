const fs = require('fs')
const youtubedl = require('youtube-dl-exec')

const cookiesPath = '/home/container/cookies.txt'

function getCookiesStatus() {
   try {
      if (!fs.existsSync(cookiesPath)) {
         return false
      }

      const stats = fs.statSync(cookiesPath)

      if (!stats.isFile()) {
         return false
      }

      if (stats.size <= 100) {
         return false
      }

      return true
   } catch {
      return false
   }
}

function buildYtDlpOptions(extra = {}) {
   const options = {
      noWarnings: true,
      noPlaylist: true,
      noCheckCertificates: true,
      skipDownload: true,
      dumpSingleJson: true,
      quiet: true,
      noProgress: true,
      extractorArgs: 'youtube:player_client=default',
      ...extra
   }

   if (getCookiesStatus()) {
      options.cookies = cookiesPath
   }

   return options
}

function normalizeValue(value, fallback = '—') {
   if (
      value === undefined ||
      value === null ||
      value === 'none' ||
      value === 'N/A' ||
      value === 'NaN'
   ) {
      return fallback
   }

   return String(value)
}

function formatBytes(bytes) {
   if (
      bytes === undefined ||
      bytes === null ||
      Number.isNaN(Number(bytes))
   ) {
      return '—'
   }

   const size = Number(bytes)
   const units = ['B', 'KB', 'MB', 'GB']
   let value = size
   let unitIndex = 0

   while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex += 1
   }

   return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getFormatType(formatItem) {
   const videoCodec = normalizeValue(formatItem?.vcodec, 'none')
   const audioCodec = normalizeValue(formatItem?.acodec, 'none')

   if (videoCodec !== 'none' && audioCodec !== 'none') {
      return 'VIDEO+AUDIO'
   }

   if (videoCodec !== 'none') {
      return 'VIDEO'
   }

   if (audioCodec !== 'none') {
      return 'AUDIO'
   }

   return 'UNKNOWN'
}

function scoreFormat(formatItem) {
   const idRaw = String(formatItem?.format_id || '0')
   const isMp4 = String(formatItem?.ext || '').toLowerCase() === 'mp4'
   const isM4a = String(formatItem?.ext || '').toLowerCase() === 'm4a'
   const isWebm = String(formatItem?.ext || '').toLowerCase() === 'webm'
   const isVideo = getFormatType(formatItem) !== 'AUDIO'

   let score = 0

   if (isMp4) score += 40
   if (isM4a) score += 25
   if (isWebm) score -= 10
   if (isVideo) score += 10

   const idNumber = Number.parseInt(idRaw, 10)
   if (!Number.isNaN(idNumber)) {
      score += idNumber > 0 ? 1 : 0
   }

   return score
}

function pickRelevantFormats(formats) {
   return formats
      .filter((formatItem) => {
         if (!formatItem || !formatItem.format_id) {
            return false
         }

         const type = getFormatType(formatItem)
         return type !== 'UNKNOWN'
      })
      .sort((a, b) => scoreFormat(b) - scoreFormat(a))
      .slice(0, 40)
}

function buildFormatTable(rows) {
   if (!rows.length) {
      return 'No se encontraron formatos útiles para diagnosticar.'
   }

   const header = ['ID', 'EXT', 'RES', 'FPS', 'VIDEO', 'AUDIO', 'SIZE']
   const lines = [header.join(' ')]

   for (const row of rows) {
      const res = row.resolution || '—'
      const fps = row.fps || '—'
      const video = row.videoCodec || '—'
      const audio = row.audioCodec || '—'
      const size = row.size || '—'

      lines.push(
         [row.id, row.ext, res, fps, video, audio, size]
            .map((value) => normalizeValue(value, '—'))
            .join(' ')
      )
   }

   return lines.join('\n')
}

function findVideoAudioCandidates(formats) {
   const videoFormats = formats
      .filter((formatItem) => {
         const type = getFormatType(formatItem)
         return type === 'VIDEO' || type === 'VIDEO+AUDIO'
      })
      .filter((formatItem) => {
         const ext = String(formatItem?.ext || '').toLowerCase()
         return ext === 'mp4' || ext === 'm4v' || ext === 'webm'
      })
      .sort((a, b) => Number(b?.tbr || 0) - Number(a?.tbr || 0))

   const audioFormats = formats
      .filter((formatItem) => {
         const type = getFormatType(formatItem)
         return type === 'AUDIO' || type === 'VIDEO+AUDIO'
      })
      .filter((formatItem) => {
         const ext = String(formatItem?.ext || '').toLowerCase()
         return ext === 'm4a' || ext === 'mp4' || ext === 'webm' || ext === 'aac' || ext === 'opus'
      })
      .sort((a, b) => Number(b?.tbr || 0) - Number(a?.tbr || 0))

   const candidates = []

   for (const video of videoFormats.slice(0, 8)) {
      const videoId = normalizeValue(video?.format_id, '—')
      const audio = audioFormats.find((item) => {
         const itemExt = String(item?.ext || '').toLowerCase()
         return itemExt === 'm4a' || itemExt === 'aac' || itemExt === 'mp4' || itemExt === 'opus'
      })

      if (audio) {
         candidates.push(
            `${videoId} + ${normalizeValue(audio.format_id, '—')} → ${normalizeValue(video?.vcodec, '—')} + ${normalizeValue(audio?.acodec, '—')}`
         )
      }
   }

   if (!candidates.length) {
      const fallbackVideo = videoFormats.slice(0, 4)
      const fallbackAudio = audioFormats.slice(0, 4)
      for (const video of fallbackVideo) {
         for (const audio of fallbackAudio) {
            candidates.push(
               `${normalizeValue(video?.format_id, '—')} + ${normalizeValue(audio?.format_id, '—')} → posible ${normalizeValue(video?.vcodec, '—')} + ${normalizeValue(audio?.acodec, '—')}`
            )
            if (candidates.length >= 10) break
         }
         if (candidates.length >= 10) break
      }
   }

   return candidates.slice(0, 10)
}

function getWarningFlags(formats) {
   const warnings = new Set()

   for (const formatItem of formats) {
      const vcodec = String(formatItem?.vcodec || '').toLowerCase()
      const acodec = String(formatItem?.acodec || '').toLowerCase()
      const ext = String(formatItem?.ext || '').toLowerCase()

      if (vcodec.includes('vp9')) warnings.add('⚠️ VP9')
      if (vcodec.includes('av1')) warnings.add('⚠️ AV1')
      if (ext === 'webm') warnings.add('⚠️ WEBM')
      if (acodec.includes('opus')) warnings.add('⚠️ OPUS')
   }

   return [...warnings]
}

async function resolveVideoFromQuery(query) {
   if (!query) {
      throw new Error('Debes indicar una búsqueda o una URL de YouTube.')
   }

   if (query.includes('youtube.com') || query.includes('youtu.be')) {
      return {
         url: query,
         title: 'YouTube URL'
      }
   }

   const results = await youtubedl('ytsearch1:' + query, {
      ...buildYtDlpOptions(),
      flatPlaylist: true,
      playlistEnd: 1
   })

   if (!results || !Array.isArray(results.entries) || !results.entries.length) {
      throw new Error('No se encontraron resultados para esa búsqueda.')
   }

   const selected = results.entries[0]
   const url = selected.webpage_url || `https://www.youtube.com/watch?v=${selected.id}`

   return {
      url,
      title: selected.title || query
   }
}

function compactFormats(formats) {
   return formats
      .map((formatItem) => {
         const type = getFormatType(formatItem)
         const videoCodec = normalizeValue(formatItem?.vcodec, '—')
         const audioCodec = normalizeValue(formatItem?.acodec, '—')
         const resolution =
            formatItem?.height && formatItem?.width
               ? `${formatItem.height}p`
               : formatItem?.height
                  ? `${formatItem.height}p`
                  : '—'

         const ext = normalizeValue(formatItem?.ext, '—')
         const fps = formatItem?.fps ? String(formatItem.fps) : '—'
         const size = formatItem?.filesize_approx
            ? formatBytes(formatItem.filesize_approx)
            : formatItem?.tbr
               ? `${Number(formatItem.tbr).toFixed(0)} kb/s`
               : '—'

         return {
            id: normalizeValue(formatItem?.format_id, '—'),
            ext,
            resolution,
            fps,
            videoCodec: videoCodec === 'none' ? '—' : videoCodec,
            audioCodec: audioCodec === 'none' ? '—' : audioCodec,
            size,
            type,
            score: scoreFormat(formatItem),
            raw: formatItem
         }
      })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, undefined, { numeric: true }))
}

async function getAvailableFormats(url) {
   const info = await youtubedl(url, buildYtDlpOptions())

   if (!info || !Array.isArray(info.formats)) {
      throw new Error('No se pudo obtener la lista de formatos.')
   }

   return compactFormats(info.formats)
}

async function formatsCommand(sock, chatId, message) {
   const text =
      message?.message?.conversation ||
      message?.message?.extendedTextMessage?.text ||
      ''

   const query = text
      .split(' ')
      .slice(1)
      .join(' ')
      .trim()

   if (!query) {
      await sock.sendMessage(
         chatId,
         {
            text: '🔬 Escribe una canción o una URL de YouTube para diagnosticar formatos.\n\nEjemplo:\n.formatos figaratto buhodermia\n.formatos https://www.youtube.com/watch?v=...'
         },
         { quoted: message }
      )
      return
   }

   try {
      const target = await resolveVideoFromQuery(query)
      const cookiesOn = getCookiesStatus()
      const ffmpegReady = (() => {
         try {
            require('fluent-ffmpeg')
            return true
         } catch {
            return false
         }
      })()

      await sock.sendMessage(
         chatId,
         {
            text: '🔬 Reuniendo formatos disponibles...'
         },
         { quoted: message }
      )

      const formats = await getAvailableFormats(target.url)
      const visibleFormats = pickRelevantFormats(formats)
      const warnings = getWarningFlags(formats)
      const candidatePairs = findVideoAudioCandidates(formats)

      const lines = []
      lines.push('🔬 FELBOT FORMAT TEST')
      lines.push('')
      lines.push(`🎵 ${target.title || 'Título desconocido'}`)
      lines.push('━━━━━━━━━━━━━━━━━━')
      lines.push('')
      lines.push('ID EXT RES FPS VIDEO AUDIO SIZE')

      for (const entry of visibleFormats) {
         lines.push(
            `${entry.id} ${entry.ext} ${entry.resolution} ${entry.fps} ${entry.videoCodec} ${entry.audioCodec} ${entry.size}`
         )
      }

      lines.push('')
      lines.push('━━━━━━━━━━━━━━━━━━')
      lines.push('')

      const videoRows = visibleFormats.filter((entry) => entry.videoCodec !== '—')
      const audioRows = visibleFormats.filter((entry) => entry.audioCodec !== '—')

      if (videoRows.length) {
         lines.push('🎬 VIDEO MP4')
         lines.push(
            videoRows
               .filter((entry) => String(entry.ext).toLowerCase() === 'mp4')
               .slice(0, 8)
               .map((entry) => `${entry.id} → ${entry.videoCodec}`)
               .join('\n') || 'No se detectaron video MP4 relevantes.'
         )
      }

      if (audioRows.length) {
         lines.push('')
         lines.push('🎵 AUDIO')
         lines.push(
            audioRows
               .slice(0, 8)
               .map((entry) => `${entry.id} → ${entry.audioCodec}`)
               .join('\n')
         )
      }

      if (warnings.length) {
         lines.push('')
         lines.push('⚠️ FLAGS')
         lines.push(warnings.join('\n'))
      }

      lines.push('')
      lines.push('🧪 POSIBLES FORMATOS PARA WHATSAPP')
      lines.push(candidatePairs.join('\n') || 'No se detectaron combinaciones claras para diagnóstico.')
      lines.push('')
      lines.push(`🍪 COOKIES: ${cookiesOn ? 'ON' : 'OFF'}`)
      lines.push(`🔧 FFMPEG: ${ffmpegReady ? 'ON' : 'OFF'}`)
      lines.push('')
      lines.push(`⚠️ Se encontraron ${formats.length} formatos. Mostrando los más relevantes.`)

      // keeps output readable by splitting if too long
      const finalText = lines.join('\n')
      const chunks = []
      let current = ''

      for (const line of finalText.split('\n')) {
         if ((current + line + '\n').length > 3000) {
            chunks.push(current.trim())
            current = line + '\n'
         } else {
            current += line + '\n'
         }
      }

      if (current.trim()) {
         chunks.push(current.trim())
      }

      for (const chunk of chunks) {
         await sock.sendMessage(
            chatId,
            { text: chunk },
            { quoted: message }
         )
      }
   } catch (error) {
      console.error('[FORMATOS] Error:', error?.stderr || error?.message || error)

      await sock.sendMessage(
         chatId,
         {
            text: '❌ No se pudo diagnosticar ese video.\n\nVerifica la URL o la búsqueda e inténtalo otra vez.\n\n🍪 COOKIES: ' + (getCookiesStatus() ? 'ON' : 'OFF')
         },
         { quoted: message }
      )
   }
}

module.exports = formatsCommand
module.exports.formatsCommand = formatsCommand
