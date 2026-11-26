import { Boom } from '@hapi/boom'
import type { WAVersion } from '../Types'
import { fetchLatestWaWebVersion } from './generics'
import type { ILogger } from './logger'

/** how long a version fetched from WA's servers is reused before asking again */
export const WA_WEB_VERSION_CACHE_MS = 60 * 60 * 1000

/** endpoint WA Web itself hits to find out whether a client is outdated */
const CHECK_UPDATE_URL = 'https://web.whatsapp.com/check-update?version=1&platform=web'

const DEFAULT_HEADERS = {
	'sec-fetch-site': 'none',
	'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

type CachedWaWebVersion = {
	version: WAVersion
	expiresAt: number
}

let cached: CachedWaWebVersion | undefined
/** shared so several sockets connecting at once only cost a single request */
let pending: Promise<WAVersion | undefined> | undefined

export type ResolveWaWebVersionOptions = {
	logger?: ILogger
	/** fetch options (proxy dispatcher, headers, ...) forwarded to WA's servers */
	options?: RequestInit
	/** give up on WA's servers after this long & keep the configured version */
	timeoutMs?: number
	/** how long a fetched version is reused, defaults to an hour */
	cacheMs?: number
	/** ignore the in-memory cache & hit WA's servers again */
	force?: boolean
}

const parseWaVersion = (raw: string | null | undefined): WAVersion | undefined => {
	const parts = raw?.trim().split('.').map(Number)
	if (parts?.length !== 3 || parts.some(part => !Number.isInteger(part) || part < 0)) {
		return undefined
	}

	return parts as WAVersion
}

/**
 * fetches the live web version off WA's check-update endpoint.
 * used as a backup for {@link fetchLatestWaWebVersion}, which scrapes sw.js
 */
export const fetchWaWebVersionFromCheckUpdate = async (options: RequestInit = {}) => {
	const response = await fetch(CHECK_UPDATE_URL, {
		...options,
		method: 'GET',
		headers: { ...DEFAULT_HEADERS, ...options.headers }
	})

	if (!response.ok) {
		throw new Boom(`Failed to fetch check-update: ${response.statusText}`, { statusCode: response.status })
	}

	const body = (await response.json()) as { currentVersion?: string }
	const version = parseWaVersion(body?.currentVersion)

	if (!version) {
		throw new Boom('Could not find the current version in the check-update response', { statusCode: 500 })
	}

	return version
}

const fetchLiveWaWebVersion = async ({
	logger,
	options,
	timeoutMs
}: Pick<ResolveWaWebVersionOptions, 'logger' | 'options' | 'timeoutMs'>): Promise<WAVersion | undefined> => {
	const controller = new AbortController()
	const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined
	const fetchOptions: RequestInit = { ...options, signal: controller.signal }

	try {
		const result = await fetchLatestWaWebVersion(fetchOptions)
		if (result.isLatest) {
			return result.version
		}

		logger?.warn({ err: result.error }, 'could not read the WA Web version off sw.js, falling back to check-update')

		return await fetchWaWebVersionFromCheckUpdate(fetchOptions)
	} catch (err) {
		logger?.warn({ err }, 'could not fetch the live WA Web version, keeping the configured one')
		return undefined
	} finally {
		clearTimeout(timer)
	}
}

/**
 * resolves the version WA Web is currently serving, so the handshake is never
 * rejected (405/428) for announcing an outdated client.
 *
 * results are cached in memory & concurrent calls share one request;
 * returns undefined when WA cannot be reached, so the caller keeps its own version
 */
export const resolveWaWebVersion = async ({
	logger,
	options,
	timeoutMs = 10_000,
	cacheMs = WA_WEB_VERSION_CACHE_MS,
	force = false
}: ResolveWaWebVersionOptions = {}): Promise<WAVersion | undefined> => {
	if (!force && cached && cached.expiresAt > Date.now()) {
		return cached.version
	}

	if (!pending) {
		pending = fetchLiveWaWebVersion({ logger, options, timeoutMs })
			.then(version => {
				if (version) {
					cached = { version, expiresAt: Date.now() + cacheMs }
				}

				return version
			})
			.finally(() => {
				pending = undefined
			})
	}

	return pending
}

/** the version last fetched from WA, if any */
export const getCachedWaWebVersion = () => cached?.version

/** drops the cached version so the next connection fetches a fresh one */
export const clearWaWebVersionCache = () => {
	cached = undefined
}
