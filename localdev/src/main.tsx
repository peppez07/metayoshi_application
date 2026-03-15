import { Buffer } from 'buffer'
import process from 'process'

// Provide Node-like globals before loading app modules.
;(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer
;(globalThis as typeof globalThis & { process: typeof process }).process = process

function renderBootstrapFailure(error: unknown): void {
  if (typeof document === 'undefined') return

  const root = document.getElementById('app')
  if (!root) return

  root.replaceChildren()

  const wrapper = document.createElement('div')
  wrapper.style.padding = '20px'
  wrapper.style.color = 'white'
  wrapper.style.backgroundColor = '#0b0c0e'
  wrapper.style.minHeight = '100vh'

  const title = document.createElement('h1')
  title.textContent = 'Failed to load application'

  const message = document.createElement('p')
  message.style.marginTop = '8px'
  message.textContent = error instanceof Error ? error.message : String(error)

  const details = document.createElement('pre')
  details.style.marginTop = '12px'
  details.style.background = '#1a1a1a'
  details.style.padding = '10px'
  details.style.overflow = 'auto'
  details.textContent = error instanceof Error ? (error.stack || error.message) : String(error)

  const reloadButton = document.createElement('button')
  reloadButton.type = 'button'
  reloadButton.textContent = 'Reload'
  reloadButton.style.marginTop = '10px'
  reloadButton.style.padding = '10px 20px'
  reloadButton.style.background = '#f97316'
  reloadButton.style.color = 'white'
  reloadButton.style.border = 'none'
  reloadButton.style.borderRadius = '5px'
  reloadButton.style.cursor = 'pointer'
  reloadButton.addEventListener('click', () => window.location.reload())

  wrapper.append(title, message, details, reloadButton)
  root.appendChild(wrapper)
}

void import('./bootstrap').catch((error) => {
  console.error('Failed to import bootstrap module:', error)
  renderBootstrapFailure(error)
})
