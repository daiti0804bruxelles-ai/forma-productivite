import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { applyAppearance, readCachedAppearance } from './theme'
import './styles.css'
import { installViewportFix } from './viewportFix'

applyAppearance(readCachedAppearance())
installViewportFix()
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
