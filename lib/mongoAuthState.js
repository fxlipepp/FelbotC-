const Session = require('../models/session')

async function useMongoAuthState(id = 'main') {
    const key = 'baileys-' + id

    const getData = async () => {
        const doc = await Session.findOne({ id: key })
        return doc?.data || {}
    }

    const setData = async (data) => {
        await Session.findOneAndUpdate(
            { id: key },
            { data },
            { upsert: true }
        )
    }

    return {
        state: {
            creds: (await getData()).creds || {},
            keys: {
                get: async () => (await getData()).keys || {},
                set: async (data) => {
                    const old = await getData()
                    await setData({
                        ...old,
                        keys: { ...old.keys, ...data }
                    })
                }
            }
        },

        saveCreds: async (creds) => {
            const old = await getData()
            await setData({
                ...old,
                creds
            })
        }
    }
}

module.exports = { useMongoAuthState }