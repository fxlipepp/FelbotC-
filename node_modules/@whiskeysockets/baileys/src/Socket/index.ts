import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import { printBanner } from '../Utils/banner'
import { installConsoleFilter } from '../Utils/console-filter'
import { makeCommunitiesSocket } from './communities'

// export the last socket layer
const makeWASocket = (config: UserFacingSocketConfig) => {
	installConsoleFilter()
	printBanner()

	const newConfig = {
		...DEFAULT_CONNECTION_CONFIG,
		...config
	}

	// a version pinned by the user wins, unless they explicitly asked for the live one
	if (config.version && config.syncWaWebVersion === undefined) {
		newConfig.syncWaWebVersion = false
	}

	// `version: undefined` (a version helper that failed) would wipe the fallback
	// the handshake needs, so put it back
	if (!newConfig.version) {
		newConfig.version = DEFAULT_CONNECTION_CONFIG.version
	}

	return makeCommunitiesSocket(newConfig)
}

export default makeWASocket
