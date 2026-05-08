const Session = require('../models/session')

const mongoAuthState = {
  creds: {},
  keys: {
    get: async (type, ids) => {
      const res = await Session.find({ id: { $in: ids } })
      const data = {}
      res.forEach(x => data[x.id] = x.data)
      return data
    },
    set: async (data) => {
      for (const id in data) {
        await Session.findOneAndUpdate(
          { id },
          { id, data: data[id] },
          { upsert: true }
        )
      }
    }
  }
}

module.exports = { mongoAuthState }