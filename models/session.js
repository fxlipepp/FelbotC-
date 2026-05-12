const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  data: Object
})

module.exports = mongoose.model('Session', sessionSchema)