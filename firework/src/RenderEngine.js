import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class RenderEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // 1. Scene
        this.scene = new THREE.Scene();
        // 稍微加点雾气增加深邃感
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 20);
        this.camera.lookAt(0, 5, 0);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // 色调映射，防止颜色过曝变全白，保留色彩
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // 4. Post-processing (Bloom)
        this.initPostProcessing();

        // Resize Listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initPostProcessing() {
        this.renderScene = new RenderPass(this.scene, this.camera);

        // 核心：泛光滤镜
        // resolution, strength, radius, threshold
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 
            2.0,  // Strength: 强度，越高越亮
            0.4,  // Radius: 扩散半径
            0.1   // Threshold: 只有亮度超过这个值的像素才会发光
        );

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(this.renderScene);
        this.composer.addPass(this.bloomPass);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        // 使用 composer 渲染代替 renderer.render
        this.composer.render();
    }
}