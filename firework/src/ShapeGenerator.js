import * as THREE from 'three';

export const ShapeGenerator = {
    getSpherePoints: (count) => {
        const points = [];
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = Math.pow(Math.random(), 1/3);
            points.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi)
            });
        }
        return points;
    },
    getHeartPoints: (count) => {
        const points = [];
        for (let i = 0; i < count; i++) {
            let t = Math.random() * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            const z = (Math.random() - 0.5) * 2;
            const scale = 0.05; 
            points.push({ x: x * scale, y: y * scale, z: z * scale });
        }
        return points;
    },
    getWingPoints: (count) => {
        const points = [];
        for(let i=0; i<count; i++){
            const t = Math.random() * 10;
            const sign = Math.random() > 0.5 ? 1 : -1;
            const x = sign * t * Math.cos(t) * 0.5;
            const y = t * 0.5;
            const z = t * Math.sin(t) * 0.5;
            points.push({ x: x + (Math.random()-0.5), y: y + (Math.random()-0.5), z: z });
        }
        return points;
    },

    // === 修改核心：getTextPoints ===
    getTextPoints: (text) => {
        const points = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 1000;
        const height = 300;
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#ffffff';
        
        // === 修改 1: 字体大小策略 ===
        let fontSize = 250; // 默认倒计时数字的大小
        
        if (text === "2026") {
            fontSize = 350; // 给 2026 超大字号！
        } else if (text.length > 2) {
            fontSize = 180; // "新年快乐" 保持适中
        }
        
        ctx.font = `900 ${fontSize}px "Arial Black", sans-serif`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const gap = 4; 

        for (let y = 0; y < height; y += gap) {
            for (let x = 0; x < width; x += gap) {
                const index = (y * width + x) * 4;
                if (data[index] > 128) { 
                    
                    // === 修改 2: 缩放比例 ===
                    // 如果是 2026，缩放比例也给大一点(0.06)，让它更宽更壮
                    // 其他文字保持 0.05
                    const scale = (text === "2026") ? 0.06 : 0.05; 
                    
                    const pX = (x - width / 2) * scale;
                    const pY = -(y - height / 2) * scale; 
                    
                    points.push({
                        x: pX,
                        y: pY,
                        z: (Math.random() - 0.5) * 1.0 
                    });
                }
            }
        }
        return points;
    }
};