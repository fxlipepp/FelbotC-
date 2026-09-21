const express = require('express')
const puppeteer = require('puppeteer')

const app = express()

const PORT = process.env.PORT || 25708
const START_TIME = Date.now()

const VERSION = '2.0.0'
const BOT_NAME = '𝕱𝖊𝖑𝖇𝖔𝖙 夜'
const CREATOR = 'Fxlipe 夜'
const PREFIX = '.'

app.use(express.json({ limit: '50kb' }))

/* =========================================================
   COMANDOS REALES DE FELBOT
========================================================= */

const COMMANDS = [
    {
        category: 'OWNER',
        icon: '👑',
        commands: [
            ['.felbot on', 'Activar Felbot en el grupo.'],
            ['.felbot off', 'Desactivar Felbot en el grupo.']
        ]
    },

    {
        category: 'GENERAL',
        icon: '🌐',
        commands: [
            ['.menu', 'Mostrar el menú completo del bot.'],
            ['.help', 'Mostrar el menú completo del bot.'],
            ['.ping', 'Ver la velocidad y respuesta del bot.'],
            ['.alive', 'Comprobar si el bot está activo.'],
            ['.info', 'Ver la información de los creadores.'],
            ['.owner', 'Ver el contacto del creador del bot.'],
            ['.jid', 'Obtener tu ID de WhatsApp.'],
            ['.groupinfo', 'Mostrar información del grupo.'],
            ['.staff', 'Ver la lista de administradores.'],
            ['.admins', 'Ver la lista de administradores.']
        ]
    },

    {
        category: 'UTILIDADES',
        icon: '🛠️',
        commands: [
            ['.tts', 'Convertir texto a voz.'],
            ['.trt', 'Traducir texto automáticamente.'],
            ['.vv', 'Ver mensajes de visualización única.'],
            ['.8ball', 'Respuestas aleatorias tipo bola mágica.']
        ]
    },

    {
        category: 'ADMIN',
        icon: '👮',
        commands: [
            ['.ban', 'Banear un usuario del bot.'],
            ['.unban', 'Desbanear un usuario del bot.'],
            ['.kick', 'Expulsar un miembro del grupo.'],
            ['.warn', 'Dar advertencias a un usuario.'],
            ['.warnings', 'Ver advertencias acumuladas.'],
            ['.mute', 'Silenciar el grupo temporalmente.'],
            ['.unmute', 'Volver a activar mensajes del grupo.'],
            ['.promote', 'Dar administrador a un usuario.'],
            ['.demote', 'Quitar administrador a un usuario.'],
            ['.delete', 'Eliminar mensajes enviados.'],
            ['.del', 'Eliminar mensajes enviados.'],
            ['.antilink', 'Activar o desactivar anti enlaces.'],
            ['.modoadmin', 'Activar o desactivar modo admin.'],
            ['.welcome', 'Activar o desactivar bienvenidas.'],
            ['.setwelcome', 'Configurar audio personalizado de bienvenida.'],
            ['.resetwelcome', 'Eliminar audio de bienvenida.'],
            ['.setbye', 'Configurar audio personalizado de despedida.'],
            ['.resetbye', 'Eliminar audio de despedida.'],
            ['.n', 'Mencionar a todos los miembros.'],
            ['.todos', 'Etiquetar a todos los participantes.'],
            ['.setgname', 'Cambiar nombre del grupo.'],
            ['.setgpp', 'Cambiar foto del grupo.'],
            ['.setgdesc', 'Cambiar descripción del grupo.'],
            ['.abrir', 'Abrir el grupo.'],
            ['.cerrar', 'Cerrar el grupo.']
        ]
    },

    {
        category: 'FREE FIRE',
        icon: '🔫',
        commands: [
            ['.2vs2', 'Lista de 2vs2.'],
            ['.4vs4', 'Lista de 4vs4.'],
            ['.6vs6', 'Lista de 6vs6.'],
            ['.int2', 'Lista de 2vs2 interna.'],
            ['.int4', 'Lista de 4vs4 interna.'],
            ['.int6', 'Lista de 6vs6 interna.']
        ]
    },

    {
        category: 'STICKERS',
        icon: '🎨',
        commands: [
            ['.s', 'Convertir imagen o video en sticker.'],
            ['.crop', 'Convertir imagen o video en sticker centrado.'],
            ['.brat', 'Convertir texto en sticker.'],
            ['.wm', 'Cambiar packname de un sticker.'],
            ['.attp', 'Crear sticker animado con texto.'],
            ['.emojimix', 'Combinar emojis en stickers.'],
            ['.removebg', 'Eliminar fondo de imágenes.']
        ]
    },

    {
        category: 'TEXTMAKER',
        icon: '🔤',
        commands: [
            ['.metallic', 'Texto metálico brillante.'],
            ['.ice', 'Texto congelado estilo hielo.'],
            ['.snow', 'Texto cubierto de nieve.'],
            ['.impressive', 'Texto impresionante decorado.'],
            ['.matrix', 'Texto estilo Matrix hacker.'],
            ['.light', 'Texto iluminado.'],
            ['.neon', 'Texto con efecto neón.'],
            ['.devil', 'Texto estilo demoníaco.'],
            ['.purple', 'Texto morado brillante.'],
            ['.thunder', 'Texto con rayos eléctricos.'],
            ['.parejas', 'Texto decorado con hojas.'],
            ['.1917', 'Texto estilo película 1917.'],
            ['.arena', 'Texto arena/desierto.'],
            ['.hacker', 'Texto hacker oscuro.'],
            ['.sand', 'Texto de arena caliente.'],
            ['.blackpink', 'Texto estilo BLACKPINK.'],
            ['.glitch', 'Texto con efecto glitch.'],
            ['.fire', 'Texto en llamas.']
        ]
    },

    {
        category: 'ANIME',
        icon: '🖼️',
        commands: [
            ['.nom', 'Comer cariñosamente a alguien.'],
            ['.poke', 'Picar o molestar a alguien.'],
            ['.cry', 'Llorar estilo anime.'],
            ['.besar', 'Besar a un usuario.'],
            ['.pat', 'Dar palmadas en la cabeza.'],
            ['.hug', 'Abrazar a alguien.'],
            ['.wink', 'Guiñar el ojo.'],
            ['.facepalm', 'Hacer facepalm anime.']
        ]
    },

    {
        category: 'JUEGOS',
        icon: '🎮',
        commands: [
            ['.ppt', 'Piedra, papel o tijera.'],
            ['.dados', 'Lanzar dos dados.'],
            ['.moneda', 'Cara o cruz.'],
            ['.ruleta', 'Ruleta aleatoria recreativa.'],
            ['.8ball', 'Consultar la bola mágica.'],
            ['.adivina', 'Adivinar una palabra.'],
            ['.quiz', 'Preguntas y respuestas.'],
            ['.duelo', 'Duelo entre usuarios.'],
            ['.blackjack', 'Jugar blackjack.'],
            ['.slots', 'Máquina tragamonedas recreativa.'],
            ['.memoria', 'Juego de memoria.'],
            ['.tictactoe', 'Jugar tres en raya.'],
            ['.hangman', 'Jugar ahorcado.'],
            ['.guess', 'Juego de adivinar palabras.'],
            ['.trivia', 'Responder preguntas de trivia.'],
            ['.truth', 'Preguntas de verdad.'],
            ['.dare', 'Retos aleatorios.'],
            ['.perfil', 'Ver tus estadísticas.'],
            ['.rank', 'Ranking de jugadores.']
        ]
    },

    {
        category: 'DIVERSIÓN',
        icon: '🎯',
        commands: [
            ['.Parejas', 'Top 5 parejas del grupo.'],
            ['.compliment', 'Enviar cumplidos a alguien.'],
            ['.propuesta', 'Enviar propuesta de matrimonio.'],
            ['.divorcio', 'Finalizar un matrimonio activo en el grupo.'],
            ['.top', 'Mostrar un top 5 de una categoría.'],
            ['.piropo', 'Enviar piropos a alguien.'],
            ['.insult', 'Insultar amistosamente a alguien.'],
            ['.flirt', 'Coquetear con un usuario.'],
            ['.ship', 'Ver porcentaje de compatibilidad.'],
            ['.simp', 'Mostrar tarjeta Simp.'],
            ['.stupid', 'Mostrar al estúpido del grupo.']
        ]
    },

    {
        category: 'DESCARGAS',
        icon: '📥',
        commands: [
            ['.play', 'Buscar y descargar música.'],
            ['.video', 'Buscar y descargar videos.'],
            ['.song', 'Descargar canciones en MP3.'],
            ['.spotify', 'Descargar audio de Spotify.'],
            ['.tiktok', 'Descargar videos de TikTok.'],
            ['.facebook', 'Descargar videos de Facebook.'],
            ['.instagram', 'Descargar reels y publicaciones.'],
            ['.ytmp4', 'Descargar videos.']
        ]
    }
]

