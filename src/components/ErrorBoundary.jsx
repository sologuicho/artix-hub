import { Component } from 'react';

/**
 * Global Error Boundary — catches any unhandled React render errors.
 * Prevents the whole app from crashing due to a single component failure.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // TODO: send to monitoring service (Sentry, etc.) in production
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#e2e8f0',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: '480px', marginBottom: '2rem', lineHeight: 1.6 }}>
            Ocurrió un error inesperado. Puedes intentar recargar la página o regresar al inicio.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              background: '#1e1e2e',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.75rem',
              color: '#f87171',
              maxWidth: '640px',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '2rem',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.target.style.opacity = '0.85'}
            onMouseOut={e => e.target.style.opacity = '1'}
          >
            Ir al inicio
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
