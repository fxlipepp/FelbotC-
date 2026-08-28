const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({

   userId: {
      type: String,
      required: true,
      unique: true
   },

   banned: {
      type: Boolean,
      default: false
   },

   muted: {
      type: Boolean,
      default: false
   },

   xp: {
      type: Number,
      default: 0
   },

   wins: {
      type: Number,
      default: 0
   },

   losses: {
      type: Number,
      default: 0
   },

   draws: {
      type: Number,
      default: 0
   },

   games: {
      type: Number,
      default: 0
   },

   createdAt: {
      type: Date,
      default: Date.now
   }

})

module.exports = mongoose.model('User', userSchema)