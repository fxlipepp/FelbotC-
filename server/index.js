const express = require('express')

const app = express()

app.get('/', (req, res) => {
    res.send('🤖 BOT ACTIVO EN RENDER 🔥')
})

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        uptime: process.uptime()
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log('🌐 Server corriendo en puerto', PORT)
})