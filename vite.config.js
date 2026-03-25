import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 设置基础路径，支持部署到子目录
  // 如果部署到根目录，使用 '/'
  // 如果部署到子目录，例如 '/app/'，则使用 '/app/'
  base: '/',
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // 生产环境构建配置
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库拆分
          'element-plus': ['element-plus'],
          'three': ['three'],
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      },
      input: {
        main: path.resolve(__dirname, 'index.html'),
        firework: path.resolve(__dirname, 'firework/index.html')
      }
    }
  },
  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    proxy: {
      // 开发环境代理 API 请求到后端
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true
      }
    }
  }
})
