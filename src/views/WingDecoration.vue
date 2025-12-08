<template>
  <div class="wing-container">
    <svg class="wing" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f9f9f9"/><stop offset="20%" stop-color="#e6e6e6"/><stop offset="40%" stop-color="#ffd700" stop-opacity="0.6"/><stop offset="60%" stop-color="#d4d4d4"/><stop offset="80%" stop-color="#e8e8e8"/><stop offset="100%" stop-color="#f9f9f9"/>
        </linearGradient>
        <pattern id="intricate" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20,0 L40,20 L20,40 L0,20 Z" stroke="#ccc" stroke-width="0.5" fill="none"/>
          <circle cx="20" cy="20" r="4" stroke="#ddd" stroke-width="0.4" fill="none"/>
          <circle cx="10" cy="10" r="1" fill="#ffd700"/>
          <circle cx="30" cy="30" r="1" fill="#ffd700"/>
        </pattern>
        <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <!-- 将流光颜色改为银白、蓝色、紫色和绿色交替，颜色再浅一点 -->
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="20%" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="40%" stop-color="#bbdefb" stop-opacity="0.7"/><stop offset="60%" stop-color="#e1bee7" stop-opacity="0.7"/><stop offset="80%" stop-color="#c8e6c9" stop-opacity="0.7"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <filter id="emboss">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
          <feSpecularLighting in="blur" surfaceScale="1" specularConstant="0.8" specularExponent="25" lighting-color="#fff" result="specOut">
            <fePointLight x="-2000" y="-1000" z="2000"/>
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="litMask"/>
          <feComposite in="SourceGraphic" in2="litMask" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
        </filter>
      </defs>

      <!-- 六片羽毛 -->
      <g>
        <!-- 最大 -->
        <path id="f1" class="feather" filter="url(#emboss)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 Z"/>
        <!-- 次大 -->
        <path id="f2" class="feather" filter="url(#emboss)" d="M300,420 C330,380 360,340 390,300 C420,260 440,230 460,210 C480,190 500,180 520,180 C540,180 550,190 550,200 C550,210 540,230 520,260 C500,290 460,340 400,390 C340,440 300,420 300,420 Z"/>
        <!-- 中等纹理 -->
        <path id="f3" class="feather" filter="url(#emboss)" fill="url(#intricate)" stroke="#ffd700" stroke-width="0.6" d="M300,440 C340,410 380,370 420,330 C460,290 480,270 500,260 C520,250 540,250 550,260 C560,270 560,290 550,320 C540,350 510,390 450,430 C390,470 300,440 300,440 Z"/>
        <!--  小1 -->
        <path id="f4" class="feather" filter="url(#emboss)" transform="translate(-10,180) rotate(30,300,400) scale(0.8)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 Z"/>
        <!-- 小2 -->
        <path id="f5" class="feather" filter="url(#emboss)" transform="translate(10,270) rotate(30,300,400) scale(0.7)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 Z"/>
        <!-- 小3 -->
        <path id="f6" class="feather" filter="url(#emboss)" transform="translate(0,320) rotate(40,300,400) scale(0.6)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 Z"/>
      </g> 

      <!-- 流光沿羽毛边缘 -->
      <g>
        <path class="flow-line" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 Q500,60 540,60"/>
        <path class="flow-line" d="M300,420 C330,380 360,340 390,300 C420,260 440,230 460,210"/>
        <path class="flow-line" d="M300,440 C340,410 380,370 420,330 C460,290 480,270 500,260"/>
        <path class="flow-line" transform="translate(-10,180) rotate(30,300,400) scale(0.8)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 "/>
       
        <path class="flow-line" transform="translate(10,270) rotate(30,300,400) scale(0.7)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 "/>

       <path class="flow-line" transform="translate(0,320) rotate(40,300,400) scale(0.6)" d="M300,400 C320,350 340,300 360,250 C380,200 400,160 420,130 C440,100 460,80 480,70 C500,60 520,55 540,60 Q550,80 540,100 T520,140 C500,180 460,240 400,310 C340,380 300,400 300,400 "/>
      </g>

      <!-- 细节高光 -->
      <g stroke="#fff" stroke-width="0.5" opacity="0.6">
        <path d="M320,360 L540,140"/>
        <path d="M340,380 L560,160"/>
        <path d="M360,400 L580,180"/>
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  name: 'WingDecoration',
};
</script>

<style scoped>
body { background: #1a1a1a; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; perspective: 1000px; }
.wing-container { width: 600px; height: 800px; transform-style: preserve-3d; animation: flap3d 2s infinite ease-in-out alternate; transform-origin: center center; }
.wing { width: 100%; height: 100%; transform-origin: 300px 400px; }
.feather { stroke: #aaa; stroke-width: 0.8; fill: url(#metalGrad); fill-opacity: 0.96; }
.flow-line { fill: none; stroke: url(#flowGrad); stroke-width: 4; stroke-dasharray: 60; stroke-dashoffset: 0; opacity: 0.7; animation: flowMove 4s infinite linear; }
@keyframes flap3d { 0% { transform: rotateY(-65deg) rotateX(5deg); } 50% { transform: rotateY(0deg) rotateX(0deg); } 100% { transform: rotateY(95deg) rotateX(-5deg); } }
@keyframes flowMove { to { stroke-dashoffset: -60; } }
</style>
