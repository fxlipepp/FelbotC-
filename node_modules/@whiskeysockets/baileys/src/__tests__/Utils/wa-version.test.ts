import { clearWaWebVersionCache, getCachedWaWebVersion, resolveWaWebVersion } from '../../Utils/wa-version'

const swJsWithRevision = (revision: number) => `self.__WA_CONFIG = {"client_revision": ${revision}, "foo": "bar"}`

describe('resolveWaWebVersion', () => {
	let originalFetch: typeof globalThis.fetch
	let requestedUrls: string[]

	beforeEach(() => {
		originalFetch = globalThis.fetch
		requestedUrls = []
		clearWaWebVersionCache()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		clearWaWebVersionCache()
	})

	const mockFetch = (handler: (url: string) => Response | Promise<Response>) => {
		globalThis.fetch = async (input: RequestInfo | URL) => {
			const url = input.toString()
			requestedUrls.push(url)
			return handler(url)
		}
	}

	it('reads the live version off sw.js', async () => {
		mockFetch(() => new Response(swJsWithRevision(1044015310)))

		await expect(resolveWaWebVersion()).resolves.toEqual([2, 3000, 1044015310])
		expect(requestedUrls).toEqual(['https://web.whatsapp.com/sw.js'])
	})

	it('reuses the fetched version instead of asking WA on every connection', async () => {
		mockFetch(() => new Response(swJsWithRevision(1044015310)))

		await resolveWaWebVersion()
		await expect(resolveWaWebVersion()).resolves.toEqual([2, 3000, 1044015310])

		expect(requestedUrls).toHaveLength(1)
		expect(getCachedWaWebVersion()).toEqual([2, 3000, 1044015310])
	})

	it('re-fetches once the cached version expires', async () => {
		mockFetch(() => new Response(swJsWithRevision(1044015310)))

		await resolveWaWebVersion({ cacheMs: 0 })
		await resolveWaWebVersion({ cacheMs: 0 })

		expect(requestedUrls).toHaveLength(2)
	})

	it('re-fetches after the cache is cleared, as happens on a 405', async () => {
		mockFetch(url => new Response(swJsWithRevision(url.includes('sw.js') ? 1044015310 : 0)))

		await resolveWaWebVersion()
		clearWaWebVersionCache()
		await resolveWaWebVersion()

		expect(requestedUrls).toHaveLength(2)
		expect(getCachedWaWebVersion()).toEqual([2, 3000, 1044015310])
	})

	it('shares a single request between concurrent connections', async () => {
		mockFetch(() => new Response(swJsWithRevision(1044015310)))

		const results = await Promise.all([resolveWaWebVersion(), resolveWaWebVersion(), resolveWaWebVersion()])

		expect(results).toEqual([
			[2, 3000, 1044015310],
			[2, 3000, 1044015310],
			[2, 3000, 1044015310]
		])
		expect(requestedUrls).toHaveLength(1)
	})

	it('falls back to check-update when sw.js no longer carries the revision', async () => {
		mockFetch(url => {
			if (url.includes('sw.js')) {
				return new Response('self.__WA_CONFIG = {}')
			}

			return new Response(JSON.stringify({ currentVersion: '2.3000.1044015310' }))
		})

		await expect(resolveWaWebVersion()).resolves.toEqual([2, 3000, 1044015310])
		expect(requestedUrls).toHaveLength(2)
		expect(requestedUrls[1]).toContain('/check-update')
	})

	it('falls back to check-update when sw.js cannot be fetched', async () => {
		mockFetch(url => {
			if (url.includes('sw.js')) {
				return new Response('nope', { status: 405, statusText: 'Method Not Allowed' })
			}

			return new Response(JSON.stringify({ currentVersion: '2.3000.1044015310' }))
		})

		await expect(resolveWaWebVersion()).resolves.toEqual([2, 3000, 1044015310])
		expect(requestedUrls).toHaveLength(2)
	})

	it('returns undefined when WA cannot be reached, so the caller keeps its version', async () => {
		mockFetch(() => {
			throw new Error('network down')
		})

		await expect(resolveWaWebVersion()).resolves.toBeUndefined()
		expect(getCachedWaWebVersion()).toBeUndefined()
	})

	it('returns undefined on a malformed check-update payload', async () => {
		mockFetch(url => {
			if (url.includes('sw.js')) {
				return new Response('self.__WA_CONFIG = {}')
			}

			return new Response(JSON.stringify({ currentVersion: 'not.a.version' }))
		})

		await expect(resolveWaWebVersion()).resolves.toBeUndefined()
	})

	it('gives up on a hanging request and keeps the configured version', async () => {
		mockFetch(
			() =>
				new Promise<Response>((_, reject) => {
					setTimeout(() => reject(new Error('aborted')), 50)
				})
		)

		await expect(resolveWaWebVersion({ timeoutMs: 10 })).resolves.toBeUndefined()
	})
})
