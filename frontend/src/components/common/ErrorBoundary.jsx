import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

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
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--bg-main, #f9fafb)',
          }}
        >
          <h1 style={{ color: 'var(--text-main, #111)', fontSize: '1.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-muted, #6b7280)', maxWidth: '480px' }}>
            An unexpected error occurred. Please reload the page to continue.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-primary, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
