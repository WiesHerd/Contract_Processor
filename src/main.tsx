import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import config from './amplifyconfiguration.json'
import { Buffer } from 'buffer'

Amplify.configure(config)
import App from './App'
import './index.css'

window.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 