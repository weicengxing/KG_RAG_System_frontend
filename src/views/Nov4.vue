<template>
    <div class="vip-badge">
        <div class="purple-flow"></div>
        <div class="badge-content">
            <div class="ornate-border"></div>
            <div class="heraldic-pattern"></div>
            <div class="border-sparkles">
                <div class="border-sparkle" style="top: 10%; left: 10%;"></div>
                <div class="border-sparkle" style="top: 50%; right: 20%;"></div>
                <div class="border-sparkle" style="bottom: 30%; left: 40%;"></div>
                <div class="border-sparkle" style="bottom: 10%; right: 10%;"></div>
                <div class="border-sparkle" style="top: 20%; right: 50%;"></div>
            </div>
            <div class="royal-crown">
                <div class="royal-crown-peak"></div>
                <div class="royal-crown-side-left"></div>
                <div class="royal-crown-side-right"></div>
                <div class="royal-crown-jewels">
                    <div class="crown-jewel"></div>
                    <div class="crown-jewel"></div>
                    <div class="crown-jewel"></div>
                </div>
            </div>
            <div class="vip-text">VIP</div>
            <div class="light-effect"></div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Nov4',
  // 如果有需要，可以在这里添加 props, data, methods 等
});
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
            0 0 10px #C0C0C0,
            0 0 20px silver,
            0 0 30px #E6E6E6;
        border-color: #C0C0C0;
    }
    50% {
        box-shadow:
            0 0 20px silver,
            0 0 40px #E6E6E6,
            0 0 60px white;
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
* {
    box-sizing: border-box;
}
body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #1a1a1a;
    font-family: 'Arial Black', sans-serif;
    margin: 0;
    overflow: hidden;
}
.vip-badge {
    width: 350px;
    height: 230px;
    background: linear-gradient(135deg, #FFD700, #DAA520);
    border-radius: 40px;
    position: relative;
    overflow: hidden;
    box-shadow:
        0 20px 45px rgba(0,0,0,0.5),
        0 10px 25px rgba(255,215,0,0.4);
    border: 8px solid #B8860B;
    animation: silver-border-glow 3s infinite;
    transform: perspective(1500px) rotateX(15deg) rotateY(-15deg);
    display: flex;
    flex-direction: column;
}
.purple-flow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 10%;
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
.badge-content {
    position: relative;
    flex-grow: 1;
    overflow: hidden;
}
.border-sparkles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10;
}
.border-sparkle {
    position: absolute;
    width: 3%;
    height: 3%;
    background: radial-gradient(circle, white, silver, transparent);
    border-radius: 50%;
    opacity: 0;
    animation: border-sparkle 2s infinite;
}
.ornate-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2% solid transparent;
    border-image: repeating-linear-gradient(
        45deg,
        #FFD700,
        #B8860B 10%,
        #FFD700 20%
    ) 1;
    z-index: 4;
    pointer-events: none;
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
            transparent 6%,
            rgba(0,0,0,0.06) 6%,
            rgba(0,0,0,0.06) 12%
        ),
        repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 6%,
            rgba(0,0,0,0.04) 6%,
            rgba(0,0,0,0.04) 12%
        );
    opacity: 0.4;
    z-index: 5;
}
.vip-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 4rem;
    font-weight: bold;
    color: silver;
    text-shadow:
        4px 4px 8px rgba(0,0,0,0.6),
        -4px -4px 8px rgba(255,255,255,0.4);
    letter-spacing: 12px;
    z-index: 6;
}
.royal-crown {
    position: absolute;
    top: 0;
    left: 50%;
    width: 200px;
    height: 100px;
    transform: translateX(-50%);
    z-index: 7;
}
.royal-crown-peak {
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 80px solid #FFD700;
    transform: translateX(-50%);
}
.royal-crown-side-left {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 70px solid #DAA520;
    transform: rotate(-20deg);
}
.royal-crown-side-right {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid transparent;
    border-bottom: 70px solid #DAA520;
    transform: rotate(20deg);
}
.royal-crown-jewels {
    position: absolute;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
}
.crown-jewel {
    width: 20px;
    height: 20px;
    background: radial-gradient(circle at center, #FF4500, #8B0000);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255,69,0,0.7);
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

/* Note: The original HTML included body styles.
   In a Vue component, you typically style the component's root element
   or use global styles. I've included the body styles here for reference,
   but they might need adjustment depending on how this component is used.
   For example, you might apply these styles to a container div within the template.
*/
/*
body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #1a1a1a;
    font-family: 'Arial Black', sans-serif;
    margin: 0;
    overflow: hidden;
}
*/
</style>
