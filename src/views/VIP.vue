<template>
  <div class="vip-badge">
    <div class="purple-flow"></div>
    <div class="ornate-border"></div>
    <div class="heraldic-pattern"></div>
    <div class="border-sparkles">
      <!-- 随机位置的闪光 -->
      <div class="border-sparkle" style="top: 10px; left: 10px;"></div>
      <div class="border-sparkle" style="top: 50px; right: 20px;"></div>
      <div class="border-sparkle" style="bottom: 30px; left: 40px;"></div>
      <div class="border-sparkle" style="bottom: 10px; right: 10px;"></div>
      <div class="border-sparkle" style="top: 20px; right: 50px;"></div>
    </div>
    <div class="royal-crown">
      <div class="center-peak"></div>
      <div class="jewels">
        <div class="jewel"></div>
        <div class="jewel"></div>
        <div class="jewel"></div>
      </div>
    </div>
    <div class="vip-text">VIP</div>
    <div class="light-effect"></div>
  </div>
</template>

<script>
export default {
  name: 'Vip',
};
</script>

<style scoped>
@keyframes purple-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes jewel-shimmer {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(10deg); }
}
@keyframes crown-shine {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes silver-border-glow {
  0%, 100% {
    box-shadow:
      0 0 15px #C0C0C0, /* Increased blur */
      0 0 30px silver, /* Increased blur */
      0 0 45px #E6E6E6; /* Increased blur */
    border-color: #C0C0C0;
  }
  50% {
    box-shadow:
      0 0 30px silver, /* Increased blur */
      0 0 60px #E6E6E6, /* Increased blur */
      0 0 90px white; /* Increased blur */
    border-color: white;
  }
}
@keyframes border-sparkle {
  0%, 100% { opacity: 0; }
  50% {
    opacity: 1;
    transform: rotate(360deg) scale(1.2);
  }
}

.vip-badge {
  width: 15px;
  height: 12px;
  background: linear-gradient(135deg, #FFD700, #DAA520);
  border-radius: 30px; /* Adjusted */
  position: relative;
  overflow: hidden;
  box-shadow:
    0 15px 30px rgba(0,0,0,0.5), /* Adjusted */
    0 8px 20px rgba(255,215,0,0.4); /* Adjusted */
  border: 6px solid #B8860B; /* Adjusted */
  animation: silver-border-glow 3s infinite;
  transform: perspective(1500px) rotateX(15deg) rotateY(-15deg);
  z-index: 100; /* Added z-index */
}
.border-sparkles {
  position: absolute;
  top: -5px; /* Adjusted */
  left: -5px; /* Adjusted */
  right: -5px; /* Adjusted */
  bottom: -5px; /* Adjusted */
  pointer-events: none;
  z-index: 10;
}
.border-sparkle {
  position: absolute;
  width: 10px; /* Adjusted */
  height: 10px; /* Adjusted */
  background: radial-gradient(circle, white, silver, transparent);
  border-radius: 50%;
  opacity: 0;
  animation: border-sparkle 2s infinite;
}
.purple-flow {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  height: 50px;
  background: linear-gradient(
    45deg,
    #8A2BE2,
    #9400D3,
    #4B0082,
    #8A2BE2
  );
  background-size: 400% 400%;
  animation: purple-flow 10s ease infinite;
  opacity: 0.7;
  filter: blur(15px);
  z-index: 2;
}
.vip-badge::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: repeating-linear-gradient(
    45deg,
    rgba(255,255,255,0.07) 0%,
    rgba(255,255,255,0.07) 10%,
    transparent 10%,
    transparent 20%
  );
  transform: rotate(45deg);
  z-index: 3;
}
.ornate-border {
  position: absolute;
  top: -8px; /* Adjusted */
  left: -8px; /* Adjusted */
  right: -8px; /* Adjusted */
  bottom: -8px; /* Adjusted */
  border: 8px solid transparent; /* Adjusted */
  border-image: repeating-linear-gradient(
    45deg,
    #FFD700,
    #B8860B 10%,
    #FFD700 20%
  ) 1;
  z-index: 4;
}
.heraldic-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 25px,
      rgba(0,0,0,0.06) 25px,
      rgba(0,0,0,0.06) 50px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 25px,
      rgba(0,0,0,0.04) 25px,
      rgba(0,0,0,0.04) 50px
    );
  opacity: 0.4;
  z-index: 5;
}
.vip-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px; /* Adjusted */
  font-weight: bold;
  color: silver;
  text-shadow:
    1px 1px 2px rgba(0,0,0,0.6), /* Adjusted */
    -1px -1px 2px rgba(255,255,255,0.4); /* Adjusted */
  letter-spacing: 2px; /* Adjusted */
  z-index: 6;
}
.royal-crown {
  position: absolute;
  top: -15px; /* Adjusted */
  left: 50%;
  transform: translateX(-50%);
  width: 60px; /* Adjusted */
  height: 30px; /* Adjusted */
  z-index: 7;
  animation: crown-shine 4s infinite;
}
.royal-crown::before,
.royal-crown::after {
  content: '';
  position: absolute;
  top: 0;
  width: 0;
  height: 0;
  border-left: 15px solid transparent; /* Adjusted */
  border-right: 15px solid transparent; /* Adjusted */
  border-bottom: 20px solid #FFD700; /* Adjusted */
  filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.4)); /* Adjusted */
}
.royal-crown::before {
  left: 0;
  transform: rotate(-25deg);
}
.royal-crown::after {
  right: 0;
  transform: rotate(25deg);
}
.royal-crown .center-peak {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent; /* Adjusted */
  border-right: 12px solid transparent; /* Adjusted */
  border-bottom: 25px solid #DAA520; /* Adjusted */
  filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.5)); /* Adjusted */
}
.royal-crown .jewels {
  position: absolute;
  top: 8px; /* Adjusted */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px; /* Adjusted */
}
.jewel {
  width: 6px; /* Adjusted */
  height: 6px; /* Adjusted */
  background: radial-gradient(circle at center, #FF4500, #8B0000);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(255,69,0,0.8); /* Adjusted */
  animation: jewel-shimmer 3s infinite;
}
.light-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.2) 0%,
    rgba(255,255,255,0) 50%
  );
  z-index: 8;
  pointer-events: none;
}
</style>
