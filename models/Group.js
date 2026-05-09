const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({

   groupId: {
      type: String,
      required: true,
      unique: true
   },

   antilink: {
      type: Boolean,
      default: false
   },

   antilinkWarnings: {
      type: Object,
      default: {}
   },

   antilinkResetAt: {
      type: Number,
      default: 0
   }

})

module.exports = mongoose.model('Group', groupSchema)