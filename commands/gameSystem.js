const User = require('../models/User')

const activeGames = new Map()
const cooldowns = new Map()
const GAME_TTL = 5 * 60 * 1000
const INDIVIDUAL_COOLDOWN = 5000
const COMPETITIVE_COOLDOWN = 10000

const answers8Ball = [
    'Las estrellas dicen que sí.', 'Todo apunta a que sí.', 'Sí, pero tendrás que intentarlo.',
    'La suerte está de tu lado.', 'Probablemente sí.', 'Hay buenas señales.',
    'El futuro se ve prometedor.', 'Sin duda, sí.', 'Puede que sí, puede que no.',
    'La respuesta está en movimiento.', 'Pregúntame después.', 'No está claro todavía.',
    'Las probabilidades están equilibradas.', 'El destino guarda silencio.', 'Tal vez con un poco de suerte.',
    'No cuentes con ello.', 'Las señales no son buenas.', 'Probablemente no.',
    'Hoy no parece tu día.', 'La respuesta es no.', 'Ni el algoritmo lo sabe.',
    'Mi bola mágica necesita vacaciones.', 'Eso sonó peligroso, mejor no.', 'Pregunta algo menos complicado.',
    'El universo dejó el mensaje en visto.', 'Solo si compartes tus papas.', 'La bola dice: siguiente pregunta.',
    'Hay un 50% de posibilidades... como siempre.', 'Eso depende de tu nivel de drama.', 'Hasta Cupido está confundido.'
]

const quizQuestions = [
    { question: 'Cual es la capital de Colombia?', options: ['Medellin', 'Bogota', 'Cali', 'Cartagena'], answer: 2, category: 'Cultura general', difficulty: 'facil' },
    { question: 'Que planeta es conocido como el planeta rojo?', options: ['Venus', 'Marte', 'Jupiter', 'Saturno'], answer: 2, category: 'Ciencia', difficulty: 'facil' },
    { question: 'En que ano llego el ser humano a la Luna?', options: ['1959', '1969', '1979', '1989'], answer: 2, category: 'Historia', difficulty: 'facil' },
    { question: 'Cuantos jugadores tiene un equipo de futbol en cancha?', options: ['9', '10', '11', '12'], answer: 3, category: 'Deportes', difficulty: 'facil' },
    { question: 'Que personaje usa una espada llamada Master Sword?', options: ['Mario', 'Link', 'Sonic', 'Kirby'], answer: 2, category: 'Videojuegos', difficulty: 'facil' },
    { question: 'Como se llama el protagonista de Naruto?', options: ['Ichigo', 'Luffy', 'Naruto', 'Goku'], answer: 3, category: 'Anime', difficulty: 'facil' },
    { question: 'Quien interpreto Thriller?', options: ['Prince', 'Michael Jackson', 'Elvis Presley', 'Bruno Mars'], answer: 2, category: 'Musica', difficulty: 'facil' },
    { question: 'Que lenguaje se ejecuta principalmente en el navegador?', options: ['JavaScript', 'Python', 'C++', 'Rust'], answer: 1, category: 'Tecnologia', difficulty: 'facil' },
    { question: 'Cual es el oceano mas grande?', options: ['Atlantico', 'Indico', 'Pacifico', 'Artico'], answer: 3, category: 'Cultura general', difficulty: 'facil' },
    { question: 'Cuanto es 2 elevado a 5?', options: ['10', '16', '25', '32'], answer: 4, category: 'Ciencia', difficulty: 'facil' }
]

const guessWords = {
    animal: [
        { word: 'delfin', hint: 'Vive principalmente en el agua.' },
        { word: 'elefante', hint: 'Tiene una trompa muy larga.' },
        { word: 'aguila', hint: 'Vuela y tiene una vista extraordinaria.' }
    ],
    personaje: [
        { word: 'superman', hint: 'Vuela y viene de otro planeta.' },
        { word: 'pikachu', hint: 'Es amarillo y lanza electricidad.' },
        { word: 'goku', hint: 'Es un guerrero saiyan.' }
    ],
    objeto: [
        { word: 'telefono', hint: 'Sirve para comunicarse a distancia.' },
        { word: 'reloj', hint: 'Indica la hora.' },
        { word: 'mochila', hint: 'Se lleva en la espalda.' }
    ],
    comida: [
        { word: 'pizza', hint: 'Tiene forma redonda y suele llevar queso.' },
        { word: 'taco', hint: 'Es una comida muy popular de Mexico.' },
        { word: 'hamburguesa', hint: 'Lleva un pan redondo y una carne en medio.' }
    ]
}

