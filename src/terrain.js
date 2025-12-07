// terrain.js - Terreno 3D editable con diferentes tipos de suelo

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'terrain';

        // Parámetros del terreno
        this.size = 50;
        this.segments = 100;
        this.maxHeight = 3;

        // Tipos de suelo y colores
        this.soilTypes = {
            wet: { color: 0x3d5c3d, name: 'Húmedo' },
            clay: { color: 0x8b6914, name: 'Arcilloso' },
            loam: { color: 0x654321, name: 'Franco' },
            sandy: { color: 0xc4a35a, name: 'Arenoso' },
            gravel: { color: 0x808080, name: 'Grava' },
            rocky: { color: 0x5a5a5a, name: 'Rocoso' },
            dry: { color: 0xb8860b, name: 'Seco' }
        };

        this.currentSoilType = 'clay';

        // Generador de ruido
        this.noise2D = createNoise2D();

        // Geometría y mesh
        this.geometry = null;
        this.material = null;
        this.mesh = null;

        // Modo edición
        this.editMode = false;
        this.brushSize = 3;
        this.brushStrength = 0.5;
        this.brushMode = 'raise'; // 'raise', 'lower', 'smooth', 'flatten'

        // Obstáculos
        this.obstacles = [];
        this.obstacleTypes = {
            tree: { scale: 1, color: 0x228b22 },
            rock: { scale: 0.8, color: 0x696969 },
            building: { scale: 2, color: 0x8b7355 }
        };

        // Humedad del terreno
        this.humidity = 0.5;

        this.build();
        scene.add(this.group);
    }

    build() {
        this.clear();
        this.createTerrain();
        this.createGrid();
    }

    clear() {
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            this.group.remove(child);
        }
    }

    createTerrain() {
        this.geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            this.segments,
            this.segments
        );

        // Rotar para que sea horizontal
        this.geometry.rotateX(-Math.PI / 2);

        // Aplicar ruido para crear elevaciones
        const positions = this.geometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            // Combinar diferentes escalas de ruido
            let height = 0;
            height += this.noise2D(x * 0.05, z * 0.05) * 1.5;
            height += this.noise2D(x * 0.1, z * 0.1) * 0.5;
            height += this.noise2D(x * 0.2, z * 0.2) * 0.2;

            // Suavizar el centro para la antena
            const distFromCenter = Math.sqrt(x * x + z * z);
            const centerFactor = Math.min(1, distFromCenter / 10);
            height *= centerFactor;

            positions.setY(i, height);
        }

        this.geometry.computeVertexNormals();

        // Material con color según tipo de suelo
        const soilColor = this.soilTypes[this.currentSoilType].color;

        this.material = new THREE.MeshStandardMaterial({
            color: soilColor,
            roughness: 0.9,
            metalness: 0.0,
            flatShading: false,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = false;
        this.mesh.name = 'terrain-mesh';
        this.group.add(this.mesh);

        // Subsuelo (visible en los bordes)
        const subsoilGeometry = new THREE.BoxGeometry(this.size, 5, this.size);
        const subsoilMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 1.0
        });
        const subsoil = new THREE.Mesh(subsoilGeometry, subsoilMaterial);
        subsoil.position.y = -2.5;
        this.group.add(subsoil);
    }

    createGrid() {
        // Grid de referencia
        const gridHelper = new THREE.GridHelper(this.size, 20, 0x444444, 0x222222);
        gridHelper.position.y = 0.01;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        this.group.add(gridHelper);
    }

    setSoilType(type) {
        if (this.soilTypes[type]) {
            this.currentSoilType = type;
            this.material.color.setHex(this.soilTypes[type].color);
            this.updateHumidityVisual();
        }
    }

    setHumidity(value) {
        this.humidity = Math.max(0, Math.min(1, value));
        this.updateHumidityVisual();
    }

    updateHumidityVisual() {
        // Oscurecer el color del suelo según humedad
        const baseColor = new THREE.Color(this.soilTypes[this.currentSoilType].color);
        const darkFactor = 1 - (this.humidity * 0.3);
        baseColor.multiplyScalar(darkFactor);
        this.material.color.copy(baseColor);
    }

    // Funciones de edición del terreno
    setEditMode(enabled) {
        this.editMode = enabled;
    }

    setBrushSize(size) {
        this.brushSize = size;
    }

    setBrushStrength(strength) {
        this.brushStrength = strength;
    }

    setBrushMode(mode) {
        this.brushMode = mode;
    }

    applyBrush(worldX, worldZ) {
        if (!this.editMode) return;

        const positions = this.geometry.attributes.position;
        const halfSize = this.size / 2;
        const segmentSize = this.size / this.segments;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            const dist = Math.sqrt(
                Math.pow(x - worldX, 2) + Math.pow(z - worldZ, 2)
            );

            if (dist < this.brushSize) {
                const influence = 1 - (dist / this.brushSize);
                const smoothInfluence = influence * influence * (3 - 2 * influence);
                let currentY = positions.getY(i);

                switch (this.brushMode) {
                    case 'raise':
                        currentY += smoothInfluence * this.brushStrength * 0.1;
                        break;
                    case 'lower':
                        currentY -= smoothInfluence * this.brushStrength * 0.1;
                        break;
                    case 'smooth':
                        // Promedio con vecinos
                        currentY = currentY * (1 - smoothInfluence * 0.1);
                        break;
                    case 'flatten':
                        currentY = currentY * (1 - smoothInfluence * 0.2);
                        break;
                }

                currentY = Math.max(-2, Math.min(this.maxHeight, currentY));
                positions.setY(i, currentY);
            }
        }

        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }

    // Gestión de obstáculos
    addObstacle(type, x, z) {
        const obstacleData = this.obstacleTypes[type];
        if (!obstacleData) return null;

        let obstacle;

        switch (type) {
            case 'tree':
                obstacle = this.createTree(x, z);
                break;
            case 'rock':
                obstacle = this.createRock(x, z);
                break;
            case 'building':
                obstacle = this.createBuilding(x, z);
                break;
            default:
                return null;
        }

        obstacle.userData.type = type;
        obstacle.userData.position = { x, z };
        this.obstacles.push(obstacle);
        this.group.add(obstacle);

        return obstacle;
    }

    createTree(x, z) {
        const tree = new THREE.Group();

        // Tronco
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1;
        trunk.castShadow = true;
        tree.add(trunk);

        // Copa del árbol
        const leavesGeometry = new THREE.ConeGeometry(1.2, 3, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 3;
        leaves.castShadow = true;
        tree.add(leaves);

        // Segunda capa de hojas
        const leaves2Geometry = new THREE.ConeGeometry(0.9, 2, 8);
        const leaves2 = new THREE.Mesh(leaves2Geometry, leavesMaterial);
        leaves2.position.y = 4;
        leaves2.castShadow = true;
        tree.add(leaves2);

        tree.position.set(x, this.getHeightAt(x, z), z);
        return tree;
    }

    createRock(x, z) {
        const rockGeometry = new THREE.DodecahedronGeometry(0.8, 1);
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x696969,
            roughness: 0.9,
            flatShading: true
        });

        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, this.getHeightAt(x, z) + 0.3, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.set(
            0.8 + Math.random() * 0.5,
            0.6 + Math.random() * 0.4,
            0.8 + Math.random() * 0.5
        );
        rock.castShadow = true;

        return rock;
    }

    createBuilding(x, z) {
        const building = new THREE.Group();

        // Estructura principal
        const width = 3 + Math.random() * 2;
        const depth = 3 + Math.random() * 2;
        const height = 4 + Math.random() * 4;

        const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.7
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = height / 2;
        body.castShadow = true;
        building.add(body);

        // Techo
        const roofGeometry = new THREE.ConeGeometry(
            Math.max(width, depth) * 0.8,
            2,
            4
        );
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height + 1;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        building.add(roof);

        building.position.set(x, this.getHeightAt(x, z), z);
        return building;
    }

    removeObstacle(obstacle) {
        const index = this.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.obstacles.splice(index, 1);
            this.group.remove(obstacle);

            if (obstacle.geometry) obstacle.geometry.dispose();
            if (obstacle.material) obstacle.material.dispose();
        }
    }

    clearObstacles() {
        for (const obstacle of this.obstacles) {
            this.group.remove(obstacle);
        }
        this.obstacles = [];
    }

    getHeightAt(x, z) {
        // Calcular altura del terreno en un punto específico
        if (!this.geometry) return 0;

        const positions = this.geometry.attributes.position;
        const halfSize = this.size / 2;
        const segmentSize = this.size / this.segments;

        // Encontrar vértice más cercano
        let closestDist = Infinity;
        let closestHeight = 0;

        for (let i = 0; i < positions.count; i++) {
            const vx = positions.getX(i);
            const vz = positions.getZ(i);
            const dist = Math.abs(vx - x) + Math.abs(vz - z);

            if (dist < closestDist) {
                closestDist = dist;
                closestHeight = positions.getY(i);
            }
        }

        return closestHeight;
    }

    getObstaclesNearPoint(x, z, radius) {
        return this.obstacles.filter(obs => {
            const dx = obs.position.x - x;
            const dz = obs.position.z - z;
            return Math.sqrt(dx * dx + dz * dz) < radius;
        });
    }

    update(deltaTime) {
        // Animaciones del terreno si es necesario
    }

    dispose() {
        this.clear();
        this.scene.remove(this.group);
    }
}

export default Terrain;
