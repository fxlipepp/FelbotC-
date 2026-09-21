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

// ═══════════════════════════════════════════════
// COMANDOS
// ═══════════════════════════════════════════════

const COMMANDS = [

    {
        category: 'OWNER',
        icon: '👑',
        commands: [
            ['owner', 'Información del propietario'],
            ['menu', 'Muestra el menú principal'],
            ['ping', 'Comprueba la respuesta del bot'],
            ['speed', 'Muestra la velocidad del bot'],
            ['runtime', 'Muestra el tiempo activo'],
            ['restart', 'Reinicia el bot'],
            ['update', 'Actualiza el bot'],
            ['shutdown', 'Apaga el bot'],
            ['broadcast', 'Envía mensajes globales'],
            ['clearsession', 'Limpia la sesión']
        ]
    },

    {
        category: 'GENERAL',
        icon: '✦',
        commands: [
            ['menu', 'Muestra todos los comandos'],
            ['help', 'Ayuda del bot'],
            ['info', 'Información de Felbot'],
            ['botinfo', 'Información del sistema'],
            ['perfil', 'Muestra un perfil'],
            ['sticker', 'Convierte una imagen en sticker'],
            ['s', 'Crea un sticker'],
            ['toimg', 'Convierte sticker a imagen'],
            ['tts', 'Convierte texto a voz'],
            ['translate', 'Traduce textos'],
            ['weather', 'Consulta el clima'],
            ['qr', 'Genera un código QR'],
            ['readqr', 'Lee un código QR'],
            ['short', 'Acorta un enlace'],
            ['github', 'Consulta información de GitHub']
        ]
    },

    {
        category: 'UTILIDADES',
        icon: '⚙️',
        commands: [
            ['calculator', 'Calculadora'],
            ['calc', 'Realiza operaciones matemáticas'],
            ['google', 'Realiza una búsqueda'],
            ['search', 'Busca información'],
            ['wikipedia', 'Busca en Wikipedia'],
            ['define', 'Busca definiciones'],
            ['time', 'Consulta la hora'],
            ['date', 'Consulta la fecha'],
            ['country', 'Información de países'],
            ['ip', 'Información de una dirección IP'],
            ['url', 'Información de una URL'],
            ['ss', 'Captura una página web'],
            ['ocr', 'Reconoce texto de una imagen'],
            ['removebg', 'Elimina el fondo de una imagen']
        ]
    },

    {
        category: 'ADMIN',
        icon: '🛡️',
        commands: [
            ['antilink', 'Activa o desactiva el antienlace'],
            ['welcome', 'Configura el mensaje de bienvenida'],
            ['setwelcome', 'Establece el mensaje de bienvenida'],
            ['bye', 'Configura el mensaje de despedida'],
            ['setbye', 'Establece el mensaje de despedida'],
            ['tagall', 'Menciona a todos los miembros'],
            ['hidetag', 'Menciona a todos sin mostrar etiquetas'],
            ['tag', 'Menciona usuarios'],
            ['promote', 'Promueve a administrador'],
            ['demote', 'Quita administrador'],
            ['add', 'Agrega un usuario'],
            ['kick', 'Expulsa un usuario'],
            ['mute', 'Silencia el grupo'],
            ['unmute', 'Activa nuevamente el grupo'],
            ['open', 'Abre el grupo'],
            ['close', 'Cierra el grupo'],
            ['groupinfo', 'Información del grupo'],
            ['admins', 'Muestra los administradores'],
            ['link', 'Obtiene el enlace del grupo'],
            ['resetlink', 'Restablece el enlace'],
            ['setname', 'Cambia el nombre del grupo'],
            ['setdesc', 'Cambia la descripción'],
            ['setpp', 'Cambia la foto del grupo']
        ]
    },

    {
        category: 'FREE FIRE',
        icon: '🔥',
        commands: [
            ['ff', 'Información de Free Fire'],
            ['ffid', 'Consulta información de un jugador'],
            ['ffstats', 'Estadísticas de Free Fire'],
            ['ffprofile', 'Perfil de Free Fire'],
            ['ffrank', 'Consulta rango'],
            ['ffregion', 'Consulta región'],
            ['ffguild', 'Consulta información de gremio'],
            ['ffuid', 'Consulta datos mediante UID']
        ]
    },

    {
        category: 'STICKERS',
        icon: '🎨',
        commands: [
            ['sticker', 'Crea un sticker'],
            ['s', 'Crea un sticker'],
            ['stickerwm', 'Sticker con marca de agua'],
            ['toimg', 'Convierte sticker a imagen'],
            ['tovideo', 'Convierte sticker a video'],
            ['gif', 'Convierte contenido a GIF'],
            ['emojimix', 'Combina emojis'],
            ['steal', 'Obtiene un sticker']
        ]
    },

    {
        category: 'TEXTMAKER',
        icon: '✍️',
        commands: [
            ['textpro', 'Genera texto con efectos'],
            ['neon', 'Texto con efecto neón'],
            ['glitch', 'Texto con efecto glitch'],
            ['metal', 'Texto estilo metal'],
            ['fire', 'Texto con efecto fuego'],
            ['ice', 'Texto con efecto hielo'],
            ['gold', 'Texto dorado'],
            ['blackpink', 'Texto estilo Blackpink'],
            ['matrix', 'Texto estilo Matrix'],
            ['graffiti', 'Texto estilo graffiti'],
            ['typography', 'Genera tipografías']
        ]
    },

    {
        category: 'ANIME',
        icon: '🌸',
        commands: [
            ['anime', 'Información de anime'],
            ['waifu', 'Obtiene una waifu aleatoria'],
            ['neko', 'Obtiene una imagen neko'],
            ['maid', 'Obtiene una imagen maid'],
            ['megumin', 'Contenido de Megumin'],
            ['akira', 'Contenido anime'],
            ['shinobu', 'Contenido de Shinobu'],
            ['cosplay', 'Obtiene contenido cosplay']
        ]
    },

    {
        category: 'JUEGOS',
        icon: '🎮',
        commands: [
            ['ppt', 'Piedra, papel o tijera'],
            ['trivia', 'Juego de preguntas'],
            ['quiz', 'Preguntas aleatorias'],
            ['adivina', 'Adivina la palabra'],
            ['matematicas', 'Reto matemático'],
            ['memoria', 'Juego de memoria'],
            ['dado', 'Lanza un dado'],
            ['moneda', 'Lanza una moneda'],
            ['8ball', 'Bola mágica'],
            ['verdad', 'Verdad'],
            ['reto', 'Reto']
        ]
    },

    {
        category: 'DIVERSIÓN',
        icon: '🎭',
        commands: [
            ['ship', 'Calcula compatibilidad'],
            ['love', 'Calcula porcentaje de amor'],
            ['rate', 'Califica algo'],
            ['meme', 'Genera un meme'],
            ['joke', 'Cuenta un chiste'],
            ['fact', 'Dato curioso'],
            ['quote', 'Frase aleatoria'],
            ['motivacion', 'Frase motivacional']
        ]
    },

    {
        category: 'DESCARGAS',
        icon: '↓',
        commands: [
            ['play', 'Busca y descarga contenido'],
            ['instagram', 'Descarga contenido de Instagram'],
            ['facebook', 'Descarga contenido de Facebook'],
            ['tiktok', 'Descarga videos de TikTok'],
            ['mediafire', 'Descarga archivos de MediaFire'],
            ['twitter', 'Descarga contenido de X/Twitter'],
            ['pinterest', 'Descarga imágenes de Pinterest']
        ]
    }
]

