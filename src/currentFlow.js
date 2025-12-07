// currentFlow.js - Visualización del flujo de corriente hacia tierra

import * as THREE from 'three';
import { currentFlowShader } from '../shaders/currentShader.js';

export class CurrentFlowSystem {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'current-flow';

        // Parámetros del flujo
        this.intensity = 1.0;
        this.flowSpeed = 1.0;
        this.particleCount = 2000;
        this.maxRadius = 10;

        // Sistema de partículas
        this.particleSystem = null;
        this.flowLines = [];

        // Colores del flujo
        this.highIntensityColor = new THREE.Color(0xffff00);
        this.lowIntensityColor = new THREE.Color(0x00ff88);

        // Estado
        this.isActive = true;
        this.time = 0;

        this.createParticleSystem();
        this.createFlowLines();

        scene.add(this.group);
    }

    createParticleSystem() {
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const phases = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            // Distribuir partículas desde el centro hacia afuera
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.maxRadius;
            const depth = -Math.random() * 3; // Bajo tierra

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = depth;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Color basado en distancia (más intenso cerca del centro)
            const t = radius / this.maxRadius;
            const color = this.highIntensityColor.clone().lerp(this.lowIntensityColor, t);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.1 + Math.random() * 0.1;
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: this.intensity },
                pointTexture: { value: this.createParticleTexture() }
            },
            vertexShader: `
        attribute float size;
        attribute float phase;
        varying vec3 vColor;
        varying float vPhase;
        uniform float time;
        uniform float intensity;
        
        void main() {
          vColor = color;
          vPhase = phase;
          
          vec3 pos = position;
          
          // Movimiento ondulante
          float wave = sin(time * 3.0 + phase + length(pos.xz) * 0.5) * 0.1;
          pos.y += wave * intensity;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z) * intensity;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vPhase;
        uniform float time;
        
        void main() {
          vec2 uv = gl_PointCoord;
          float alpha = 1.0 - length(uv - 0.5) * 2.0;
          alpha = clamp(alpha, 0.0, 1.0);
          
          // Parpadeo eléctrico
          float flicker = 0.7 + 0.3 * sin(time * 10.0 + vPhase * 5.0);
          
          gl_FragColor = vec4(vColor * flicker, alpha * 0.8);
        }
      `,
            transparent: true,
            vertexColors: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.group.add(this.particleSystem);
    }

    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 128, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createFlowLines() {
        // Crear líneas de flujo desde el centro hacia las varillas
        const rodCount = 4;
        const rodSpacing = 3;

        for (let i = 0; i < rodCount; i++) {
            const angle = (i / rodCount) * Math.PI * 2;
            const endX = Math.cos(angle) * rodSpacing;
            const endZ = Math.sin(angle) * rodSpacing;

            this.createFlowLine(0, 0, endX, endZ);
        }

        // Líneas radiales adicionales
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const length = 5 + Math.random() * 3;
            const endX = Math.cos(angle) * length;
            const endZ = Math.sin(angle) * length;

            this.createFlowLine(0, 0, endX, endZ);
        }
    }

    createFlowLine(startX, startZ, endX, endZ) {
        const points = [];
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            const z = startZ + (endZ - startZ) * t;
            // La corriente fluye bajo tierra
            const y = -0.3 - Math.sin(t * Math.PI) * 0.5;
            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: this.intensity },
                color1: { value: this.highIntensityColor },
                color2: { value: this.lowIntensityColor }
            },
            vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        void main() {
          // Animación de flujo
          float flow = fract(vUv.x * 3.0 - time * 2.0);
          flow = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);
          
          vec3 color = mix(color2, color1, flow);
          float alpha = (0.3 + flow * 0.7) * intensity;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const line = new THREE.Mesh(geometry, material);
        this.flowLines.push(line);
        this.group.add(line);
    }

    setIntensity(value) {
        this.intensity = Math.max(0, Math.min(2, value));

        if (this.particleSystem) {
            this.particleSystem.material.uniforms.intensity.value = this.intensity;
        }

        for (const line of this.flowLines) {
            line.material.uniforms.intensity.value = this.intensity;
        }
    }

    setFlowSpeed(speed) {
        this.flowSpeed = speed;
    }

    setActive(active) {
        this.isActive = active;
        this.group.visible = active;
    }

    updateColors(resistance) {
        // Cambiar colores según la resistencia
        if (resistance <= 5) {
            this.highIntensityColor.setHex(0x00ff00); // Verde - excelente
            this.lowIntensityColor.setHex(0x00ff88);
        } else if (resistance <= 10) {
            this.highIntensityColor.setHex(0xffff00); // Amarillo - bueno
            this.lowIntensityColor.setHex(0x88ff00);
        } else if (resistance <= 25) {
            this.highIntensityColor.setHex(0xffaa00); // Naranja - advertencia
            this.lowIntensityColor.setHex(0xffff00);
        } else {
            this.highIntensityColor.setHex(0xff4400); // Rojo - peligro
            this.lowIntensityColor.setHex(0xff8800);
        }

        // Actualizar colores de las líneas
        for (const line of this.flowLines) {
            line.material.uniforms.color1.value.copy(this.highIntensityColor);
            line.material.uniforms.color2.value.copy(this.lowIntensityColor);
        }

        // Actualizar partículas
        this.updateParticleColors();
    }

    updateParticleColors() {
        if (!this.particleSystem) return;

        const colors = this.particleSystem.geometry.attributes.color;
        const positions = this.particleSystem.geometry.attributes.position;

        for (let i = 0; i < this.particleCount; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const radius = Math.sqrt(x * x + z * z);
            const t = radius / this.maxRadius;

            const color = this.highIntensityColor.clone().lerp(this.lowIntensityColor, t);
            colors.setXYZ(i, color.r, color.g, color.b);
        }

        colors.needsUpdate = true;
    }

    updateFlowPattern(rodCount, rodSpacing, radialCount, radialLength) {
        // Limpiar líneas existentes
        for (const line of this.flowLines) {
            this.group.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        }
        this.flowLines = [];

        // Crear nuevas líneas hacia las varillas
        for (let i = 0; i < rodCount; i++) {
            const angle = (i / rodCount) * Math.PI * 2;
            const endX = Math.cos(angle) * rodSpacing;
            const endZ = Math.sin(angle) * rodSpacing;
            this.createFlowLine(0, 0, endX, endZ);
        }

        // Líneas hacia radiales
        for (let i = 0; i < radialCount; i++) {
            const angle = (i / radialCount) * Math.PI * 2;
            const endX = Math.cos(angle) * radialLength;
            const endZ = Math.sin(angle) * radialLength;
            this.createFlowLine(0, 0, endX, endZ);
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.time += deltaTime * this.flowSpeed;

        // Actualizar shader uniforms
        if (this.particleSystem) {
            this.particleSystem.material.uniforms.time.value = this.time;

            // Animar partículas moviéndose hacia afuera
            const positions = this.particleSystem.geometry.attributes.position;

            for (let i = 0; i < this.particleCount; i++) {
                let x = positions.getX(i);
                let y = positions.getY(i);
                let z = positions.getZ(i);

                // Mover hacia afuera
                const angle = Math.atan2(z, x);
                const radius = Math.sqrt(x * x + z * z);
                const newRadius = radius + deltaTime * 2 * this.flowSpeed;

                if (newRadius > this.maxRadius) {
                    // Reiniciar cerca del centro
                    const newAngle = Math.random() * Math.PI * 2;
                    const startRadius = 0.5 + Math.random() * 0.5;
                    x = Math.cos(newAngle) * startRadius;
                    z = Math.sin(newAngle) * startRadius;
                    y = -0.3;
                } else {
                    x = Math.cos(angle) * newRadius;
                    z = Math.sin(angle) * newRadius;
                    // Profundidad variable
                    y = -0.3 - Math.sin((newRadius / this.maxRadius) * Math.PI) * 1.5;
                }

                positions.setXYZ(i, x, y, z);
            }

            positions.needsUpdate = true;
        }

        // Actualizar líneas de flujo
        for (const line of this.flowLines) {
            line.material.uniforms.time.value = this.time;
        }
    }

    dispose() {
        if (this.particleSystem) {
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }

        for (const line of this.flowLines) {
            line.geometry.dispose();
            line.material.dispose();
        }

        this.scene.remove(this.group);
    }
}

export default CurrentFlowSystem;
