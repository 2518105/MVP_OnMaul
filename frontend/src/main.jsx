import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 첫 렌더 전에 클래스 적용 → 깜빡임 방지
if (localStorage.getItem("largeText") === "1") {
  document.getElementById("root").classList.add("large-text");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