const TOTAL_COMMANDS = COMMANDS.reduce(
    (total, category) =>
        total + category.commands.length,
    0
)

const TOTAL_CATEGORIES = COMMANDS.length

// ═══════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════

function formatUptime(ms) {

    const totalSeconds =
        Math.floor(ms / 1000)

    const days =
        Math.floor(totalSeconds / 86400)

    const hours =
        Math.floor(
            (totalSeconds % 86400) / 3600
        )

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        )

    const seconds =
        totalSeconds % 60

    const parts = []

    if (days) parts.push(`${days}d`)
    if (hours) parts.push(`${hours}h`)
    if (minutes) parts.push(`${minutes}m`)

    if (
        seconds ||
        !parts.length
    ) {
        parts.push(`${seconds}s`)
    }

    return parts.join(' ')
}

function safeJson(value) {

    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')

}

// ═══════════════════════════════════════════════
// BROWSER
// ═══════════════════════════════════════════════

let browser = null
let browserPage = null

async function startBrowser() {

    try {

        browser = await puppeteer.launch({

            headless: true,

            userDataDir:
                '/home/container/chrome-profile',

            executablePath:
                process.env.PUPPETEER_EXECUTABLE_PATH ||
                undefined,

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

        browserPage =
            await browser.newPage()

        await browserPage.setViewport({
            width: 1280,
            height: 900
        })

        await browserPage.goto(
            'about:blank',
            {
                waitUntil:
                    'domcontentloaded'
            }
        )

        console.log(
            '🌐 Browser remoto iniciado'
        )

    } catch (error) {

        console.error(
            '❌ Error iniciando browser:',
            error.message
        )

    }

}

// ═══════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════

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

app.get('/status', (req, res) => {

    const browserOnline =
        browserPage &&
        !browserPage.isClosed()

    res.json({

        status: 'online',

        bot: BOT_NAME,

        creator: CREATOR,

        version: VERSION,

        uptime:
            Date.now() - START_TIME,

        uptimeFormatted:
            formatUptime(
                Date.now() - START_TIME
            ),

        commands:
            TOTAL_COMMANDS,

        categories:
            TOTAL_CATEGORIES,

        browser:
            browserOnline
                ? 'online'
                : 'offline',

        time:
            new Date().toISOString()

    })

})

// ═══════════════════════════════════════════════
// BROWSER
// ═══════════════════════════════════════════════

app.get('/browser', (req, res) => {

    res.send(`<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
>

<title>Felbot Browser</title>

<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    background: #080808;

    color: white;

    font-family:
        Arial,
        sans-serif;

}

.toolbar {

    height: 62px;

    display: flex;

    align-items: center;

    gap: 8px;

    padding: 10px 14px;

    background: #111;

    border-bottom:
        1px solid #292929;

}

button {

    background: #181818;

    color: #eee;

    border:
        1px solid #303030;

    border-radius: 8px;

    padding:
        10px 13px;

    cursor: pointer;

}

button:hover {
    background: #222;
}

.address {

    flex: 1;

    background: #0d0d0d;

    border:
        1px solid #2a2a2a;

    color: #aaa;

    border-radius: 8px;

    padding:
        11px 13px;

    outline: none;

}

#screen {

    display: block;

    width: 100%;

    min-height:
        calc(100vh - 62px);

    object-fit: contain;

    background: #050505;

}

</style>

</head>

<body>

<div class="toolbar">

<button onclick="goBack()">←</button>

<button onclick="goForward()">→</button>

<button onclick="reloadPage()">↻</button>

<input
    id="address"
    class="address"
    value="about:blank"
    onkeydown="handleAddress(event)"
>

<button onclick="goAddress()">
    Ir
</button>

</div>

<img
    id="screen"
    src="/browser/screenshot"
>

<script>

const screen =
    document.getElementById('screen')

const address =
    document.getElementById('address')

function refreshScreen() {

    screen.src =
        '/browser/screenshot?t=' +
        Date.now()

}

async function reloadPage() {

    await fetch(
        '/browser/reload',
        {
            method: 'POST'
        }
    )

    setTimeout(
        refreshScreen,
        1000
    )

}

async function goBack() {

    await fetch(
        '/browser/back',
        {
            method: 'POST'
        }
    )

    setTimeout(
        refreshScreen,
        1000
    )

}

async function goForward() {

    await fetch(
        '/browser/forward',
        {
            method: 'POST'
        }
    )

    setTimeout(
        refreshScreen,
        1000
    )

}

async function goAddress() {

    const url =
        address.value.trim()

    if (!url) return

    await fetch(
        '/browser/navigate',
        {

            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body:
                JSON.stringify({
                    url
                })

        }
    )

    setTimeout(
        refreshScreen,
        1800
    )

}

function handleAddress(event) {

    if (
        event.key === 'Enter'
    ) {
        goAddress()
    }

}

setInterval(
    refreshScreen,
    2500
)

</script>

</body>

</html>`)

})

// ═══════════════════════════════════════════════
// BROWSER SCREENSHOT
// ═══════════════════════════════════════════════

app.get(
    '/browser/screenshot',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .send(
                        'Browser offline'
                    )

            }

            const image =
                await browserPage.screenshot({
                    type: 'png',
                    fullPage: false
                })

            res.setHeader(
                'Content-Type',
                'image/png'
            )

            res.send(image)

        } catch (error) {

            res.status(500).send(
                'Error capturando pantalla'
            )

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER NAVIGATE
// ═══════════════════════════════════════════════

app.post(
    '/browser/navigate',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            let url =
                String(
                    req.body.url || ''
                ).trim()

            if (!url) {

                return res
                    .status(400)
                    .json({
                        error:
                            'URL requerida'
                    })

            }

            if (
                !url.startsWith('http://') &&
                !url.startsWith('https://')
            ) {

                url =
                    'https://' + url

            }

            await browserPage.goto(
                url,
                {
                    waitUntil:
                        'domcontentloaded',
                    timeout: 30000
                }
            )

            res.json({
                ok: true,
                url:
                    browserPage.url()
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER CLICK
// ═══════════════════════════════════════════════

app.post(
    '/browser/click',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            const {
                x,
                y
            } = req.body

            await browserPage.mouse.click(
                Number(x),
                Number(y)
            )

            res.json({
                ok: true
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER TYPE
// ═══════════════════════════════════════════════

app.post(
    '/browser/type',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            await browserPage.keyboard.type(
                String(
                    req.body.text || ''
                )
            )

            res.json({
                ok: true
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER KEY
// ═══════════════════════════════════════════════

app.post(
    '/browser/key',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            await browserPage.keyboard.press(
                String(
                    req.body.key || ''
                )
            )

            res.json({
                ok: true
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER RELOAD
// ═══════════════════════════════════════════════

app.post(
    '/browser/reload',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            await browserPage.reload({
                waitUntil:
                    'domcontentloaded',
                timeout: 30000
            })

            res.json({
                ok: true,
                url:
                    browserPage.url()
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER BACK
// ═══════════════════════════════════════════════

app.post(
    '/browser/back',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            await browserPage.goBack({
                waitUntil:
                    'domcontentloaded',
                timeout: 30000
            })

            res.json({
                ok: true,
                url:
                    browserPage.url()
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// BROWSER FORWARD
// ═══════════════════════════════════════════════

app.post(
    '/browser/forward',
    async (req, res) => {

        try {

            if (
                !browserPage ||
                browserPage.isClosed()
            ) {

                return res
                    .status(503)
                    .json({
                        error:
                            'Browser offline'
                    })

            }

            await browserPage.goForward({
                waitUntil:
                    'domcontentloaded',
                timeout: 30000
            })

            res.json({
                ok: true,
                url:
                    browserPage.url()
            })

        } catch (error) {

            res.status(500).json({
                error:
                    error.message
            })

        }

    }
)

// ═══════════════════════════════════════════════
// WEB PRINCIPAL
// ═══════════════════════════════════════════════

app.get('/', (req, res) => {

    res.send(`<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<meta
    name="description"
    content="𝕱𝖊𝖑𝖇𝖔𝖙 夜 — WhatsApp Bot creado por Fxlipe 夜."
>

<title>𝕱𝖊𝖑𝖇𝖔𝖙 夜 — Official</title>

<link
    rel="preconnect"
    href="https://fonts.googleapis.com"
>

<link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin
>

<link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap"
    rel="stylesheet"
>

<style>

:root {
    --bg: #070707;
    --card: rgba(18,18,18,.72);
    --line: rgba(255,255,255,.09);
    --line2: rgba(255,255,255,.14);
    --text: #f2f2f2;
    --muted: #8d8d8d;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
}

body {

    min-height: 100vh;

    color: var(--text);

    background:
        radial-gradient(
            circle at 50% -10%,
            rgba(255,255,255,.07),
            transparent 34%
        ),
        var(--bg);

    font-family: Inter, sans-serif;

    overflow-x: hidden;

}

body::before {

    content: "";

    position: fixed;

    inset: 0;

    pointer-events: none;

    opacity: .34;

    background-image:
        linear-gradient(
            rgba(255,255,255,.025) 1px,
            transparent 1px
        ),
        linear-gradient(
            90deg,
            rgba(255,255,255,.025) 1px,
            transparent 1px
        );

    background-size: 44px 44px;

}

a {
    color: inherit;
    text-decoration: none;
}

.container {

    width:
        min(
            1180px,
            calc(100% - 40px)
        );

    margin: auto;

}

/* NAV */

.navbar {

    position: fixed;

    top: 0;
    left: 0;
    right: 0;

    height: 74px;

    z-index: 100;

    background:
        rgba(7,7,7,.72);

    backdrop-filter:
        blur(18px);

    border-bottom:
        1px solid var(--line);

}

.nav-inner {

    height: 100%;

    display: flex;

    align-items: center;

    justify-content: space-between;

}

.brand {

    font-family:
        "Playfair Display",
        serif;

    font-size: 21px;

}

.brand span {
    color: #777;
}

.nav-links {

    display: flex;

    gap: 28px;

    color: #888;

    font-size: 13px;

}

.nav-links a:hover {
    color: white;
}

/* HERO */

.hero {

    min-height: 760px;

    display: flex;

    align-items: center;

    text-align: center;

    padding-top: 80px;

}

.hero-content {

    width: 100%;

    max-width: 850px;

    margin: auto;

}

.eyebrow {

    display: inline-flex;

    align-items: center;

    gap: 9px;

    padding: 8px 13px;

    border:
        1px solid var(--line2);

    border-radius: 999px;

    color: #aaa;

    font-size: 11px;

    letter-spacing: 2px;

}

.status-dot {

    width: 7px;
    height: 7px;

    border-radius: 50%;

    background: #ddd;

    box-shadow:
        0 0 10px
        rgba(255,255,255,.45);

}

.hero h1 {

    margin-top: 27px;

    font-family:
        "Playfair Display",
        serif;

    font-size:
        clamp(
            65px,
            12vw,
            150px
        );

    line-height: .9;

    letter-spacing: -5px;

}

.hero h1 span {
    color: #777;
}

.hero-subtitle {

    margin-top: 18px;

    color: #b5b5b5;

    font-size: 16px;

    letter-spacing: 2px;

    text-transform: uppercase;

}

.hero-text {

    max-width: 650px;

    margin:
        25px auto 0;

    color: #858585;

    font-size: 16px;

    line-height: 1.8;

}

.hero-actions {

    display: flex;

    justify-content: center;

    gap: 12px;

    flex-wrap: wrap;

    margin-top: 32px;

}

.btn {

    display: inline-flex;

    align-items: center;

    justify-content: center;

    min-height: 46px;

    padding:
        0 20px;

    border-radius: 9px;

    font-size: 13px;

    transition: .2s;

}

.btn:hover {
    transform: translateY(-2px);
}

.btn-primary {

    background: #f2f2f2;

    color: #080808;

}

.btn-secondary {

    border:
        1px solid var(--line2);

    color: #ddd;

    background:
        rgba(255,255,255,.025);

}

/* SECTIONS */

section {
    padding: 110px 0;
}

.section-head {
    margin-bottom: 42px;
}

.section-kicker {

    color: #777;

    font-size: 11px;

    letter-spacing: 3px;

    text-transform: uppercase;

    margin-bottom: 12px;

}

.section-title {

    font-family:
        "Playfair Display",
        serif;

    font-size:
        clamp(34px,5vw,58px);

}

.section-description {

    max-width: 650px;

    color: #777;

    margin-top: 14px;

    line-height: 1.7;

}

/* FUNCIONES */

.features {

    display: grid;

    grid-template-columns:
        repeat(3,1fr);

    gap: 15px;

}

.feature {

    padding: 28px;

    min-height: 190px;

    border:
        1px solid var(--line);

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.045),
            rgba(255,255,255,.012)
        );

    border-radius: 16px;

    transition: .25s;

}

.feature:hover {

    border-color:
        rgba(255,255,255,.18);

    transform:
        translateY(-3px);

}

.feature-icon {

    width: 42px;
    height: 42px;

    display: flex;

    align-items: center;
    justify-content: center;

    border:
        1px solid var(--line2);

    border-radius: 10px;

    margin-bottom: 22px;

}

.feature h3 {

    font-size: 16px;

    margin-bottom: 9px;

}

.feature p {

    color: #777;

    font-size: 13px;

    line-height: 1.7;

}

/* COMANDOS */

.commands-wrap {

    border:
        1px solid var(--line);

    border-radius: 18px;

    overflow: hidden;

    background:
        rgba(12,12,12,.75);

}

.command-toolbar {

    display: flex;

    flex-direction: column;

    gap: 12px;

    padding: 18px;

    border-bottom:
        1px solid var(--line);

}

.search {

    width: 100%;

    height: 46px;

    border:
        1px solid var(--line);

    background:
        #090909;

    color: white;

    border-radius: 9px;

    padding:
        0 15px;

    outline: none;

}

.search:focus {

    border-color:
        rgba(255,255,255,.25);

}

.filters {

    display: flex;

    gap: 7px;

    overflow-x: auto;

    padding-bottom: 2px;

}

.filter {

    white-space: nowrap;

    border:
        1px solid var(--line);

    background:
        #0b0b0b;

    color: #777;

    border-radius: 8px;

    padding:
        10px 13px;

    cursor: pointer;

    font-size: 12px;

}

.filter.active {

    background: #eee;

    color: #080808;

    border-color: #eee;

}

.commands-grid {

    display: grid;

    grid-template-columns:
        repeat(3,1fr);

    gap: 1px;

    background:
        var(--line);

}

.command-card {

    position: relative;

    padding: 20px;

    background:
        #0d0d0d;

    min-height: 115px;

    transition: .2s;

}

.command-card:hover {

    background:
        #111;

}

.command-category {

    color: #555;

    font-size: 10px;

    letter-spacing: 1.5px;

    text-transform: uppercase;

    margin-bottom: 8px;

}

.command-name {

    color: #eee;

    font-weight: 600;

    font-size: 14px;

}

.command-description {

    color: #777;

    font-size: 12px;

    line-height: 1.6;

    margin-top: 8px;

}

.copy-btn {

    position: absolute;

    right: 14px;

    top: 14px;

    border:
        1px solid var(--line);

    background:
        transparent;

    color: #666;

    border-radius: 6px;

    padding:
        5px 7px;

    cursor: pointer;

    font-size: 9px;

}

.copy-btn:hover {
    color: white;
}

/* STATUS */

.status-grid {

    display: grid;

    grid-template-columns:
        repeat(4,1fr);

    gap: 12px;

}

.status-card {

    padding: 23px;

    border:
        1px solid var(--line);

    border-radius: 14px;

    background:
        rgba(255,255,255,.02);

}

.status-label {

    color: #666;

    font-size: 11px;

    text-transform: uppercase;

    letter-spacing: 1.5px;

}

.status-value {

    margin-top: 9px;

    font-size: 17px;

    color: #ddd;

}

/* CREATOR */

.creator {

    display: grid;

    grid-template-columns:
        1.2fr .8fr;

    gap: 35px;

    align-items: center;

}

.creator-card {

    padding: 35px;

    border:
        1px solid var(--line);

    border-radius: 18px;

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.04),
            rgba(255,255,255,.01)
        );

}

.creator-name {

    font-family:
        "Playfair Display",
        serif;

    font-size: 35px;

}

.creator-role {

    color: #777;

    margin-top: 7px;

}

.socials {

    display: flex;

    gap: 10px;

    flex-wrap: wrap;

    margin-top: 25px;

}

.social {

    border:
        1px solid var(--line);

    border-radius: 8px;

    padding:
        10px 14px;

    color: #aaa;

    font-size: 12px;

    transition: .2s;

}

.social:hover {

    color: white;

    border-color:
        rgba(255,255,255,.25);

}

/* FOOTER */

footer {

    border-top:
        1px solid var(--line);

    padding: 35px 0;

}

.footer-inner {

    display: flex;

    justify-content: space-between;

    align-items: center;

    gap: 20px;

}

.footer-brand {

    font-family:
        "Playfair Display",
        serif;

    font-size: 18px;

}

.footer-info {

    color: #555;

    font-size: 11px;

    margin-top: 5px;

}

.footer-socials {

    display: flex;

    gap: 18px;

    align-items: center;

}

.footer-socials a {

    color: #777;

    font-size: 12px;

}

.footer-socials a:hover {
    color: white;
}

/* RESPONSIVE */

@media(max-width:900px) {

    .features {
        grid-template-columns: 1fr;
    }

    .commands-grid {
        grid-template-columns:
            repeat(2,1fr);
    }

    .status-grid {
        grid-template-columns:
            repeat(2,1fr);
    }

    .creator {
        grid-template-columns: 1fr;
    }

}

@media(max-width:650px) {

    .container {

        width:
            calc(100% - 26px);

    }

    .nav-links {
        display: none;
    }

    .hero {
        min-height: 650px;
    }

    .hero h1 {
        letter-spacing: -3px;
    }

    section {
        padding: 80px 0;
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

}

</style>

</head>

<body>

<!-- NAV -->

<nav class="navbar">

<div class="container nav-inner">

<a href="/" class="brand">
    𝕱𝖊𝖑𝖇𝖔𝖙 <span>夜</span>
</a>

<div class="nav-links">

<a href="#funciones">
    Funciones
</a>

<a href="#comandos">
    Comandos
</a>

<a href="#estado">
    Estado
</a>

<a href="#creador">
    Creador
</a>

<a href="/browser">
    Browser
</a>

</div>

</div>

</nav>


<!-- HERO -->

<header class="hero">

<div class="container hero-content">

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
utilidades y mucho más dentro de tus grupos.

</p>

<div class="hero-actions">

<a
    href="#comandos"
    class="btn btn-primary"
>
    Explorar comandos
</a>

<a
    href="#funciones"
    class="btn btn-secondary"
>
    Conocer Felbot
</a>

</div>

<div
    class="hero-actions"
    style="margin-top:28px;"
>

<a
    href="https://wa.me/573117354305"
    target="_blank"
    rel="noopener noreferrer"
    class="btn btn-primary"
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

</header>


<!-- FUNCIONES -->

<section id="funciones">

<div class="container">

<div class="section-head">

<div class="section-kicker">
    Características
</div>

<h2 class="section-title">
    Todo en un solo lugar.
</h2>

<p class="section-description">

Felbot reúne herramientas para administrar
comunidades, divertirse, automatizar tareas
y aprovechar diferentes utilidades desde
WhatsApp.

</p>

</div>


<div class="features">

<div class="feature">

<div class="feature-icon">
    🛡️
</div>

<h3>
    Administración
</h3>

<p>
    Herramientas para moderar grupos,
    gestionar miembros y configurar
    diferentes opciones.
</p>

</div>


<div class="feature">

<div class="feature-icon">
    🎮
</div>

<h3>
    Entretenimiento
</h3>

<p>
    Juegos, retos, preguntas, memes,
    frases y dinámicas para tus grupos.
</p>

</div>


<div class="feature">

<div class="feature-icon">
    🧰
</div>

<h3>
    Utilidades
</h3>

<p>
    Herramientas para búsquedas,
    conversiones, información y
    diferentes tareas.
</p>

</div>


<div class="feature">

<div class="feature-icon">
    🎨
</div>

<h3>
    Creatividad
</h3>

<p>
    Stickers, imágenes, efectos de
    texto y diferentes herramientas
    creativas.
</p>

</div>


<div class="feature">

<div class="feature-icon">
    🔥
</div>

<h3>
    Free Fire
</h3>

<p>
    Consulta información y estadísticas
    relacionadas con jugadores y perfiles.
</p>

</div>


<div class="feature">

<div class="feature-icon">
    ⚡
</div>

<h3>
    Sistema Felbot
</h3>

<p>
    Una experiencia sencilla y práctica
    con comandos fáciles de utilizar.
</p>

</div>

</div>

</div>

</section>


<!-- COMANDOS -->

<section id="comandos">

<div class="container">

<div class="section-head">

<div class="section-kicker">
    Command Center
</div>

<h2 class="section-title">
    Comandos
</h2>

<p class="section-description">

Explora las herramientas disponibles
en Felbot. Usa el prefijo
<strong>.</strong> antes de cada comando.

</p>

</div>


<div class="commands-wrap">

<div class="command-toolbar">

<input
    id="search"
    class="search"
    type="text"
    placeholder="Buscar comando..."
    autocomplete="off"
>

<div
    id="filters"
    class="filters"
></div>

</div>


<div
    id="commandsGrid"
    class="commands-grid"
></div>

</div>

</div>

</section>


<!-- ESTADO -->

<section id="estado">

<div class="container">

<div class="section-head">

<div class="section-kicker">
    System
</div>

<h2 class="section-title">
    Estado del sistema
</h2>

<p class="section-description">
    Información actual del servicio Felbot.
</p>

</div>


<div class="status-grid">

<div class="status-card">

<div class="status-label">
    Estado
</div>

<div
    id="status"
    class="status-value"
>
    Comprobando...
</div>

</div>


<div class="status-card">

<div class="status-label">
    Uptime
</div>

<div
    id="uptime"
    class="status-value"
>
    —
</div>

</div>


<div class="status-card">

<div class="status-label">
    Comandos
</div>

<div
    id="commandCount"
    class="status-value"
>
    ${TOTAL_COMMANDS}
</div>

</div>


<div class="status-card">

<div class="status-label">
    Versión
</div>

<div
    id="version"
    class="status-value"
>
    ${VERSION}
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

Felbot es un proyecto desarrollado
para crear una experiencia completa
de herramientas y entretenimiento
directamente desde WhatsApp.

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


<script>

const COMMAND_DATA =
${safeJson(COMMANDS)}

let currentCategory = 'TODOS'

const searchInput =
    document.getElementById('search')

const filters =
    document.getElementById('filters')

const commandsGrid =
    document.getElementById('commandsGrid')


// FILTROS

function createFilters() {

    filters.innerHTML = ''

    const all =
        document.createElement('button')

    all.className =
        'filter active'

    all.textContent =
        'Todos'

    all.onclick = () => {

        currentCategory = 'TODOS'

        document
            .querySelectorAll('.filter')
            .forEach(
                btn =>
                    btn.classList.remove(
                        'active'
                    )
            )

        all.classList.add('active')

        renderCommands()

    }

    filters.appendChild(all)


    COMMAND_DATA.forEach(category => {

        const button =
            document.createElement('button')

        button.className =
            'filter'

        button.textContent =
            category.icon +
            ' ' +
            category.category

        button.onclick = () => {

            currentCategory =
                category.category

            document
                .querySelectorAll('.filter')
                .forEach(
                    btn =>
                        btn.classList.remove(
                            'active'
                        )
                )

            button.classList.add('active')

            renderCommands()

        }

        filters.appendChild(button)

    })

}


// RENDER COMANDOS

function renderCommands() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase()

    let result = []

    COMMAND_DATA.forEach(category => {

        if (
            currentCategory !== 'TODOS' &&
            category.category !== currentCategory
        ) {
            return
        }

        category.commands.forEach(command => {

            const name =
                command[0]

            const description =
                command[1]

            if (
                !query ||
                name
                    .toLowerCase()
                    .includes(query) ||
                description
                    .toLowerCase()
                    .includes(query) ||
                category.category
                    .toLowerCase()
                    .includes(query)
            ) {

                result.push({
                    category,
                    name,
                    description
                })

            }

        })

    })


    commandsGrid.innerHTML = ''


    if (!result.length) {

        commandsGrid.innerHTML = \`
            <div
                style="
                    grid-column:1/-1;
                    padding:50px;
                    text-align:center;
                    color:#666;
                "
            >
                No se encontraron comandos.
            </div>
        \`

        return

    }


    result.forEach(item => {

        const card =
            document.createElement('article')

        card.className =
            'command-card'

        card.innerHTML = \`

            <div class="command-category">
                \${escapeClient(
                    item.category.category
                )}
            </div>

            <div class="command-name">
                .\${escapeClient(item.name)}
            </div>

            <div class="command-description">
                \${escapeClient(
                    item.description
                )}
            </div>

            <button
                class="copy-btn"
                onclick="copyCommand('.\${escapeClient(item.name)}')"
            >
                COPIAR
            </button>

        \`

        commandsGrid.appendChild(card)

    })

}


function escapeClient(value) {

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

}


// COPIAR

async function copyCommand(command) {

    try {

        await navigator.clipboard.writeText(
            command
        )

        const old =
            event &&
            event.target
                ? event.target.textContent
                : null

        if (
            event &&
            event.target
        ) {

            event.target.textContent =
                'COPIADO'

            setTimeout(() => {

                event.target.textContent =
                    old || 'COPIAR'

            }, 1200)

        }

    } catch {

        alert(command)

    }

}


// BUSCADOR

searchInput.addEventListener(
    'input',
    renderCommands
)


// STATUS

async function updateStatus() {

    try {

        const response =
            await fetch(
                '/status?t=' +
                Date.now()
            )

        const data =
            await response.json()


        document.getElementById(
            'status'
        ).textContent =
            data.status === 'online'
                ? 'Online'
                : 'Offline'


        document.getElementById(
            'uptime'
        ).textContent =
            data.uptimeFormatted || '—'


        document.getElementById(
            'commandCount'
        ).textContent =
            data.commands || '${TOTAL_COMMANDS}'


        document.getElementById(
            'version'
        ).textContent =
            data.version || '${VERSION}'


    } catch {

        document.getElementById(
            'status'
        ).textContent =
            'Sin conexión'

    }

}


createFilters()

renderCommands()

updateStatus()

setInterval(
    updateStatus,
    5000
)

</script>

</body>

</html>`)

})

// ═══════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════

app.listen(
    PORT,
    '0.0.0.0',
    async () => {

        console.log('')
        console.log(
            '╭──────────────────────────────╮'
        )
        console.log(
            '│       𝕱𝖊𝖑𝖇𝖔𝖙 夜 SERVER       │'
        )
        console.log(
            '├──────────────────────────────┤'
        )
        console.log(
            `│ 🌐 PORT: ${PORT}`
        )
        console.log(
            `│ 🤖 BOT: ${BOT_NAME}`
        )
        console.log(
            `│ 👤 CREATOR: ${CREATOR}`
        )
        console.log(
            `│ 📦 VERSION: ${VERSION}`
        )
        console.log(
            `│ ⚡ COMMANDS: ${TOTAL_COMMANDS}`
        )
        console.log(
            `│ 📂 CATEGORIES: ${TOTAL_CATEGORIES}`
        )
        console.log(
            '╰──────────────────────────────╯'
        )
        console.log('')

        await startBrowser()

    }
)