/** @type {import('tailwindcss').Config} */
export default {
  // 这里配置了 tailwind 去哪里扫描你的代码
  content: [
    "./index.html",           // 你的根目录 index.html
    "./src/**/*.{vue,js}",    // src 下所有的 vue 和 js 文件
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}