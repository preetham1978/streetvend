import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';

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

  const originalError = console.error;
  console.error = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : String(args[0] || '');
    if (isHmrError(msg)) return;
    originalError(...args);
  };


}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
