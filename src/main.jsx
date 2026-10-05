import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  })
}

const originalFetch = window.fetch.bind(window)
window.fetch = (url, options = {}) => {
  const token = sessionStorage.getItem('artix_token')
  const csrf = sessionStorage.getItem('artix_csrf')
  const urlStr = url.toString()
  const isBackend = urlStr.startsWith(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000')
  if (isBackend && (token || csrf)) {
    options = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
    }
  }
  return originalFetch(url, options)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
