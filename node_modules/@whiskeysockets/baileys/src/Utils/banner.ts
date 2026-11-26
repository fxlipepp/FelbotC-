/**
 * Prints the russellxz-ultra-baileys banner once per process.
 * Set ULTRA_BAILEYS_NO_BANNER=1 to disable it.
 */

const ESC = '\x1b['
const RESET = `${ESC}0m`
const BOLD = `${ESC}1m`
const DIM = `${ESC}2m`

// cyan -> blue -> violet -> magenta gradient (256-color)
const GRADIENT = [51, 45, 39, 69, 105, 141, 177, 213, 207, 201]

const paint = (text: string, color: number, bold = false) => `${bold ? BOLD : ''}${ESC}38;5;${color}m${text}${RESET}`

const gradientLine = (text: string, offset = 0) => {
	const chars = [...text]
	const step = Math.max(1, Math.floor(chars.length / GRADIENT.length))
	return (
		chars
			.map((ch, i) => {
				const color = GRADIENT[Math.min(GRADIENT.length - 1, Math.floor(i / step) + offset)] ?? 201
				return `${ESC}38;5;${color}m${ch}`
			})
			.join('') + RESET
	)
}

/** version of this fork, shown in the banner */
export const ULTRA_BAILEYS_VERSION = '7.0.0-rc13'

let printed = false

export const printBanner = (version: string = ULTRA_BAILEYS_VERSION) => {
	if (printed || process.env.ULTRA_BAILEYS_NO_BANNER) {
		return
	}

	printed = true

	const width = 46
	const line = '─'.repeat(width)
	const pad = (text: string, visibleLength = text.length) => {
		const left = Math.floor((width - visibleLength) / 2)
		return ' '.repeat(Math.max(0, left)) + text + ' '.repeat(Math.max(0, width - visibleLength - left))
	}

	const title = 'R U S S E L L X Z'
	const subtitle = '— u l t r a  b a i l e y s —'
	const items = ['◆ modo turbo · baja latencia', '◆ botones nativos · listas · flows', '◆ consola limpia · cero ruido']

	const edge = (ch: string) => paint(ch, 105)
	const out = [
		'',
		`${edge('╭')}${gradientLine(line)}${edge('╮')}`,
		`${edge('│')}${' '.repeat(width)}${edge('│')}`,
		`${edge('│')}${pad(`${BOLD}${gradientLine(title)}`, title.length)}${edge('│')}`,
		`${edge('│')}${pad(gradientLine(subtitle, 3), subtitle.length)}${edge('│')}`,
		`${edge('│')}${' '.repeat(width)}${edge('│')}`,
		...items.map(item => `${edge('│')}${pad(paint(item, 250), item.length)}${edge('│')}`),
		`${edge('│')}${' '.repeat(width)}${edge('│')}`,
		`${edge('│')}${pad(`${DIM}v${version}${RESET}`, version.length + 1)}${edge('│')}`,
		`${edge('╰')}${gradientLine(line, 3)}${edge('╯')}`,
		''
	]

	console.log(out.join('\n'))
}

let versionNoticePrinted = false

/** where the WA Web version a connection announces came from */
export type WaVersionSource =
	/** read from WA's servers just now */
	| 'live'
	/** pinned by the bot through `version` */
	| 'pinned'
	/** WA could not be reached, so the version shipped with the library is used */
	| 'bundled'

/**
 * Prints, once per process, which WA Web version the connection is using & where
 * it came from. Most bots run with a silent logger, so this is the only way they
 * get to see that an old version is in play -- which is exactly what makes
 * WhatsApp refuse to link a device.
 */
export const printWaVersionNotice = ({ version, source }: { version: number[]; source: WaVersionSource }) => {
	if (versionNoticePrinted || process.env.ULTRA_BAILEYS_NO_BANNER) {
		return
	}

	versionNoticePrinted = true

	const v = `v${version.join('.')}`

	if (source === 'bundled') {
		console.log(
			`${paint('⚠', 214)} ${paint(
				`No se pudo consultar la versión de WA Web: se usa la incluida (${v}).`,
				214
			)}\n  ${paint('Si WhatsApp ya publicó una más nueva, la vinculación fallará ("código incorrecto").', 250)}\n`
		)
		return
	}

	const label = source === 'live' ? 'en vivo' : 'fijada'
	console.log(`${paint('◆', 105)} ${paint(`WA Web ${v} (${label})`, 250)}\n`)
}