function key(chatId, userId) { return `${chatId}:${userId}` }
function mention(id) { return `@${String(id).split('@')[0]}` }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)] }
function normalize(value) { return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function groupOnly(chatId) { return String(chatId).endsWith('@g.us') }
function getMentions(message) { return message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [] }
function send(sock, chatId, text, msg, mentions = []) { return sock.sendMessage(chatId, { text, ...(mentions.length ? { mentions } : {}) }, msg ? { quoted: msg } : undefined) }
function expired(game) { return Date.now() - game.updatedAt > GAME_TTL }
function cleanupGames() {
    for (const [gameKey, game] of activeGames) if (expired(game)) activeGames.delete(gameKey)
}
setInterval(cleanupGames, 60 * 1000).unref()

async function updateStats(userId, values) {
    try {
        if (User.db.readyState !== 1) return
        await User.updateOne(
            { userId },
            { $setOnInsert: { userId }, $inc: values },
            { upsert: true }
        )
    } catch (error) {
        console.error('Error updating game statistics:', error.message)
    }
}

async function getStats(userId) {
    try {
        if (User.db.readyState !== 1) return { xp: 0, wins: 0, losses: 0, draws: 0, games: 0 }
        const user = await User.findOne({ userId }).lean()
        return { xp: user?.xp || 0, wins: user?.wins || 0, losses: user?.losses || 0, draws: user?.draws || 0, games: user?.games || 0 }
    } catch (error) {
        console.error('Error reading game statistics:', error.message)
        return { xp: 0, wins: 0, losses: 0, draws: 0, games: 0 }
    }
}

function canPlay(chatId, userId, type, competitive = false) {
    const cooldownKey = key(chatId, `${type}:${userId}`)
    const until = cooldowns.get(cooldownKey) || 0
    if (until > Date.now()) return Math.ceil((until - Date.now()) / 1000)
    cooldowns.set(cooldownKey, Date.now() + (competitive ? COMPETITIVE_COOLDOWN : INDIVIDUAL_COOLDOWN))
    return 0
}

function pairStatsText(first, second, percentage, phrase) {
    const filled = Math.floor(percentage / 10)
    return `@${first.split('@')[0]} ❤️ @${second.split('@')[0]}\n💗 Compatibilidad: [ ${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ] ${percentage}%\n✨ ${phrase}`
}

async function pptCommand(sock, chatId, senderId, msg) {
    if (!groupOnly(chatId)) return send(sock, chatId, '❌ Este juego solo funciona en grupos.', msg)
    const mentions = getMentions(msg)
    const choice = normalize(msg.message?.conversation || msg.message?.extendedTextMessage?.text).split(/\s+/).pop()
    const choices = { piedra: '🪨', papel: '📄', tijera: '✂️' }
    const gameKey = `ppt:${chatId}`
    let game = activeGames.get(gameKey)
    if (mentions.length) {
        if (mentions[0] === senderId) return send(sock, chatId, '❌ No puedes jugar contra ti mismo.', msg)
        if (game) return send(sock, chatId, '⏳ Ya hay un duelo de PPT activo en este grupo.', msg)
        game = { type: 'ppt', players: [senderId, mentions[0]], choices: {}, updatedAt: Date.now() }
        activeGames.set(gameKey, game)
        return send(sock, chatId, `✊✋✌️ *PPT iniciado*\n${mention(senderId)} vs ${mention(mentions[0])}\n\nCada jugador escribe: .ppt piedra, .ppt papel o .ppt tijera`, msg, game.players)
    }
    if (!choices[choice] || !game || !game.players.includes(senderId)) return send(sock, chatId, '❌ Usa `.ppt @usuario` para iniciar o elige piedra, papel o tijera.', msg)
    game.choices[senderId] = choice
    game.updatedAt = Date.now()
    if (Object.keys(game.choices).length < 2) return send(sock, chatId, `✅ ${mention(senderId)} eligió. Esperando al otro jugador...`, msg)
    const [first, second] = game.players
    const a = game.choices[first]; const b = game.choices[second]
    const draw = a === b
    const firstWins = !draw && ((a === 'piedra' && b === 'tijera') || (a === 'papel' && b === 'piedra') || (a === 'tijera' && b === 'papel'))
    const winner = firstWins ? first : second
    const loser = firstWins ? second : first
    for (const player of game.players) await updateStats(player, { xp: draw ? 20 : player === winner ? 50 : 10, wins: draw ? 0 : player === winner ? 1 : 0, losses: draw ? 0 : player === loser ? 1 : 0, draws: draw ? 1 : 0, games: 1 })
    activeGames.delete(gameKey)
    return send(sock, chatId, `╭━━〔 ✊✋✌️ PPT 〕━━╮\n┃ ${mention(first)} ${choices[a]}\n┃ ${mention(second)} ${choices[b]}\n┃\n┃ ${draw ? '🤝 ¡Empate! +20 XP' : `🏆 Gana ${mention(winner)}\n┃ ⭐ +50 XP`}\n╰━━━━━━━━━━━━━━━━╯`, msg, game.players)
}

async function dadosCommand(sock, chatId, senderId, msg) {
    if (!groupOnly(chatId)) return send(sock, chatId, '❌ Este juego solo funciona en grupos.', msg)
    const wait = canPlay(chatId, senderId, 'dados')
    if (wait) return send(sock, chatId, `⏳ Espera ${wait}s para volver a tirar.`, msg)
    const mentions = getMentions(msg)
    const roll = () => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
    const mine = roll();
    if (!mentions.length) return send(sock, chatId, `╭━━〔 🎲 DADOS 〕━━╮\n┃ ${emojis[mine[0] - 1]} + ${emojis[mine[1] - 1]}\n┃ ⭐ Total: ${mine[0] + mine[1]}\n╰━━━━━━━━━━━━━━━━╯`, msg)
    if (mentions[0] === senderId) return send(sock, chatId, '❌ No puedes desafiarte a ti mismo.', msg)
    const theirs = roll(); const mineTotal = mine[0] + mine[1]; const theirTotal = theirs[0] + theirs[1]
    const draw = mineTotal === theirTotal; const winner = mineTotal > theirTotal ? senderId : mentions[0]
    await updateStats(senderId, { xp: draw ? 20 : mineTotal > theirTotal ? 50 : 10, wins: draw ? 0 : mineTotal > theirTotal ? 1 : 0, losses: draw ? 0 : mineTotal < theirTotal ? 1 : 0, draws: draw ? 1 : 0, games: 1 })
    await updateStats(mentions[0], { xp: draw ? 20 : mineTotal < theirTotal ? 50 : 10, wins: draw ? 0 : mineTotal < theirTotal ? 1 : 0, losses: draw ? 0 : mineTotal > theirTotal ? 1 : 0, draws: draw ? 1 : 0, games: 1 })
    return send(sock, chatId, `╭━━〔 🎲 DUELO DE DADOS 〕━━╮\n┃ ${mention(senderId)}: ${emojis[mine[0] - 1]} + ${emojis[mine[1] - 1]} = ${mineTotal}\n┃ ${mention(mentions[0])}: ${emojis[theirs[0] - 1]} + ${emojis[theirs[1] - 1]} = ${theirTotal}\n┃\n┃ ${draw ? '🤝 ¡Empate!' : `🏆 Gana ${mention(winner)} • +50 XP`}\n╰━━━━━━━━━━━━━━━━━━━━╯`, msg, [senderId, mentions[0]])
}

async function monedaCommand(sock, chatId, senderId, msg) {
    const wait = canPlay(chatId, senderId, 'moneda')
    if (wait) return send(sock, chatId, `⏳ Espera ${wait}s para lanzar otra moneda.`, msg)
    const prediction = normalize(msg.message?.conversation || msg.message?.extendedTextMessage?.text).split(/\s+/)[1]
    const result = Math.random() < 0.5 ? 'cara' : 'cruz'
    if (!prediction) return send(sock, chatId, `🪙 ${result.toUpperCase()}`, msg)
    if (!['cara', 'cruz'].includes(prediction)) return send(sock, chatId, '❌ Predice `cara` o `cruz`.', msg)
    const correct = prediction === result
    await updateStats(senderId, { xp: correct ? 25 : 5, games: 1, wins: correct ? 1 : 0, losses: correct ? 0 : 1 })
    return send(sock, chatId, `╭━━〔 🪙 MONEDA 〕━━╮\n┃ Resultado: ${result.toUpperCase()}\n┃ ${correct ? '🏆 ¡Acertaste! ⭐ +25 XP' : '❌ Fallaste. ⭐ +5 XP'}\n╰━━━━━━━━━━━━━━━━╯`, msg)
}

async function ruletaCommand(sock, chatId, senderId, msg) {
    if (!groupOnly(chatId)) return send(sock, chatId, '❌ Este juego solo funciona en grupos.', msg)
    const wait = canPlay(chatId, senderId, 'ruleta')
    if (wait) return send(sock, chatId, `⏳ Espera ${wait}s para girar otra vez.`, msg)
    const users = getMentions(msg)
    if (!users.length) {
        const metadata = await sock.groupMetadata(chatId)
        users.push(...(metadata.participants || []).map(p => p.id).filter(Boolean))
    }
    if (!users.length) return send(sock, chatId, '❌ No encontré participantes.', msg)
    const selected = randomItem(users)
    return send(sock, chatId, `╭━━〔 🎰 RULETA 〕━━╮\n┃ 🎯 La ruleta cayó en:\n┃\n┃ ${mention(selected)}\n╰━━━━━━━━━━━━━━━━╯`, msg, [selected])
}

async function eightBallGameCommand(sock, chatId, senderId, msg, args) {
    const question = args.trim()
    if (!question) return send(sock, chatId, '❓ Escribe una pregunta. Ejemplo: `.8ball ¿Voy a ganar hoy?`', msg)
    const answer = randomItem(answers8Ball)
    await updateStats(senderId, { xp: 5, games: 1 })
    return send(sock, chatId, `╭━━〔 🔮 8BALL 〕━━╮\n┃ ❓ ${question}\n┃\n┃ 🔮 ${answer}\n╰━━━━━━━━━━━━━━━━╯`, msg)
}

async function adivinaCommand(sock, chatId, senderId, msg, category = 'animal') {
    const selectedCategory = guessWords[normalize(category)] ? normalize(category) : 'animal'
    const gameKey = `adivina:${key(chatId, senderId)}`
    let game = activeGames.get(gameKey)
    if (!game) {
        const word = randomItem(guessWords[selectedCategory])
        game = { type: 'adivina', category: selectedCategory, word: word.word, hint: word.hint, attempts: 5, updatedAt: Date.now() }
        activeGames.set(gameKey, game)
        return send(sock, chatId, `╭━━〔 🧠 ADIVINA 〕━━╮\n┃ 🔎 Categoría: ${selectedCategory}\n┃ 💡 Pista: ${game.hint}\n┃ ❤️ Intentos: 5\n╰━━━━━━━━━━━━━━━━━╯\n\nEscribe tu respuesta o usa .adivina ${selectedCategory} para intentar.`, msg)
    }
    const guess = normalize(msg.message?.conversation || msg.message?.extendedTextMessage?.text).split(/\s+/).pop()
    game.updatedAt = Date.now(); game.attempts -= 1
    if (guess === game.word) {
        activeGames.delete(gameKey); await updateStats(senderId, { xp: 100, wins: 1, games: 1 })
        return send(sock, chatId, '🏆 ¡CORRECTO! ⭐ +100 puntos', msg)
    }
    if (game.attempts <= 0) { activeGames.delete(gameKey); await updateStats(senderId, { losses: 1, games: 1 }); return send(sock, chatId, `❌ Se acabaron los intentos. Era: ${game.word}`, msg) }
    return send(sock, chatId, `❌ No es esa.\n💡 ${game.hint}\n❤️ Intentos restantes: ${game.attempts}`, msg)
}

async function quizCommand(sock, chatId, senderId, msg) {
    const gameKey = `quiz:${chatId}`
    if (activeGames.has(gameKey) && !expired(activeGames.get(gameKey))) return send(sock, chatId, '⏳ Ya hay un quiz activo. Responde con `.1`, `.2`, `.3` o `.4`.', msg)
    const question = randomItem(quizQuestions)
    activeGames.set(gameKey, { type: 'quiz', question, updatedAt: Date.now() })
    return send(sock, chatId, `╭━━〔 🧠 QUIZ 〕━━╮\n┃ ❓ ${question.question}\n┃\n${question.options.map((option, index) => `┃ ${index + 1}️⃣ ${option}`).join('\n')}\n┃\n┃ 📚 ${question.category} • ${question.difficulty}\n╰━━━━━━━━━━━━━━━━╯`, msg)
}

async function quizAnswer(sock, chatId, senderId, msg, answer) {
    const gameKey = `quiz:${chatId}`; const game = activeGames.get(gameKey)
    if (!game || expired(game)) return false
    const selected = Number(answer)
    if (![1, 2, 3, 4].includes(selected)) return false
    activeGames.delete(gameKey)
    const correct = selected === game.question.answer
    await updateStats(senderId, { xp: correct ? 50 : 5, games: 1, wins: correct ? 1 : 0, losses: correct ? 0 : 1 })
    await send(sock, chatId, correct ? '🏆 ¡CORRECTO! ⭐ +50 XP' : `❌ Respuesta incorrecta. Era: ${game.question.options[game.question.answer - 1]}`, msg)
    return true
}

async function dueloCommand(sock, chatId, senderId, msg) {
    if (!groupOnly(chatId)) return send(sock, chatId, '❌ Este juego solo funciona en grupos.', msg)
    const target = getMentions(msg)[0]
    if (!target) return send(sock, chatId, '❌ Menciona a un usuario: `.duelo @usuario`.', msg)
    if (target === senderId) return send(sock, chatId, '❌ No puedes retarte a ti mismo.', msg)
    const wait = canPlay(chatId, senderId, 'duelo', true)
    if (wait) return send(sock, chatId, `⏳ Espera ${wait}s para otro duelo.`, msg)
    const stats = await getStats(senderId); const targetStats = await getStats(target)
    const power = user => Math.min(30, Math.floor(user.xp / 100))
    const makeStats = user => ({ attack: 40 + power(user) + Math.floor(Math.random() * 31), defense: 40 + power(user) + Math.floor(Math.random() * 31), speed: 40 + Math.floor(Math.random() * 61), luck: Math.floor(Math.random() * 101) })
    const first = makeStats(stats); const second = makeStats(targetStats)
    const score = values => values.attack + values.defense + values.speed + values.luck
    const winner = score(first) + Math.random() * 50 >= score(second) + Math.random() * 50 ? senderId : target
    const loser = winner === senderId ? target : senderId
    await updateStats(winner, { xp: 100, wins: 1, games: 1 }); await updateStats(loser, { xp: 10, losses: 1, games: 1 })
    const winningStats = winner === senderId ? first : second
    return send(sock, chatId, `╭━━〔 🏆 RESULTADO 〕━━╮\n┃ 🥇 ${mention(winner)}\n┃ ⚔️ Ataque: ${winningStats.attack}\n┃ 🛡️ Defensa: ${winningStats.defense}\n┃ ⚡ Velocidad: ${winningStats.speed}\n┃ 🍀 Suerte: ${winningStats.luck}\n┃ ⭐ +100 XP\n╰━━━━━━━━━━━━━━━━━━━━╯`, msg, [senderId, target])
}

const cardValues = { A: 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10 }
const cardNames = Object.keys(cardValues)
function drawCard() { return randomItem(cardNames) }
function blackjackTotal(cards) { let total = cards.reduce((sum, card) => sum + cardValues[card], 0); let aces = cards.filter(card => card === 'A').length; while (total > 21 && aces--) total -= 10; return total }
function blackjackText(game) { return `╭━━〔 🃏 BLACKJACK 〕━━╮\n┃ 👤 ${mention(game.userId)}\n┃\n┃ 🂠 ${game.cards.join(' + ')}\n┃ ⭐ Total: ${blackjackTotal(game.cards)}\n┃\n┃ Escribe .hit o .stand\n╰━━━━━━━━━━━━━━━━━━━━╯` }
async function blackjackCommand(sock, chatId, senderId, msg) {
    const gameKey = `blackjack:${key(chatId, senderId)}`
    if (activeGames.has(gameKey)) return send(sock, chatId, '⏳ Ya tienes una partida activa. Usa `.hit` o `.stand`.', msg)
    const game = { type: 'blackjack', userId: senderId, cards: [drawCard(), drawCard()], dealer: [drawCard(), drawCard()], updatedAt: Date.now() }
    activeGames.set(gameKey, game)
    if (blackjackTotal(game.cards) === 21) { activeGames.delete(gameKey); await updateStats(senderId, { xp: 100, wins: 1, games: 1 }); return send(sock, chatId, `${blackjackText(game)}\n🏆 ¡BLACKJACK! +100 XP`, msg) }
    return send(sock, chatId, blackjackText(game), msg)
}
async function blackjackAction(sock, chatId, senderId, msg, action) {
    const gameKey = `blackjack:${key(chatId, senderId)}`; const game = activeGames.get(gameKey)
    if (!game || expired(game)) return false
    if (action === 'hit') game.cards.push(drawCard())
    game.updatedAt = Date.now()
    let playerTotal = blackjackTotal(game.cards); let result = null
    if (playerTotal > 21) result = `💀 Te pasaste con ${playerTotal}. Pierdes.`
    else if (action === 'stand') { while (blackjackTotal(game.dealer) < 17) game.dealer.push(drawCard()); const dealerTotal = blackjackTotal(game.dealer); result = dealerTotal > 21 || playerTotal > dealerTotal ? `🏆 Ganas ${playerTotal} a ${dealerTotal}.` : playerTotal === dealerTotal ? '🤝 Empate.' : `❌ Gana el bot ${dealerTotal} a ${playerTotal}.` }
    if (!result) return send(sock, chatId, blackjackText(game), msg)
    activeGames.delete(gameKey); const won = result.startsWith('🏆'); const draw = result.startsWith('🤝')
    await updateStats(senderId, { xp: won ? 100 : draw ? 20 : 5, wins: won ? 1 : 0, losses: draw ? 0 : won ? 0 : 1, draws: draw ? 1 : 0, games: 1 })
    return send(sock, chatId, `${blackjackText(game)}\n${result}`, msg)
}

async function slotsCommand(sock, chatId, senderId, msg) {
    const wait = canPlay(chatId, senderId, 'slots')
    if (wait) return send(sock, chatId, `⏳ Espera ${wait}s para volver a jugar.`, msg)
    const symbols = ['🍒', '⭐', '💎', '7️⃣']; const result = [randomItem(symbols), randomItem(symbols), randomItem(symbols)]
    const unique = new Set(result).size; const xp = unique === 1 ? 100 : unique === 2 ? 25 : 10
    await updateStats(senderId, { xp, games: 1, wins: unique === 1 ? 1 : 0 })
    return send(sock, chatId, `╭━━〔 🎰 SLOTS 〕━━╮\n┃ ${result.join(' ┃ ')}\n┃\n┃ ${unique === 1 ? '🏆 ¡Tres iguales!' : unique === 2 ? '✨ ¡Dos iguales!' : '🎲 Combinación normal'}\n┃ ⭐ +${xp} XP\n╰━━━━━━━━━━━━━━━━╯`, msg)
}

async function memoriaCommand(sock, chatId, senderId, msg) {
    const gameKey = `memoria:${key(chatId, senderId)}`; if (activeGames.has(gameKey)) return send(sock, chatId, '⏳ Ya tienes una secuencia activa.', msg)
    const level = Math.min(5, ((await getStats(senderId)).wins || 0) + 1); const count = level + 3; const emojis = ['🐶', '🍕', '⚽', '🎮', '🔥', '🌙', '🚀', '🎸', '🍀', '👑']; const sequence = Array.from({ length: count }, () => randomItem(emojis))
    activeGames.set(gameKey, { type: 'memoria', userId: senderId, sequence, level, updatedAt: Date.now() })
    await send(sock, chatId, `╭━━〔 🧩 MEMORIA • NIVEL ${level} 〕━━╮\n┃ 🧠 Memoriza:\n┃\n┃ ${sequence.join(' ')}\n╰━━━━━━━━━━━━━━━━━━━━╯`, msg)
    setTimeout(() => { const game = activeGames.get(gameKey); if (!game) return; game.hidden = true; game.updatedAt = Date.now(); send(sock, chatId, `❓ ${mention(senderId)}, escribe la secuencia completa.`, msg, [senderId]).catch(() => {}) }, 4000)
}
async function memoriaAnswer(sock, chatId, senderId, msg, answer) {
    const gameKey = `memoria:${key(chatId, senderId)}`; const game = activeGames.get(gameKey); if (!game?.hidden) return false
    activeGames.delete(gameKey); const correct = normalize(answer).replace(/\s+/g, ' ') === normalize(game.sequence.join(' ')).replace(/\s+/g, ' ')
    await updateStats(senderId, { xp: correct ? game.level * 25 : 5, games: 1, wins: correct ? 1 : 0, losses: correct ? 0 : 1 })
    return send(sock, chatId, correct ? `🏆 ¡Memoria correcta! Nivel ${game.level}. ⭐ +${game.level * 25} XP` : `❌ Secuencia incorrecta. Era: ${game.sequence.join(' ')}`, msg)
}

async function profileCommand(sock, chatId, senderId, msg, targetId = senderId) {
    const stats = await getStats(targetId); const level = Math.floor(stats.xp / 100) + 1; const winrate = stats.games ? Math.round(stats.wins / stats.games * 100) : 0
    return send(sock, chatId, `╭━━〔 👤 PERFIL 〕━━╮\n┃ 👤 Usuario: ${mention(targetId)}\n┃ ⭐ Nivel: ${level}\n┃ ⚡ XP: ${stats.xp}\n┃ 🏆 Victorias: ${stats.wins}\n┃ 💀 Derrotas: ${stats.losses}\n┃ 🤝 Empates: ${stats.draws}\n┃ 🎮 Partidas: ${stats.games}\n┃ 📊 Winrate: ${winrate}%\n╰━━━━━━━━━━━━━━━━╯`, msg, [targetId])
}
async function rankCommand(sock, chatId, msg) {
    if (!groupOnly(chatId)) return send(sock, chatId, '❌ El ranking solo funciona en grupos.', msg)
    const metadata = await sock.groupMetadata(chatId); const participants = metadata.participants || []
    const rows = await Promise.all(participants.map(async participant => ({ id: participant.id, stats: await getStats(participant.id) })))
    rows.sort((a, b) => b.stats.xp - a.stats.xp); const top = rows.slice(0, 5); const mentions = top.map(row => row.id)
    return send(sock, chatId, `╭━━〔 🏆 RANKING 〕━━╮\n┃\n${top.map((row, index) => `┃ ${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]} ${mention(row.id)}\n┃ ⭐ ${row.stats.xp} XP`).join('\n┃\n')}\n╰━━━━━━━━━━━━━━━━━━╯`, msg, mentions)
}

