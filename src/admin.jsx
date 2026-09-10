import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './context/StoreContext.jsx';
import AdminDashboard from './components/admin/AdminDashboard.jsx';

/**
 * Error Boundary — shows runtime errors on screen instead of blank page
 */
class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PokeVault Admin Error Boundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', backgroundColor: '#09090b', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', fontFamily: 'monospace'
        }}>
          <div style={{
            backgroundColor: '#18181b', border: '2px solid #ef4444',
            padding: '2rem', borderRadius: '12px', maxWidth: '550px', width: '100%'
          }}>
            <h1 style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 900, marginTop: 0 }}>
              ⚠️ Admin Panel Runtime Error
            </h1>
            <div style={{
              backgroundColor: '#09090b', border: '1px solid #27272a',
              color: '#f87171', padding: '1rem', borderRadius: '6px',
              fontSize: '0.75rem', wordBreak: 'break-word', marginBottom: '1rem'
            }}>
              {this.state.error?.toString() || 'Unknown Error'}
            </div>
            <button onClick={() => window.location.reload()} style={{
              backgroundColor: '#fbbf24', color: '#000', fontWeight: 900,
              border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer'
            }}>
              🔄 Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * POKÉVAULT LEGENDS — Admin Entry Point (Vite-bundled)
 */
function AppRoot() {
  return (
    <AdminErrorBoundary>
      <StoreProvider>
        <AdminDashboard />
      </StoreProvider>
    </AdminErrorBoundary>
  );
}

const container = document.getElementById('adminRoot');
const root = createRoot(container);
root.render(<AppRoot />);
