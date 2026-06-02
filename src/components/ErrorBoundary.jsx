import { Component } from 'react';

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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1
            className="font-display mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: 'var(--text)' }}
          >
            Algo salió mal
          </h1>

          <p
            className="font-sans text-sm mb-8"
            style={{ color: 'var(--muted)', maxWidth: 420, lineHeight: 1.7 }}
          >
            {this.state.error?.message || 'Ocurrió un error inesperado en la aplicación.'}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
