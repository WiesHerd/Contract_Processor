import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import config from './amplifyconfiguration.json'
import { Buffer } from 'buffer'
import { initializeMonitoring } from './utils/monitoring'

Amplify.configure(config)
import App from './App.tsx'
import './index.css'

window.Buffer = Buffer

// Initialize monitoring for production
initializeMonitoring();

// --- Scroll Lock Patch: Prevent vertical scrollbar from disappearing ---
if (typeof window !== 'undefined') {
  const unlockScroll = (el: HTMLElement) => {
    if (el.style.overflow === 'hidden') {
      el.style.overflowY = 'auto';
    }
  };
  const observer = new MutationObserver(() => {
    unlockScroll(document.body);
    unlockScroll(document.documentElement);
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
}
// --- End Scroll Lock Patch ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 