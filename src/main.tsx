import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket/HMR errors in the preview environment
if (typeof window !== 'undefined') {
  const isHmrError = (msg: string) => {
    return (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('vite') || 
      msg.includes('hmr') || 
      msg.includes('HMR')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (isHmrError(msg)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isHmrError(msg)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

