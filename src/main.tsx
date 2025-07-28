import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import config from './amplifyconfiguration.json'
import { Buffer } from 'buffer'
import { initializeMonitoring } from './utils/monitoring'

// Apply dark mode by default
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

// Override AppSync endpoint with .env if present
const amplifyConfig = {
  ...config,
  aws_appsync_graphqlEndpoint: import.meta.env.VITE_AWS_APPSYNC_GRAPHQL_ENDPOINT || config.aws_appsync_graphqlEndpoint,
};

Amplify.configure(amplifyConfig)
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