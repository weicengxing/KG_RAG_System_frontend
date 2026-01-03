import * as THREE from 'three';
import { Utils } from './Utils.js';
import { ShapeGenerator } from './ShapeGenerator.js';

const PARTICLE_COUNT = 3000; 
const GRAVITY = 0.005;

export class Firework {
    constructor(scene, texture, params = {}) {
        this.scene = scene;
        this.texture = texture;
        this.isDead = false;
        this.trails = [];
        
        this.targetShapePoints = params.shapePoints || null; 
        this.color = params.color || Utils.getRandomColor();
        this.isText = !!params.isText; 

        this.state = 'launch'; 
        
        // 位置设定
        if (this.isText) {
            this.startPos = new THREE.Vector3(0, -15, 0);
            this.targetPos = new THREE.Vector3(0, 9, 0); 
        } else {
            const isLeft = Math.random() > 0.5;
            const minX = isLeft ? -20 : 6;
            const maxX = isLeft ? -6 : 20;
            const x = Utils.random(minX, maxX); 
            const y = Utils.random(0, 10); 
            
            this.startPos = new THREE.Vector3(x, -15, (Math.random() - 0.5) * 5);
            this.targetPos = new THREE.Vector3(x, y, (Math.random() - 0.5) * 5);
        }
        
        this.position = this.startPos.clone();

        const height = this.targetPos.y - this.startPos.y;
        const speedY = Math.sqrt(2 * GRAVITY * height) * 1.02;
        const totalTime = speedY / GRAVITY; 
        const speedX = (this.targetPos.x - this.startPos.x) / totalTime;
        const speedZ = (this.targetPos.z - this.startPos.z) / totalTime;
        this.launchSpeed = new THREE.Vector3(speedX, speedY, speedZ);

        this.initLaunchGeometry();
    }

    initLaunchGeometry() {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.startPos.toArray(), 3));
        const material = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, map: this.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);
    }

    createTrail() {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([this.position.x, this.position.y, this.position.z], 3));
        const material = new THREE.PointsMaterial({ size: 0.8, color: this.color, map: this.texture, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
        const trailPoint = new THREE.Points(geometry, material);
        this.scene.add(trailPoint);
        this.trails.push({ mesh: trailPoint, life: 0.8 });
    }

    explode() {
        this.state = 'explode';
        this.explodeTimer = 0; 

        this.scene.remove(this.points);
        let shapePoints = this.targetShapePoints;
        if (!shapePoints) {
            const type = Math.random();
            if (type > 0.7) shapePoints = ShapeGenerator.getHeartPoints(PARTICLE_COUNT);
            else if (type > 0.4) shapePoints = ShapeGenerator.getWingPoints(PARTICLE_COUNT);
            else shapePoints = ShapeGenerator.getSpherePoints(PARTICLE_COUNT);
        }
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const colors = [];
        shapePoints.forEach(p => {
            positions.push(this.position.x, this.position.y, this.position.z);
            if (this.isText) {
                const speed = 0.12; 
                velocities.push(p.x * speed, p.y * speed, p.z * speed);
            } else {
                velocities.push(p.x * 0.5 + (Math.random()-0.5) * 0.1, p.y * 0.5 + (Math.random()-0.5) * 0.1, p.z * 0.5 + (Math.random()-0.5) * 0.1);
            }
            const c = this.isText ? new THREE.Color(0xffd700) : this.color;
            colors.push(c.r, c.g, c.b);
        });
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({ size: this.isText ? 0.2 : 0.3, vertexColors: true, map: this.texture, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);
        this.life = 1.0;
    }

    update() {
        if (this.state === 'launch') {
            this.position.add(this.launchSpeed);
            this.points.geometry.attributes.position.setXYZ(0, this.position.x, this.position.y, this.position.z);
            this.points.geometry.attributes.position.needsUpdate = true;
            if (Math.random() > 0.2) this.createTrail(); 
            this.launchSpeed.y -= GRAVITY; 
            if (this.launchSpeed.y <= 0 || this.position.y >= this.targetPos.y) this.explode();
        } 
        else if (this.state === 'explode') {
            const positions = this.points.geometry.attributes.position.array;
            const velocities = this.points.geometry.attributes.velocity.array;
            const count = positions.length / 3;

            this.explodeTimer++;
            const holdTime = 40; // 定格40帧 (约0.6秒)
            const isHolding = this.isText && this.explodeTimer < holdTime;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                
                // 位置更新
                positions[i3]     += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];

                let friction, gravity;

                if (this.isText) {
                    if (isHolding) {
                        // 定格期：强力刹车
                        friction = 0.85; 
                        gravity = 0.0;
                    } else {
                        // === 散开期：关键修改 ===
                        friction = 0.94; // 阻力减小，允许移动
                        gravity = 0.002; // 轻微重力

                        // 计算“排斥力”：粒子当前位置 减去 爆炸中心位置
                        // 这样每个粒子都会获得一个背离中心的速度
                        const dx = positions[i3] - this.targetPos.x;
                        const dy = positions[i3+1] - this.targetPos.y;
                        const dz = positions[i3+2] - this.targetPos.z;

                        // 施加排斥力 (0.002 是力度系数，可微调)
                        velocities[i3]     += dx * 0.002;
                        velocities[i3 + 1] += dy * 0.002;
                        velocities[i3 + 2] += dz * 0.002;

                        // 再加一点随机紊流，模拟风吹乱
                        velocities[i3]     += (Math.random() - 0.5) * 0.005;
                        velocities[i3 + 1] += (Math.random() - 0.5) * 0.005;
                        velocities[i3 + 2] += (Math.random() - 0.5) * 0.005;
                    }
                } else {
                    friction = 0.96;
                    gravity = GRAVITY * 0.6;
                }
                
                velocities[i3]     *= friction;
                velocities[i3 + 1] *= friction;
                velocities[i3 + 2] *= friction;
                
                velocities[i3 + 1] -= gravity;
            }

            this.points.geometry.attributes.position.needsUpdate = true;
            
            let decay;
            if (this.isText) {
                // 散开时衰减变快
                decay = isHolding ? 0.001 : 0.015; 
            } else {
                decay = 0.015;
            }
            
            this.life -= decay;
            this.points.material.opacity = this.life;
            
            if (this.life <= 0) {
                this.scene.remove(this.points);
                this.isDead = true;
            }
        }
        
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= 0.04; 
            t.mesh.material.opacity = t.life;
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                this.trails.splice(i, 1);
            }
        }
    }
}