// climate.js - Simulación de clima y efectos atmosféricos

import * as THREE from 'three';

export class ClimateSystem {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'climate-system';

        // Estado del clima
        this.weather = 'sunny'; // sunny, rain, snow, storm
        this.timeOfDay = 0.5; // 0 = medianoche, 0.5 = mediodía
        this.humidity = 0.5;

        // Sistemas de partículas
        this.rainSystem = null;
        this.snowSystem = null;

        // Iluminación
        this.sunLight = null;
        this.moonLight = null;
        this.ambientLight = null;

        // Cielo
        this.sky = null;

        // Niebla
        this.fogDensity = 0;

        this.setupLighting();
        this.createSky();
        this.createRainSystem();
        this.createSnowSystem();

        scene.add(this.group);
    }

    setupLighting() {
        // Luz ambiental
        this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(this.ambientLight);

        // Sol
        this.sunLight = new THREE.DirectionalLight(0xffffee, 1.5);
        this.sunLight.position.set(50, 80, 30);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.scene.add(this.sunLight);

        // Luna
        this.moonLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        this.moonLight.position.set(-30, 50, -20);
        this.moonLight.visible = false;
        this.scene.add(this.moonLight);

        // Luz hemisférica para mejor iluminación ambiental
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x654321, 0.5);
        this.scene.add(hemiLight);
    }

    createSky() {
        // Cielo gradiente
        const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
            side: THREE.BackSide
        });

        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
    }

    createRainSystem() {
        const rainCount = 15000;
        const rainGeometry = new THREE.BufferGeometry();

        const positions = new Float32Array(rainCount * 3);
        const velocities = new Float32Array(rainCount);

        for (let i = 0; i < rainCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            velocities[i] = 0.5 + Math.random() * 0.5;
        }

        rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const rainMaterial = new THREE.PointsMaterial({
            color: 0xaaaacc,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        this.rainSystem = new THREE.Points(rainGeometry, rainMaterial);
        this.rainSystem.visible = false;
        this.group.add(this.rainSystem);
    }

    createSnowSystem() {
        const snowCount = 10000;
        const snowGeometry = new THREE.BufferGeometry();

        const positions = new Float32Array(snowCount * 3);
        const velocities = new Float32Array(snowCount * 3);

        for (let i = 0; i < snowCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            // Velocidad con algo de movimiento lateral
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = 0.05 + Math.random() * 0.05;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
        }

        snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        snowGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.8
        });

        this.snowSystem = new THREE.Points(snowGeometry, snowMaterial);
        this.snowSystem.visible = false;
        this.group.add(this.snowSystem);
    }

    setWeather(weather) {
        this.weather = weather;

        // Ocultar todos los sistemas
        this.rainSystem.visible = false;
        this.snowSystem.visible = false;

        // Resetear niebla
        this.scene.fog = null;

        switch (weather) {
            case 'rain':
                this.rainSystem.visible = true;
                this.humidity = 0.9;
                this.scene.fog = new THREE.FogExp2(0x666688, 0.01);
                this.updateSkyColors(0x555566, 0x888899);
                break;

            case 'snow':
                this.snowSystem.visible = true;
                this.humidity = 0.7;
                this.scene.fog = new THREE.FogExp2(0xcccccc, 0.015);
                this.updateSkyColors(0xaaaacc, 0xddddee);
                break;

            case 'storm':
                this.rainSystem.visible = true;
                this.humidity = 1.0;
                this.scene.fog = new THREE.FogExp2(0x333344, 0.02);
                this.updateSkyColors(0x222233, 0x444455);
                // Reducir luz significativamente
                this.sunLight.intensity = 0.3;
                break;

            case 'sunny':
            default:
                this.humidity = 0.3;
                this.updateSkyColors(0x0077ff, 0xffffff);
                this.sunLight.intensity = 1.5;
                break;
        }
    }

    updateSkyColors(top, bottom) {
        if (this.sky && this.sky.material.uniforms) {
            this.sky.material.uniforms.topColor.value.setHex(top);
            this.sky.material.uniforms.bottomColor.value.setHex(bottom);
        }
    }

    setTimeOfDay(time) {
        this.timeOfDay = Math.max(0, Math.min(1, time));

        // Calcular posición del sol
        const angle = this.timeOfDay * Math.PI;
        const sunX = Math.cos(angle) * 80;
        const sunY = Math.sin(angle) * 80;

        this.sunLight.position.set(sunX, Math.max(10, sunY), 30);

        // Ajustar intensidad según hora
        const isDaytime = this.timeOfDay > 0.2 && this.timeOfDay < 0.8;

        if (isDaytime) {
            // Día
            const dayIntensity = Math.sin(this.timeOfDay * Math.PI);
            this.sunLight.intensity = dayIntensity * 1.5;
            this.sunLight.color.setHex(this.getSunColor(this.timeOfDay));
            this.moonLight.visible = false;
            this.ambientLight.intensity = 0.3 + dayIntensity * 0.3;
        } else {
            // Noche
            this.sunLight.intensity = 0.1;
            this.moonLight.visible = true;
            this.ambientLight.intensity = 0.15;
            this.updateSkyColors(0x000022, 0x111133);
        }
    }

    getSunColor(time) {
        // Amanecer/atardecer naranja, mediodía blanco
        if (time < 0.3 || time > 0.7) {
            return 0xffaa55; // Naranja
        } else if (time < 0.4 || time > 0.6) {
            return 0xffffaa; // Amarillo suave
        }
        return 0xffffee; // Blanco cálido
    }

    getHumidity() {
        return this.humidity;
    }

    update(deltaTime) {
        // Animar lluvia
        if (this.rainSystem.visible) {
            const positions = this.rainSystem.geometry.attributes.position;
            const velocities = this.rainSystem.geometry.attributes.velocity;

            for (let i = 0; i < positions.count; i++) {
                let y = positions.getY(i);
                y -= velocities.array[i] * deltaTime * 60;

                if (y < 0) {
                    y = 50;
                    positions.setX(i, (Math.random() - 0.5) * 100);
                    positions.setZ(i, (Math.random() - 0.5) * 100);
                }

                positions.setY(i, y);
            }

            positions.needsUpdate = true;
        }

        // Animar nieve
        if (this.snowSystem.visible) {
            const positions = this.snowSystem.geometry.attributes.position;
            const velocities = this.snowSystem.geometry.attributes.velocity;

            for (let i = 0; i < positions.count; i++) {
                let x = positions.getX(i);
                let y = positions.getY(i);
                let z = positions.getZ(i);

                x += velocities.array[i * 3] * deltaTime * 60;
                y -= velocities.array[i * 3 + 1] * deltaTime * 60;
                z += velocities.array[i * 3 + 2] * deltaTime * 60;

                // Movimiento ondulante
                x += Math.sin(y * 0.1 + performance.now() * 0.001) * 0.01;

                if (y < 0) {
                    y = 50;
                    x = (Math.random() - 0.5) * 100;
                    z = (Math.random() - 0.5) * 100;
                }

                positions.setX(i, x);
                positions.setY(i, y);
                positions.setZ(i, z);
            }

            positions.needsUpdate = true;
        }

        // Flash de relámpago en tormenta
        if (this.weather === 'storm' && Math.random() < 0.002) {
            this.triggerLightning();
        }
    }

    triggerLightning() {
        const originalIntensity = this.sunLight.intensity;
        this.sunLight.intensity = 3;
        this.sunLight.color.setHex(0xffffff);

        setTimeout(() => {
            this.sunLight.intensity = originalIntensity;
            this.sunLight.color.setHex(0x555577);
        }, 100);
    }

    dispose() {
        this.scene.remove(this.group);
        this.scene.remove(this.sunLight);
        this.scene.remove(this.moonLight);
        this.scene.remove(this.ambientLight);
        this.scene.remove(this.sky);
    }
}

export default ClimateSystem;
