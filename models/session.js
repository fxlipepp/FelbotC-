const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
  id: String,
  data: Object
})

module.exports = mongoose.model('Session', sessionSchema)