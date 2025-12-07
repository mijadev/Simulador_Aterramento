// utils.js - Funciones auxiliares

import * as THREE from 'three';

/**
 * Convierte grados a radianes
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convierte radianes a grados
 */
export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Limita un valor entre un mínimo y un máximo
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Interpolación lineal
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Interpola entre dos colores
 */
export function lerpColor(color1, color2, t) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, t);
}

/**
 * Genera un número aleatorio entre min y max
 */
export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Genera un entero aleatorio entre min y max (inclusive)
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Mapea un valor de un rango a otro
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

/**
 * Suaviza un valor usando smoothstep
 */
export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * Crea un material de cobre realista
 */
export function createCopperMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xb87333,
        metalness: 0.9,
        roughness: 0.3,
        envMapIntensity: 1.0
    });
}

/**
 * Crea un material de acero galvanizado
 */
export function createSteelMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x888899,
        metalness: 0.8,
        roughness: 0.4
    });
}

/**
 * Crea un material brillante para visualización
 */
export function createGlowMaterial(color, intensity = 1) {
    return new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8 * intensity
    });
}

/**
 * Distribuye puntos en un círculo
 */
export function distributeInCircle(count, radius, y = 0) {
    const points = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        points.push(new THREE.Vector3(x, y, z));
    }
    return points;
}

/**
 * Crea una curva Catmull-Rom para cables suaves
 */
export function createCableCurve(start, end, sag = 0.1) {
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y -= sag * start.distanceTo(end);

    return new THREE.CatmullRomCurve3([start, mid, end]);
}

/**
 * Formatea un número con unidades
 */
export function formatWithUnit(value, unit, decimals = 2) {
    return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Obtiene el color según un gradiente de eficiencia
 */
export function getEfficiencyColor(efficiency) {
    if (efficiency >= 80) return 0x00ff88;
    if (efficiency >= 60) return 0x88ff00;
    if (efficiency >= 40) return 0xffff00;
    if (efficiency >= 20) return 0xffaa00;
    return 0xff4444;
}

/**
 * Crea un objeto visualmente destacado (outline)
 */
export function createOutline(mesh, color = 0x00ffff, scale = 1.05) {
    const outlineMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5
    });

    const outlineMesh = new THREE.Mesh(mesh.geometry.clone(), outlineMaterial);
    outlineMesh.scale.multiplyScalar(scale);
    return outlineMesh;
}

/**
 * Anima un valor suavemente
 */
export class AnimatedValue {
    constructor(initialValue = 0, smoothing = 0.1) {
        this.current = initialValue;
        this.target = initialValue;
        this.smoothing = smoothing;
    }

    setTarget(value) {
        this.target = value;
    }

    update() {
        this.current = lerp(this.current, this.target, this.smoothing);
        return this.current;
    }

    get value() {
        return this.current;
    }
}

/**
 * Detecta si el mouse está sobre un objeto 3D
 */
export function raycastFromMouse(mouse, camera, objects) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(objects, true);
}

/**
 * Descarga el canvas como imagen PNG
 */
export function downloadCanvasAsImage(renderer, filename = 'grounding-sim.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
}

export default {
    degToRad,
    radToDeg,
    clamp,
    lerp,
    lerpColor,
    randomRange,
    randomInt,
    mapRange,
    smoothstep,
    createCopperMaterial,
    createSteelMaterial,
    createGlowMaterial,
    distributeInCircle,
    createCableCurve,
    formatWithUnit,
    getEfficiencyColor,
    createOutline,
    AnimatedValue,
    raycastFromMouse,
    downloadCanvasAsImage
};
