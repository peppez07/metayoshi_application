import rtmLogo from '../assets/raptoreum.png'
import btczLogo from '../assets/bitcoinz.png'
import ltcLogo from '../assets/litecoin.svg'
import btcLogo from '../assets/bitcoin.svg'
import dogeLogo from '../assets/dogecoin.svg'
import type { NetworkId } from './networks'

export const NETWORK_LOGOS: Record<NetworkId, string> = { rtm: rtmLogo, btcz: btczLogo, ltc: ltcLogo, btc: btcLogo, doge: dogeLogo }
