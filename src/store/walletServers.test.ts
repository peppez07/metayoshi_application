import { afterAll, expect, test, vi } from 'vitest'

const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key)
})
const { useWalletStore } = await import('./walletStore')
const { WALLET_STORAGE_KEY } = await import('../lib/walletStorage')
afterAll(() => vi.unstubAllGlobals())

test.each([2, 1])('rehydrates version %s replacing only the old built-in URL and preserving the active custom server', async (version) => {
  memory.set(WALLET_STORAGE_KEY, JSON.stringify({ version, state: {
    servers: ['wss://144.202.18.233:50004', 'wss://custom.example:50004'],
    activeServer: 'wss://custom.example:50004'
  } }))
  await useWalletStore.persist.rehydrate()
  expect(useWalletStore.getState().servers).toEqual(['https://144.202.18.233/api/v1/electrum', 'wss://custom.example:50004'])
  expect(useWalletStore.getState().activeServer).toBe('wss://custom.example:50004')
})

test('rehydrates the old active default as HTTPS without replacing custom saved servers', async () => {
  memory.set(WALLET_STORAGE_KEY, JSON.stringify({ version: 2, state: {
    servers: ['wss://custom.example:50004', 'wss://144.202.18.233:50004'],
    activeServer: 'wss://144.202.18.233:50004'
  } }))
  await useWalletStore.persist.rehydrate()
  expect(useWalletStore.getState().activeServer).toBe('https://144.202.18.233/api/v1/electrum')
  expect(useWalletStore.getState().servers[0]).toBe('wss://custom.example:50004')
})
