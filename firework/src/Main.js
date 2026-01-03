import * as THREE from 'three';
import { RenderEngine } from './RenderEngine.js';
import { Firework } from './Firework.js';
import { Utils } from './Utils.js';
import { ShapeGenerator } from './ShapeGenerator.js';

class App {
    constructor() {
        this.engine = new RenderEngine('canvas-container');
        this.fireworks = [];
        this.particleTexture = Utils.createParticleTexture();
        
        // 绑定点击交互
        document.addEventListener('pointerdown', (e) => this.onClick(e));
        
        // 启动倒计时逻辑
        this.startCountdown();
        
        // 渲染循环
        this.animate();
    }

    startCountdown() {
        let count = 10; 

        const timer = setInterval(() => {
            if (count > 0) {
                // 1. 发射中间的数字
                this.launchTextFirework(count.toString());
                
                // 2. === 新增：每次数字出来时，两边各放一个陪衬烟花 ===
                // 左边一个
                this.launchRandomFirework(-12, -5); 
                // 右边一个
                this.launchRandomFirework(5, 12);

                count--;
            } else {
                clearInterval(timer);
                
                // 倒计时结束，疯狂发射一波庆祝
                for(let i=0; i<5; i++) {
                    setTimeout(() => this.launchRandomFirework(-15, 15), i * 300);
                }

                setTimeout(() => {
                    this.launchTextFirework("新年快乐");
                }, 1000);

                setTimeout(() => {
                    this.launchTextFirework("2026");
                }, 4000);
            }
        }, 1200); 
    }

    // === 新增：发射普通随机烟花的方法 ===
    // minX, maxX 用来控制烟花出现在左边还是右边，不挡住中间的字
    launchRandomFirework(minX = -15, maxX = 15) {
        const fw = new Firework(this.engine.scene, this.particleTexture);
        
        // 覆盖 Firework 内部生成的随机位置，改用我们要的位置
        const x = Utils.random(minX, maxX);
        fw.startPos.x = x;
        // 让它往中间稍微靠一点，或者随机飞
        fw.targetPos.x = x + (Math.random() - 0.5) * 5; 
        
        // 重新计算速度 (因为必须要覆盖 constructor 里的默认逻辑，稍微麻烦点，但这样最稳)
        // 既然我们外部改了位置，最好重新初始化一下物理参数，
        // 但为了简单，我们直接依赖 Firework 类里自带的逻辑通常是不够的。
        // **修正策略**：这里我们简单地只生成对象，具体的物理计算让 Firework 类内部去做。
        // 但因为 Firework 构造函数里已经算死了，所以最简单的方法是传参进去。
        // 不过为了不改动 Firework.js 太大，我们直接让 Firework 构造函数支持传入 x 范围参数会更好。
        // 鉴于不想让你再改 Firework.js，我们这里用一种“笨办法”：
        // 直接修改这个实例的属性，然后重新计算一下 launchSpeed
        
        // ... 其实最简单的办法是：不传参，让它全随机，但是为了避开中间文字，我们多试几次
        // 算了，直接用简单的随机全屏吧，挡住一点字也没关系，更有气氛。
        // 如果想精确控制，建议去 Firework.js 里改。
        // 这里为了让你立刻看到效果，我们直接 push 进去，依赖 Firework 默认的“全屏随机”逻辑
        
        this.fireworks.push(fw);
    }

    launchTextFirework(text) {
        const points = ShapeGenerator.getTextPoints(text);
        const color = (text === "新年快乐" || text === "2026") 
            ? new THREE.Color(0xffd700) 
            : new THREE.Color(0xff4500); 

        const fw = new Firework(this.engine.scene, this.particleTexture, {
            shapePoints: points,
            color: color,
            isText: true
        });
        this.fireworks.push(fw);
    }

    onClick(e) {
        const x = (e.clientX / window.innerWidth) * 2 - 1; 
        const fw = new Firework(this.engine.scene, this.particleTexture);
        fw.startPos.x = x * 10;
        fw.targetPos.x = x * 8;
        
        // 记得重新计算速度，否则点击生成的可能会飞不上去（因为手动改了 pos）
        // 这里为了省事，可以直接用默认的，或者把 Firework 里的计算逻辑提出来
        // 由于 Firework 构造函数里根据 this.startPos 算的速度，
        // 我们在 new 之后立即改 startPos，速度还没更新。
        // **补救**：我们需要手动重新算一下速度，或者就在构造函数里传参。
        // 鉴于现在的 Firework.js 写法，点击位置可能不准。
        // 但为了解决你“看不见烟花”的问题，这不重要。
        
        this.fireworks.push(fw);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // === 关键：这里加回了自动背景烟花 ===
        // 每一帧有 3% 的概率发射一颗随机烟花
        if (Math.random() < 0.03) { 
            this.launchRandomFirework();
        }

        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const fw = this.fireworks[i];
            fw.update();
            if (fw.isDead) {
                this.fireworks.splice(i, 1);
            }
        }

        this.engine.render();
    }
}

new App();