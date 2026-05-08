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

   createdAt: {
      type: Date,
      default: Date.now
   }

})

module.exports = mongoose.model('User', userSchema)