async function handleGameCommand(sock, chatId, senderId, msg, command, args = '') {
    try {
        switch (command) {
            case 'ppt': return pptCommand(sock, chatId, senderId, msg)
            case 'dados': return dadosCommand(sock, chatId, senderId, msg)
            case 'moneda': return monedaCommand(sock, chatId, senderId, msg)
            case 'ruleta': return ruletaCommand(sock, chatId, senderId, msg)
            case '8ball': return eightBallGameCommand(sock, chatId, senderId, msg, args)
            case 'adivina': return adivinaCommand(sock, chatId, senderId, msg, args.split(/\s+/)[0] || 'animal')
            case 'quiz': return quizCommand(sock, chatId, senderId, msg)
            case 'duelo': return dueloCommand(sock, chatId, senderId, msg)
            case 'blackjack': return blackjackCommand(sock, chatId, senderId, msg)
            case 'slots': return slotsCommand(sock, chatId, senderId, msg)
            case 'memoria': return memoriaCommand(sock, chatId, senderId, msg)
            case 'perfil': return profileCommand(sock, chatId, senderId, msg, getMentions(msg)[0] || senderId)
            case 'rank': return rankCommand(sock, chatId, msg)
            default: return false
        }
    } catch (error) {
        console.error(`Error in game command ${command}:`, error)
        await send(sock, chatId, '❌ Ocurrió un error en el juego. Inténtalo de nuevo.', msg)
        return true
    }
}

async function handleGameInput(sock, chatId, senderId, msg, text) {
    try {
        if (await quizAnswer(sock, chatId, senderId, msg, text.replace(/^\./, ''))) return true
        if (await blackjackAction(sock, chatId, senderId, msg, text.replace(/^\./, ''))) return true
        if (await memoriaAnswer(sock, chatId, senderId, msg, text)) return true
        const gameKey = `adivina:${key(chatId, senderId)}`
        if (activeGames.has(gameKey) && !['.adivina', 'adivina'].includes(text)) { await adivinaCommand(sock, chatId, senderId, msg); return true }
        return false
    } catch (error) {
        console.error('Error handling game input:', error)
        return false
    }
}

module.exports = { handleGameCommand, handleGameInput, eightBallGameCommand }