/* =========================================================
   PREPARAR COMANDOS
========================================================= */

const ALL_COMMANDS = []

for (const section of COMMANDS) {
    for (const command of section.commands) {
        ALL_COMMANDS.push({
            command: command[0],
            description: command[1],
            category: section.category,
            icon: section.icon
        })
    }
}

const TOTAL_COMMANDS = ALL_COMMANDS.length
const TOTAL_CATEGORIES = COMMANDS.length

/* =========================================================
   UTILIDADES
========================================================= */

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`
    }

    return `${hours}h ${minutes}m ${secs}s`
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/* =========================================================
   API
========================================================= */

app.get('/api/commands', (req, res) => {
    res.json({
        bot: BOT_NAME,
        creator: CREATOR,
        version: VERSION,
        prefix: PREFIX,
        total: TOTAL_COMMANDS,
        categories: TOTAL_CATEGORIES,
        data: COMMANDS
    })
})

/* =========================================================
   BROWSER
========================================================= */

let browser = null
let browserPage = null

async function getBrowserPage() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            userDataDir: '/home/container/chrome-profile',

            executablePath:
                process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-default-browser-check',
                '--window-size=1280,900'
            ]
        })
    }

    if (!browserPage || browserPage.isClosed()) {
        browserPage = await browser.newPage()

        await browserPage.setViewport({
            width: 1280,
            height: 900
        })

        await browserPage.goto('about:blank', {
            waitUntil: 'domcontentloaded'
        })
    }

    return browserPage
}

/* =========================================================
   STATUS
========================================================= */

app.get('/status', async (req, res) => {
    let browserStatus = 'offline'

    try {
        browserStatus =
            browserPage && !browserPage.isClosed()
                ? 'online'
                : 'offline'
    } catch {
        browserStatus = 'offline'
    }

    res.json({
        status: 'online',
        bot: BOT_NAME,
        creator: CREATOR,
        version: VERSION,
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        uptimeFormatted: formatUptime(
            Math.floor((Date.now() - START_TIME) / 1000)
        ),
        commands: TOTAL_COMMANDS,
        categories: TOTAL_CATEGORIES,
        browser: browserStatus,
        time: new Date().toISOString()
    })
})

/* =========================================================
   BROWSER - SCREENSHOT
========================================================= */

app.get('/browser/screenshot', async (req, res) => {
    try {
        const page = await getBrowserPage()

        const image = await page.screenshot({
            type: 'jpeg',
            quality: 82,
            fullPage: false
        })

        res.setHeader('Content-Type', 'image/jpeg')
        res.send(image)
    } catch (error) {
        console.error('BROWSER SCREENSHOT:', error)
        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - NAVIGATE
========================================================= */

app.post('/browser/navigate', async (req, res) => {
    try {
        const page = await getBrowserPage()

        let url = String(req.body.url || '').trim()

        if (!url) {
            return res.status(400).json({
                error: 'URL requerida'
            })
        }

        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`
        }

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        })

        res.json({
            ok: true,
            url: page.url()
        })
    } catch (error) {
        console.error('BROWSER NAVIGATE:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - CLICK
========================================================= */

app.post('/browser/click', async (req, res) => {
    try {
        const page = await getBrowserPage()

        const x = Number(req.body.x)
        const y = Number(req.body.y)

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return res.status(400).json({
                error: 'Coordenadas inválidas'
            })
        }

        await page.mouse.click(x, y)

        res.json({
            ok: true
        })
    } catch (error) {
        console.error('BROWSER CLICK:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - TYPE
========================================================= */

app.post('/browser/type', async (req, res) => {
    try {
        const page = await getBrowserPage()

        const text = String(req.body.text || '')

        await page.keyboard.type(text, {
            delay: 10
        })

        res.json({
            ok: true
        })
    } catch (error) {
        console.error('BROWSER TYPE:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - KEY
========================================================= */

app.post('/browser/key', async (req, res) => {
    try {
        const page = await getBrowserPage()

        const key = String(req.body.key || '')

        if (!key) {
            return res.status(400).json({
                error: 'Tecla requerida'
            })
        }

        await page.keyboard.press(key)

        res.json({
            ok: true
        })
    } catch (error) {
        console.error('BROWSER KEY:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - RELOAD
========================================================= */

app.post('/browser/reload', async (req, res) => {
    try {
        const page = await getBrowserPage()

        await page.reload({
            waitUntil: 'domcontentloaded',
            timeout: 30000
        })

        res.json({
            ok: true,
            url: page.url()
        })
    } catch (error) {
        console.error('BROWSER RELOAD:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - BACK
========================================================= */

app.post('/browser/back', async (req, res) => {
    try {
        const page = await getBrowserPage()

        await page.goBack({
            waitUntil: 'domcontentloaded',
            timeout: 30000
        }).catch(() => {})

        res.json({
            ok: true,
            url: page.url()
        })
    } catch (error) {
        console.error('BROWSER BACK:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   BROWSER - FORWARD
========================================================= */

app.post('/browser/forward', async (req, res) => {
    try {
        const page = await getBrowserPage()

        await page.goForward({
            waitUntil: 'domcontentloaded',
            timeout: 30000
        }).catch(() => {})

        res.json({
            ok: true,
            url: page.url()
        })
    } catch (error) {
        console.error('BROWSER FORWARD:', error)

        res.status(500).json({
            error: error.message
        })
    }
})

/* =========================================================
   PÁGINA BROWSER
========================================================= */

app.get('/browser', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${BOT_NAME} — Browser</title>

<style>
* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
    background: #080808;
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
}

body {
    min-height: 100vh;
}

.browser-top {
    position: sticky;
    top: 0;
    z-index: 50;
    padding: 14px;
    background: rgba(8,8,8,.92);
    backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(255,255,255,.08);
}

.browser-bar {
    display: flex;
    gap: 8px;
    max-width: 1400px;
    margin: auto;
}

.browser-bar button,
.browser-bar input {
    border: 1px solid rgba(255,255,255,.12);
    background: #111;
    color: white;
    border-radius: 10px;
    height: 42px;
}

.browser-bar button {
    width: 44px;
    cursor: pointer;
}

.browser-bar button:hover {
    background: #1b1b1b;
}

.browser-bar input {
    flex: 1;
    padding: 0 14px;
    outline: none;
}

.browser-frame {
    max-width: 1400px;
    margin: 20px auto;
    padding: 0 14px 40px;
}

.browser-screen {
    width: 100%;
    min-height: 70vh;
    object-fit: contain;
    display: block;
    background: #111;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 16px;
}
</style>
</head>

<body>

<div class="browser-top">
    <div class="browser-bar">
        <button onclick="goBack()">‹</button>
        <button onclick="goForward()">›</button>
        <button onclick="reloadPage()">↻</button>

        <input
            id="url"
            placeholder="https://..."
            onkeydown="if(event.key==='Enter') navigate()"
        >

        <button onclick="navigate()">GO</button>
    </div>
</div>

<div class="browser-frame">
    <img
        id="screen"
        class="browser-screen"
        src="/browser/screenshot"
        alt="Browser"
    >
</div>

<script>
const screen = document.getElementById('screen')
const urlInput = document.getElementById('url')

function refreshScreen() {
    screen.src = '/browser/screenshot?t=' + Date.now()
}

async function navigate() {
    const url = urlInput.value.trim()

    if (!url) return

    await fetch('/browser/navigate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    })

    refreshScreen()
}

async function goBack() {
    await fetch('/browser/back', {
        method: 'POST'
    })

    refreshScreen()
}

async function goForward() {
    await fetch('/browser/forward', {
        method: 'POST'
    })

    refreshScreen()
}

async function reloadPage() {
    await fetch('/browser/reload', {
        method: 'POST'
    })

    refreshScreen()
}

setInterval(refreshScreen, 5000)
</script>

</body>
</html>`)
})

/* =========================================================
   SITIO PRINCIPAL
========================================================= */

app.get('/', (req, res) => {

    const categoryButtons = COMMANDS.map(section => `
        <button
            class="category-filter"
            data-category="${escapeHtml(section.category)}"
            onclick="filterCategory('${escapeHtml(section.category)}')"
        >
            <span>${section.icon}</span>
            ${escapeHtml(section.category)}
        </button>
    `).join('')

    const commandCards = ALL_COMMANDS.map(item => `
        <article
            class="command-card"
            data-category="${escapeHtml(item.category)}"
            data-search="${escapeHtml(
                `${item.command} ${item.description} ${item.category}`
            ).toLowerCase()}"
        >
            <div class="command-top">
                <div class="command-icon">
                    ${item.icon}
                </div>

                <div class="command-category">
                    ${escapeHtml(item.category)}
                </div>
            </div>

            <div class="command-name">
                ${escapeHtml(item.command)}
            </div>

            <div class="command-description">
                ${escapeHtml(item.description)}
            </div>

            <button
                class="copy-command"
                onclick="copyCommand('${escapeHtml(item.command)}', this)"
            >
                COPIAR
            </button>
        </article>
    `).join('')

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>${BOT_NAME} — Oficial</title>

<meta
    name="description"
    content="Sitio oficial de ${BOT_NAME}. Comandos, funciones y estado del bot."
>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap"
    rel="stylesheet"
>

<style>

:root {
    --bg: #070707;
    --bg-soft: #0d0d0d;
    --card: #101010;
    --card-hover: #151515;
    --text: #f5f5f5;
    --muted: #909090;
    --line: rgba(255,255,255,.09);
    --line-strong: rgba(255,255,255,.16);
}

* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    background:
        linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px),
        var(--bg);
    background-size: 45px 45px;
    color: var(--text);
    font-family: Inter, Arial, sans-serif;
    overflow-x: hidden;
}

body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
        radial-gradient(
            circle at 50% 0%,
            rgba(255,255,255,.08),
            transparent 34%
        );
    z-index: -1;
}

a {
    color: inherit;
    text-decoration: none;
}

.container {
    width: min(1180px, calc(100% - 40px));
    margin: auto;
}

/* NAV */

nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;

    background: rgba(7,7,7,.76);
    backdrop-filter: blur(20px);

    border-bottom: 1px solid var(--line);
}

.nav-inner {
    height: 72px;

    display: flex;
    align-items: center;
    justify-content: space-between;
}

.brand {
    font-family: "Playfair Display", serif;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: .02em;
}

.brand span {
    color: #999;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
}

.nav-links a {
    color: #aaa;
    font-size: 13px;
    transition: .2s;
}

.nav-links a:hover {
    color: white;
}

.nav-button {
    padding: 10px 16px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
}

/* HERO */

.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding-top: 100px;
    position: relative;
}

.hero::after {
    content: "";
    position: absolute;
    width: 500px;
    height: 500px;
    border: 1px solid rgba(255,255,255,.035);
    border-radius: 50%;
    right: -220px;
    top: 25%;
}

.hero-content {
    max-width: 850px;
}

.eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;

    border: 1px solid var(--line);
    background: rgba(255,255,255,.025);

    padding: 8px 13px;
    border-radius: 999px;

    color: #aaa;
    font-size: 11px;
    letter-spacing: .13em;
    margin-bottom: 25px;
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 12px rgba(255,255,255,.8);
}

.hero h1 {
    margin: 0;
    font-family: "Playfair Display", serif;
    font-size: clamp(65px, 12vw, 145px);
    line-height: .9;
    letter-spacing: -.055em;
}

.hero h1 span {
    color: #777;
}

.hero-subtitle {
    margin-top: 24px;
    color: #aaa;
    font-size: 18px;
    letter-spacing: .25em;
    text-transform: uppercase;
}

.hero-text {
    max-width: 650px;
    color: #888;
    line-height: 1.8;
    font-size: 16px;
    margin-top: 28px;
}

.hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 32px;
}

.btn {
    padding: 14px 20px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    transition: .25s;
}

.btn-primary {
    background: #fff;
    color: #050505;
}

.btn-primary:hover {
    transform: translateY(-2px);
    background: #ddd;
}

.btn-secondary {
    border: 1px solid var(--line-strong);
    color: #ddd;
}

.btn-secondary:hover {
    background: rgba(255,255,255,.06);
}

/* SECTIONS */

section {
    padding: 110px 0;
}

.section-kicker {
    color: #777;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .18em;
    margin-bottom: 16px;
}

.section-title {
    font-family: "Playfair Display", serif;
    font-size: clamp(38px, 6vw, 70px);
    line-height: 1;
    letter-spacing: -.04em;
    margin: 0;
}

.section-description {
    color: #858585;
    max-width: 650px;
    line-height: 1.8;
    margin-top: 22px;
}

/* FEATURES */

.features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 45px;
}

.feature {
    border: 1px solid var(--line);
    background: rgba(255,255,255,.025);
    border-radius: 14px;
    padding: 27px;
    transition: .25s;
}

.feature:hover {
    transform: translateY(-4px);
    background: rgba(255,255,255,.045);
    border-color: var(--line-strong);
}

.feature-icon {
    font-size: 25px;
    margin-bottom: 22px;
}

.feature-title {
    font-size: 16px;
    font-weight: 700;
}

.feature-text {
    color: #777;
    font-size: 13px;
    line-height: 1.7;
    margin-top: 10px;
}

/* COMMANDS */

.commands-header {
    display: flex;
    justify-content: space-between;
    gap: 30px;
    align-items: end;
}

.commands-counter {
    color: #777;
    font-size: 12px;
    white-space: nowrap;
}

.command-tools {
    margin-top: 38px;
}

.search-box {
    width: 100%;
    height: 54px;

    background: rgba(255,255,255,.035);
    border: 1px solid var(--line);
    border-radius: 11px;

    color: white;
    outline: none;

    padding: 0 18px;
    font-size: 14px;
}

.search-box:focus {
    border-color: rgba(255,255,255,.25);
}

.categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
}

.category-filter {
    border: 1px solid var(--line);
    background: rgba(255,255,255,.025);
    color: #888;

    border-radius: 999px;
    padding: 9px 13px;

    cursor: pointer;
    font-size: 11px;

    transition: .2s;
}

.category-filter:hover,
.category-filter.active {
    background: white;
    color: black;
    border-color: white;
}

.commands-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 22px;
}

.command-card {
    min-height: 210px;

    border: 1px solid var(--line);
    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.045),
            rgba(255,255,255,.012)
        );

    border-radius: 13px;
    padding: 20px;

    display: flex;
    flex-direction: column;

    transition:
        transform .2s,
        border-color .2s,
        background .2s;
}

.command-card:hover {
    transform: translateY(-3px);
    border-color: var(--line-strong);
    background: var(--card-hover);
}

.command-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.command-icon {
    font-size: 19px;
}

.command-category {
    font-size: 9px;
    color: #666;
    letter-spacing: .13em;
}

.command-name {
    font-family: "Playfair Display", serif;
    font-size: 25px;
    font-weight: 700;
    margin-top: 24px;
}

.command-description {
    color: #777;
    font-size: 12px;
    line-height: 1.6;
    margin-top: 8px;
    flex: 1;
}

.copy-command {
    margin-top: 18px;

    width: 100%;
    height: 36px;

    background: transparent;
    border: 1px solid var(--line);

    color: #999;
    border-radius: 7px;

    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;

    cursor: pointer;
    transition: .2s;
}

.copy-command:hover {
    background: white;
    color: black;
    border-color: white;
}

/* STATUS */

.status-section {
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    background: rgba(255,255,255,.015);
}

.status-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--line);
    margin-top: 45px;
}

.status-card {
    background: #090909;
    padding: 30px;
}

.status-label {
    color: #666;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .15em;
}

.status-value {
    margin-top: 12px;
    font-family: "Playfair Display", serif;
    font-size: 25px;
}

.online {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.online::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 10px rgba(255,255,255,.7);
}

/* CREATOR */

.creator {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 70px;
    align-items: center;
}

.creator-card {
    border: 1px solid var(--line);
    background: rgba(255,255,255,.025);
    padding: 32px;
    border-radius: 15px;
}

.creator-name {
    font-family: "Playfair Display", serif;
    font-size: 30px;
}

.creator-role {
    color: #666;
    margin-top: 7px;
    font-size: 12px;
}

.socials {
    display: flex;
    gap: 8px;
    margin-top: 28px;
    flex-wrap: wrap;
}

.social {
    border: 1px solid var(--line);
    padding: 10px 13px;
    border-radius: 8px;
    font-size: 11px;
    color: #aaa;
    transition: .2s;
}

.social:hover {
    background: white;
    color: black;
}

/* FOOTER */

footer {
    border-top: 1px solid var(--line);
    padding: 30px 0;
}

.footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}

.footer-brand {
    font-family: "Playfair Display", serif;
    font-size: 17px;
}

.footer-info {
    color: #555;
    font-size: 10px;
    margin-top: 5px;
}

.footer-socials {
    display: flex;
    gap: 20px;
}

.footer-socials a {
    color: #666;
    font-size: 11px;
}

.footer-socials a:hover {
    color: white;
}

/* TOAST */

.toast {
    position: fixed;
    left: 50%;
    bottom: 28px;

    transform: translate(-50%, 20px);

    background: white;
    color: black;

    padding: 12px 18px;
    border-radius: 8px;

    font-size: 12px;
    font-weight: 600;

    opacity: 0;
    pointer-events: none;

    transition: .25s;
    z-index: 500;
}

.toast.show {
    opacity: 1;
    transform: translate(-50%, 0);
}

/* RESPONSIVE */

@media (max-width: 900px) {

    .features {
        grid-template-columns: 1fr;
    }

    .commands-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .status-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .creator {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 650px) {

    .container {
        width: min(100% - 28px, 1180px);
    }

    .nav-links {
        display: none;
    }

    .hero {
        min-height: 90vh;
    }

    .hero h1 {
        font-size: 67px;
    }

    .commands-header {
        display: block;
    }

    .commands-counter {
        margin-top: 15px;
    }

    .commands-grid {
        grid-template-columns: 1fr;
    }

    .status-grid {
        grid-template-columns: 1fr;
    }

    .footer-inner {
        flex-direction: column;
        align-items: flex-start;
    }

    .footer-socials {
        flex-wrap: wrap;
    }
}

</style>
</head>

<body>

<!-- NAV -->

<nav>
    <div class="container nav-inner">

        <a href="/" class="brand">
            𝕱𝖊𝖑𝖇𝖔𝖙 <span>夜</span>
        </a>

        <div class="nav-links">
            <a href="#funciones">Funciones</a>
            <a href="#comandos">Comandos</a>
            <a href="#estado">Estado</a>
            <a href="#creador">Creador</a>
            <a href="/browser" class="nav-button">Browser</a>
        </div>

    </div>
</nav>

<!-- HERO -->

<main>

<section class="hero">

    <div class="container">

        <div class="hero-content">

            <div class="eyebrow">
                <span class="status-dot"></span>
                SISTEMA ONLINE
            </div>

            <h1>
                𝕱𝖊𝖑𝖇𝖔𝖙
                <span>夜</span>
            </h1>

            <div class="hero-subtitle">
                WhatsApp Bot
            </div>

            <p class="hero-text">
                Un bot de WhatsApp creado para ofrecer
                herramientas, administración, entretenimiento,
                utilidades y mucho más directamente desde tus grupos.
            </p>

            <div class="hero-actions">

                <a href="#comandos" class="btn btn-primary">
                    Explorar comandos
                </a>

                <a href="#funciones" class="btn btn-secondary">
                    Conocer Felbot
                </a>

            </div>

            <div class="hero-actions" style="margin-top:14px;">

                <a
                    href="https://wa.me/573117354305"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-secondary"
                >
                    WhatsApp
                </a>

                <a
                    href="https://instagram.com/fxzlp7_"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-secondary"
                >
                    Instagram
                </a>

            </div>

        </div>

    </div>

</section>

<!-- FUNCIONES -->

<section id="funciones">

    <div class="container">

        <div class="section-kicker">
            Felbot
        </div>

        <h2 class="section-title">
            Todo desde<br>
            WhatsApp.
        </h2>

        <p class="section-description">
            Felbot reúne diferentes herramientas para que puedas
            administrar grupos, jugar, crear contenido, usar
            utilidades y disfrutar de funciones sociales desde
            un mismo bot.
        </p>

        <div class="features">

            <div class="feature">
                <div class="feature-icon">👮</div>
                <div class="feature-title">
                    Administración
                </div>
                <div class="feature-text">
                    Herramientas para administrar grupos,
                    usuarios, permisos, advertencias y configuración.
                </div>
            </div>

            <div class="feature">
                <div class="feature-icon">🎮</div>
                <div class="feature-title">
                    Entretenimiento
                </div>
                <div class="feature-text">
                    Juegos, dinámicas, rankings, compatibilidad,
                    retos y funciones sociales.
                </div>
            </div>

            <div class="feature">
                <div class="feature-icon">🛠️</div>
                <div class="feature-title">
                    Utilidades
                </div>
                <div class="feature-text">
                    Stickers, herramientas de texto, traducción,
                    voz y diferentes funciones prácticas.
                </div>
            </div>

        </div>

    </div>

</section>

<!-- COMANDOS -->

<section id="comandos">

    <div class="container">

        <div class="commands-header">

            <div>
                <div class="section-kicker">
                    Command Center
                </div>

                <h2 class="section-title">
                    Comandos.
                </h2>
            </div>

            <div class="commands-counter">
                ${TOTAL_COMMANDS} comandos · ${TOTAL_CATEGORIES} categorías
            </div>

        </div>

        <p class="section-description">
            Explora los comandos disponibles en Felbot.
            Busca una función o filtra por categoría.
        </p>

        <div class="command-tools">

            <input
                id="search"
                class="search-box"
                type="text"
                placeholder="Buscar comando..."
                autocomplete="off"
            >

            <div class="categories">

                <button
                    class="category-filter active"
                    data-category="ALL"
                    onclick="filterCategory('ALL')"
                >
                    ✦ TODOS
                </button>

                ${categoryButtons}

            </div>

        </div>

        <div id="commandsGrid" class="commands-grid">

            ${commandCards}

        </div>

        <div
            id="noResults"
            style="
                display:none;
                text-align:center;
                color:#666;
                padding:70px 20px;
                font-size:13px;
            "
        >
            No se encontraron comandos.
        </div>

    </div>

</section>

<!-- ESTADO -->

<section id="estado" class="status-section">

    <div class="container">

        <div class="section-kicker">
            System
        </div>

        <h2 class="section-title">
            Estado.
        </h2>

        <p class="section-description">
            Información actual del sistema de Felbot.
        </p>

        <div class="status-grid">

            <div class="status-card">
                <div class="status-label">
                    Estado
                </div>

                <div class="status-value online">
                    ONLINE
                </div>
            </div>

            <div class="status-card">
                <div class="status-label">
                    Versión
                </div>

                <div class="status-value">
                    v${VERSION}
                </div>
            </div>

            <div class="status-card">
                <div class="status-label">
                    Comandos
                </div>

                <div
                    id="statusCommands"
                    class="status-value"
                >
                    ${TOTAL_COMMANDS}
                </div>
            </div>

            <div class="status-card">
                <div class="status-label">
                    Uptime
                </div>

                <div
                    id="statusUptime"
                    class="status-value"
                >
                    Cargando...
                </div>
            </div>

        </div>

    </div>

</section>

<!-- CREADOR -->

<section id="creador">

    <div class="container creator">

        <div>

            <div class="section-kicker">
                Creator
            </div>

            <h2 class="section-title">
                Hecho por personas,
                para comunidades.
            </h2>

            <p class="section-description">
                Felbot es un proyecto desarrollado para crear
                una experiencia completa de herramientas,
                administración y entretenimiento directamente
                desde WhatsApp.
            </p>

        </div>

        <div class="creator-card">

            <div class="creator-name">
                Fxlipe 夜
            </div>

            <div class="creator-role">
                Creador de Felbot
            </div>

            <div class="socials">

                <a
                    href="https://wa.me/573117354305"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="social"
                >
                    WhatsApp
                </a>

                <a
                    href="https://instagram.com/fxzlp7_"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="social"
                >
                    Instagram
                </a>

            </div>

        </div>

    </div>

</section>

</main>

<!-- FOOTER -->

<footer>

    <div class="container footer-inner">

        <div>

            <div class="footer-brand">
                𝕱𝖊𝖑𝖇𝖔𝖙 夜
            </div>

            <div class="footer-info">
                © 2026 — Todos los derechos reservados.
            </div>

        </div>

        <div class="footer-socials">

            <a
                href="https://wa.me/573117354305"
                target="_blank"
                rel="noopener noreferrer"
            >
                WhatsApp
            </a>

            <a
                href="https://instagram.com/fxzlp7_"
                target="_blank"
                rel="noopener noreferrer"
            >
                Instagram
            </a>

            <a href="/browser">
                Browser
            </a>

        </div>

    </div>

</footer>

<div id="toast" class="toast">
    Comando copiado
</div>

<script>

/* =========================================================
   BUSCADOR Y FILTROS
========================================================= */

let activeCategory = 'ALL'

const searchInput = document.getElementById('search')
const cards = Array.from(
    document.querySelectorAll('.command-card')
)

const noResults = document.getElementById('noResults')

function filterCategory(category) {

    activeCategory = category

    document
        .querySelectorAll('.category-filter')
        .forEach(button => {

            const buttonCategory =
                button.dataset.category

            button.classList.toggle(
                'active',
                buttonCategory === category
            )
        })

    applyFilters()
}

function applyFilters() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase()

    let visible = 0

    cards.forEach(card => {

        const category =
            card.dataset.category

        const search =
            card.dataset.search

        const categoryMatch =
            activeCategory === 'ALL' ||
            category === activeCategory

        const searchMatch =
            !query ||
            search.includes(query)

        const show =
            categoryMatch &&
            searchMatch

        card.style.display =
            show ? 'flex' : 'none'

        if (show) {
            visible++
        }
    })

    noResults.style.display =
        visible === 0 ? 'block' : 'none'
}

searchInput.addEventListener(
    'input',
    applyFilters
)

/* =========================================================
   COPIAR COMANDO
========================================================= */

async function copyCommand(command, button) {

    try {

        await navigator.clipboard.writeText(command)

        const original =
            button.textContent

        button.textContent =
            'COPIADO ✓'

        button.style.background =
            'white'

        button.style.color =
            'black'

        setTimeout(() => {

            button.textContent =
                original

            button.style.background =
                ''

            button.style.color =
                ''

        }, 1300)

        showToast('Comando copiado')

    } catch (error) {

        const textarea =
            document.createElement('textarea')

        textarea.value = command

        document.body.appendChild(textarea)

        textarea.select()

        document.execCommand('copy')

        textarea.remove()

        showToast('Comando copiado')
    }
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        document.getElementById('toast')

    toast.textContent =
        message

    toast.classList.add('show')

    clearTimeout(window.toastTimer)

    window.toastTimer =
        setTimeout(() => {

            toast.classList.remove('show')

        }, 1500)
}

/* =========================================================
   ESTADO
========================================================= */

async function updateStatus() {

    try {

        const response =
            await fetch('/status')

        const data =
            await response.json()

        document.getElementById(
            'statusCommands'
        ).textContent =
            data.commands

        document.getElementById(
            'statusUptime'
        ).textContent =
            data.uptimeFormatted

    } catch (error) {

        console.error(
            'STATUS:',
            error
        )
    }
}

updateStatus()

setInterval(
    updateStatus,
    5000
)

</script>

</body>
</html>`)
})

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {

    console.error('SERVER ERROR:', error)

    if (res.headersSent) {
        return next(error)
    }

    res.status(500).json({
        error: 'Error interno del servidor'
    })
})

/* =========================================================
   START
========================================================= */

app.listen(PORT, '0.0.0.0', () => {

    console.log('')
    console.log('────────────────────────────────────')
    console.log(`🚀 ${BOT_NAME}`)
    console.log(`🌐 PORT: ${PORT}`)
    console.log(`📚 COMMANDS: ${TOTAL_COMMANDS}`)
    console.log(`📂 CATEGORIES: ${TOTAL_CATEGORIES}`)
    console.log('────────────────────────────────────')
    console.log('')
})

module.exports = app