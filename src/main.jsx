// 앱 진입점: index.html의 #root에 React 앱을 붙인다
// BrowserRouter로 감싸서 앱 전체에서 useNavigate, useLocation 등 라우터 훅을 쓸 수 있게 한다
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
