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
   },

   adminMode: {
      type: Boolean,
      default: false
   },

   welcome: {
      enabled: {
         type: Boolean,
         default: false
      },
      message: {
         type: String,
         default: null
      }
   },

   goodbye: {
      enabled: {
         type: Boolean,
         default: false
      },
      message: {
         type: String,
         default: 'Una mierda menos, no te extrañaremos.'
      },
      imagePath: {
         type: String,
         default: null
      },
      audioPath: {
         type: String,
         default: null
      }
   },

   // 🔥 AQUI AGREGAMOS FELBOT
   felbot: {
      enabled: {
         type: Boolean,
         default: true
      }
   },

    nsfw: {

        enabled: {
            type: Boolean,
            default: false
        }

           }

})

module.exports = mongoose.model('Group', groupSchema)