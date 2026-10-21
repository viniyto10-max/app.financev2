import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA installability and offline support
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' });
    });
  } else if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then(rs => rs.forEach(r => r.unregister()));
    caches?.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}

createRoot(document.getElementById('root')!).render(<App />);
