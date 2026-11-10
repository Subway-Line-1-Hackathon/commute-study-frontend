import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // 백엔드가 localhost 오리진의 CORS를 막고 있어서 dev 서버가 대신 요청을 전달한다
      proxy: {
        '/api': {
          target:
            env.VITE_API_PROXY_TARGET || 'https://commute-study-backend-production.up.railway.app',
          changeOrigin: true,
          // PUT/POST에는 브라우저가 Origin(localhost)을 붙이는데, 백엔드가 이를 CORS 위반(403)으로 막는다.
          // 서버끼리 전달하는 요청이므로 Origin을 지워서 보낸다
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
          },
        },
      },
    },
  }
})
