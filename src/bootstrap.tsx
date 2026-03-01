import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { installGlobalErrorMonitor, recordRuntimeError } from './lib/runtimeErrorMonitor'

import { ToastProvider } from './components/Toast'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
    void recordRuntimeError('popup-ui', error, {
      kind: 'react-error-boundary',
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px',
            color: 'white',
            backgroundColor: '#0b0c0e',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )
    }

    return this.props.children
  }
}

installGlobalErrorMonitor('popup-ui')

const rootElement = document.getElementById('app')
if (!rootElement) {
  console.error('App element not found!')
  throw new Error('App element not found')
}

try {
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
} catch (error) {
  console.error('Failed to render React app:', error)
  void recordRuntimeError('popup-ui', error, { kind: 'bootstrap-render' })
  rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background-color: #0b0c0e; min-height: 100vh;">
        <h1>Failed to load application</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre style="background: #1a1a1a; padding: 10px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 5px; cursor: pointer;">Reload</button>
      </div>
    `
}
