import makeWASocket from '../../Socket'
import { makeSession } from '../TestUtils/session'

// nothing is listening there, so the socket never completes its handshake
const DEAD_SOCKET_URL = 'ws://127.0.0.1:1/ws/chat'

describe('requestPairingCode', () => {
	const makeSock = async () => {
		const { state, clear } = await makeSession()
		const sock = makeWASocket({
			auth: state,
			waWebSocketUrl: DEAD_SOCKET_URL,
			// keep the test off the network entirely
			syncWaWebVersion: false,
			connectTimeoutMs: 2000
		})

		return { sock, creds: state.creds, cleanup: clear }
	}

	it('does not hand out a code when the connection never reached WA', async () => {
		const { sock, cleanup } = await makeSock()

		// a code returned here would be one WA never received -- the phone would reject it
		await expect(sock.requestPairingCode('5491112345678')).rejects.toThrow()

		await sock.end(undefined)
		await cleanup()
	})

	it('rejects a phone number without digits before touching the creds', async () => {
		const { sock, creds, cleanup } = await makeSock()

		await expect(sock.requestPairingCode('+ - ()')).rejects.toThrow(/digits/)
		expect(creds.me).toBeUndefined()
		expect(creds.pairingCode).toBeUndefined()

		await sock.end(undefined)
		await cleanup()
	})
})
