import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { applyAppearance, readCachedAppearance } from './theme'
import './styles.css'

applyAppearance(readCachedAppearance())
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
