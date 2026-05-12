const Session = require('../models/session')

async function useMongoAuthState(id = 'main') {
    const key = 'baileys-' + id

    const getSession = async () => {
        const doc = await Session.findOne({ id: key })
        return doc?.data || { creds: {}, keys: {} }
    }

    const setSession = async (data) => {
        await Session.findOneAndUpdate(
            { id: key },
            { data },
            { upsert: true }
        )
    }

    return {
        state: {
            creds: (await getSession()).creds,
            keys: {
                get: async () => (await getSession()).keys,
                set: async (update) => {
                    const s = await getSession()

                    await setSession({
                        ...s,
                        keys: {
                            ...s.keys,
                            ...update
                        }
                    })
                }
            }
        },

        saveCreds: async (creds) => {
            const s = await getSession()

            await setSession({
                ...s,
                creds
            })
        }
    }
}

module.exports = { useMongoAuthState }