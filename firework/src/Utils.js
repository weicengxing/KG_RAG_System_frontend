import * as THREE from 'three';

export const Utils = {
    // 生成随机数
    random: (min, max) => Math.random() * (max - min) + min,

    // 动态生成辉光粒子纹理 (避免加载图片)
    createParticleTexture: () => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 绘制径向渐变：中心亮白 -> 外部透明
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    },

    // 随机选择颜色 (偏向截图中的红/粉/紫/金)
    getRandomColor: () => {
        const colors = [
            new THREE.Color(0xff0040), // 艳红
            new THREE.Color(0xff00ff), // 紫红
            new THREE.Color(0xffbd00), // 金黄
            new THREE.Color(0x00ffff), // 青色(点缀)
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};