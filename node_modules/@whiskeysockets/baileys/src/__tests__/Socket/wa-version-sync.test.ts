import makeWASocket from '../../Socket'
import type { WAVersion } from '../../Types'
import { clearWaWebVersionCache } from '../../Utils/wa-version'
import { makeSession, mockWebSocket } from '../TestUtils/session'

mockWebSocket()

describe('live WA Web version sync', () => {
	let originalFetch: typeof globalThis.fetch
	let requestedUrls: string[]

	beforeEach(() => {
		originalFetch = globalThis.fetch
		requestedUrls = []
		clearWaWebVersionCache()

		globalThis.fetch = async (input: RequestInfo | URL) => {
			requestedUrls.push(input.toString())
			return new Response('self.__WA_CONFIG = {"client_revision": 1044015310}')
		}
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		clearWaWebVersionCache()
	})

	const makeSock = async (extraConfig: { version?: WAVersion; syncWaWebVersion?: boolean } = {}) => {
		const { state, clear } = await makeSession()
		const sock = makeWASocket({ auth: state, ...extraConfig })

		// let the version request that is kicked off alongside the connect go out
		await new Promise(resolve => setImmediate(resolve))

		return {
			sock,
			cleanup: async () => {
				await sock.end(new Error('test done'))
				await clear()
			}
		}
	}

	it('asks WA for the version it is serving when none is pinned', async () => {
		const { cleanup } = await makeSock()

		expect(requestedUrls).toContain('https://web.whatsapp.com/sw.js')

		await cleanup()
	})

	it('respects a pinned version and never calls out to WA', async () => {
		const { cleanup } = await makeSock({ version: [2, 3000, 1000000000] })

		expect(requestedUrls).toHaveLength(0)

		await cleanup()
	})

	it('still syncs a pinned version when explicitly asked to', async () => {
		const { cleanup } = await makeSock({ version: [2, 3000, 1000000000], syncWaWebVersion: true })

		expect(requestedUrls).toContain('https://web.whatsapp.com/sw.js')

		await cleanup()
	})

	it('does not call out to WA when the sync is turned off', async () => {
		const { cleanup } = await makeSock({ syncWaWebVersion: false })

		expect(requestedUrls).toHaveLength(0)

		await cleanup()
	})

	it('survives a version helper that hands over undefined', async () => {
		// `version: undefined` used to wipe the fallback the handshake needs
		const { cleanup } = await makeSock({ version: undefined })

		expect(requestedUrls).toContain('https://web.whatsapp.com/sw.js')

		await cleanup()
	})
})
