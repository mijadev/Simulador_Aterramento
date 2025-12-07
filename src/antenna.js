// antenna.js - Antena, radiales y varillas de tierra

import * as THREE from 'three';
import { createCopperMaterial, createSteelMaterial, distributeInCircle, createCableCurve } from './utils.js';

export class AntennaSystem {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'antenna-system';

        // Parámetros
        this.mastHeight = 10;
        this.mastRadius = 0.1;
        this.baseRadius = 0.5;
        this.radialCount = 8;
        this.radialLength = 5;
        this.rodCount = 4;
        this.rodLength = 2.4;
        this.rodDiameter = 0.016;
        this.rodSpacing = 3;

        // Materiales
        this.copperMaterial = createCopperMaterial();
        this.steelMaterial = createSteelMaterial();

        // Objetos 3D
        this.mast = null;
        this.base = null;
        this.radials = [];
        this.rods = [];
        this.connections = [];

        // Estado de arrastre
        this.isDragging = false;
        this.position = new THREE.Vector3(0, 0, 0);

        this.build();
        scene.add(this.group);
    }

    build() {
        this.clear();
        this.createMast();
        this.createBase();
        this.createRadials();
        this.createGroundRods();
        this.createConnections();
    }

    clear() {
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            this.group.remove(child);
        }
        this.radials = [];
        this.rods = [];
        this.connections = [];
    }

    createMast() {
        // Mástil principal de la antena
        const geometry = new THREE.CylinderGeometry(
            this.mastRadius * 0.7,
            this.mastRadius,
            this.mastHeight,
            16
        );

        this.mast = new THREE.Mesh(geometry, this.steelMaterial);
        this.mast.position.y = this.mastHeight / 2;
        this.mast.castShadow = true;
        this.mast.receiveShadow = true;
        this.mast.name = 'mast';
        this.group.add(this.mast);

        // Antena en la cima
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);
        const antenna = new THREE.Mesh(antennaGeometry, this.copperMaterial);
        antenna.position.y = this.mastHeight + 1;
        antenna.name = 'antenna-element';
        this.group.add(antenna);

        // Elementos cruzados de la antena
        for (let i = 0; i < 4; i++) {
            const crossGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8);
            const cross = new THREE.Mesh(crossGeometry, this.copperMaterial);
            cross.rotation.z = Math.PI / 2;
            cross.rotation.y = (i / 4) * Math.PI * 2;
            cross.position.y = this.mastHeight + 0.5;
            this.group.add(cross);
        }
    }

    createBase() {
        // Base de la antena
        const baseGeometry = new THREE.CylinderGeometry(
            this.baseRadius,
            this.baseRadius * 1.2,
            0.3,
            32
        );

        this.base = new THREE.Mesh(baseGeometry, this.steelMaterial);
        this.base.position.y = 0.15;
        this.base.castShadow = true;
        this.base.receiveShadow = true;
        this.base.name = 'base';
        this.group.add(this.base);

        // Placa de conexión
        const plateGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);
        const plate = new THREE.Mesh(plateGeometry, this.copperMaterial);
        plate.position.y = 0.025;
        plate.name = 'connection-plate';
        this.group.add(plate);
    }

    createRadials() {
        // Radiales de cobre enterrados
        const points = distributeInCircle(this.radialCount, 0.3, -0.1);

        for (let i = 0; i < this.radialCount; i++) {
            const angle = (i / this.radialCount) * Math.PI * 2;
            const endX = Math.cos(angle) * this.radialLength;
            const endZ = Math.sin(angle) * this.radialLength;

            // Crear curva del radial (ligeramente bajo tierra)
            const start = points[i].clone();
            const end = new THREE.Vector3(endX, -0.15, endZ);
            const mid = new THREE.Vector3(
                (start.x + endX) / 2,
                -0.2,
                (start.z + endZ) / 2
            );

            const curve = new THREE.CatmullRomCurve3([start, mid, end]);
            const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.008, 8, false);

            const radial = new THREE.Mesh(tubeGeometry, this.copperMaterial);
            radial.name = `radial-${i}`;
            this.radials.push(radial);
            this.group.add(radial);

            // Terminación del radial
            const capGeometry = new THREE.SphereGeometry(0.02, 8, 8);
            const cap = new THREE.Mesh(capGeometry, this.copperMaterial);
            cap.position.copy(end);
            this.group.add(cap);
        }
    }

    createGroundRods() {
        // Varillas de tierra verticales
        const rodRadius = this.rodDiameter / 2;

        for (let i = 0; i < this.rodCount; i++) {
            const angle = (i / this.rodCount) * Math.PI * 2;
            const x = Math.cos(angle) * this.rodSpacing;
            const z = Math.sin(angle) * this.rodSpacing;

            // Varilla principal
            const rodGeometry = new THREE.CylinderGeometry(
                rodRadius,
                rodRadius,
                this.rodLength,
                8
            );

            const rod = new THREE.Mesh(rodGeometry, this.copperMaterial);
            rod.position.set(x, -this.rodLength / 2, z);
            rod.name = `ground-rod-${i}`;
            rod.castShadow = true;
            this.rods.push(rod);
            this.group.add(rod);

            // Cabeza de la varilla (visible sobre tierra)
            const headGeometry = new THREE.CylinderGeometry(
                rodRadius * 2,
                rodRadius * 2,
                0.05,
                8
            );
            const head = new THREE.Mesh(headGeometry, this.copperMaterial);
            head.position.set(x, 0.025, z);
            this.group.add(head);

            // Punta de la varilla
            const tipGeometry = new THREE.ConeGeometry(rodRadius, 0.1, 8);
            const tip = new THREE.Mesh(tipGeometry, this.copperMaterial);
            tip.position.set(x, -this.rodLength, z);
            this.group.add(tip);
        }
    }

    createConnections() {
        // Cables de conexión entre varillas y base
        for (let i = 0; i < this.rodCount; i++) {
            const angle = (i / this.rodCount) * Math.PI * 2;
            const x = Math.cos(angle) * this.rodSpacing;
            const z = Math.sin(angle) * this.rodSpacing;

            const start = new THREE.Vector3(0, 0, 0);
            const end = new THREE.Vector3(x, 0, z);
            const curve = createCableCurve(start, end, 0.05);

            const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.006, 8, false);
            const connection = new THREE.Mesh(tubeGeometry, this.copperMaterial);
            connection.name = `connection-${i}`;
            this.connections.push(connection);
            this.group.add(connection);
        }
    }

    // Actualizadores de parámetros
    setMastHeight(height) {
        this.mastHeight = height;
        this.build();
    }

    setRadialCount(count) {
        this.radialCount = count;
        this.build();
    }

    setRadialLength(length) {
        this.radialLength = length;
        this.build();
    }

    setRodCount(count) {
        this.rodCount = count;
        this.build();
    }

    setRodLength(length) {
        this.rodLength = length;
        this.build();
    }

    setRodSpacing(spacing) {
        this.rodSpacing = spacing;
        this.build();
    }

    setPosition(x, z) {
        this.position.set(x, 0, z);
        this.group.position.copy(this.position);
    }

    getParameters() {
        return {
            mastHeight: this.mastHeight,
            radialCount: this.radialCount,
            radialLength: this.radialLength,
            rodCount: this.rodCount,
            rodLength: this.rodLength,
            rodDiameter: this.rodDiameter,
            rodSpacing: this.rodSpacing
        };
    }

    // Para interactividad
    getInteractiveObjects() {
        return [this.mast, this.base, ...this.rods];
    }

    highlight(enabled) {
        const color = enabled ? 0x00ffff : 0xb87333;
        this.copperMaterial.emissive = new THREE.Color(enabled ? 0x003333 : 0x000000);
    }

    update(deltaTime) {
        // Animaciones si es necesario
    }

    dispose() {
        this.clear();
        this.copperMaterial.dispose();
        this.steelMaterial.dispose();
        this.scene.remove(this.group);
    }
}

export default AntennaSystem;
