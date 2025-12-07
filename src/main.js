// main.js - Punto de entrada principal del simulador

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { AntennaSystem } from './antenna.js';
import { Terrain } from './terrain.js';
import { ClimateSystem } from './climate.js';
import { CurrentFlowSystem } from './currentFlow.js';
import { GroundingSystem } from './groundMath.js';
import { UIManager, updateMetricsDisplay, updateStatusBar, updateModeIndicator } from './ui.js';
import { downloadCanvasAsImage } from './utils.js';

class GroundingSimulator {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.loadingScreen = document.getElementById('loading');

        // Three.js básicos
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Sistemas
        this.antenna = null;
        this.terrain = null;
        this.climate = null;
        this.currentFlow = null;
        this.groundingSystem = null;
        this.ui = null;

        // Estado
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isEditing = false;
        this.placementMode = null;

        this.init();
    }

    async init() {
        try {
            this.setupRenderer();
            this.setupCamera();
            this.setupControls();
            this.setupScene();
            this.setupSystems();
            this.setupUI();
            this.setupEventListeners();

            // Ocultar pantalla de carga
            setTimeout(() => {
                this.loadingScreen.classList.add('hidden');
            }, 500);

            this.animate();
        } catch (error) {
            console.error('Error initializing simulator:', error);
        }
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
        this.camera.position.set(20, 15, 20);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        this.controls.target.set(0, 0, 0);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    setupSystems() {
        // Sistema de cálculos de aterramento
        this.groundingSystem = new GroundingSystem();

        // Clima (incluye iluminación)
        this.climate = new ClimateSystem(this.scene);

        // Terreno
        this.terrain = new Terrain(this.scene);

        // Antena
        this.antenna = new AntennaSystem(this.scene);

        // Flujo de corriente
        this.currentFlow = new CurrentFlowSystem(this.scene);

        // Calcular métricas iniciales
        this.updateCalculations();
    }

    setupUI() {
        this.ui = new UIManager({
            onAntennaChange: (param, value) => this.handleAntennaChange(param, value),
            onTerrainChange: (param, value) => this.handleTerrainChange(param, value),
            onClimateChange: (param, value) => this.handleClimateChange(param, value),
            onActionTrigger: (action, value) => this.handleAction(action, value)
        });

        // Estado inicial
        updateStatusBar('sunny', 0.5, 'clay');
        updateModeIndicator('navigate');
    }

    setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => this.onResize());

        // Mouse
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Keyboard
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    handleAntennaChange(param, value) {
        switch (param) {
            case 'mastHeight':
                this.antenna.setMastHeight(value);
                break;
            case 'radialCount':
                this.antenna.setRadialCount(value);
                this.groundingSystem.radialCount = value;
                break;
            case 'radialLength':
                this.antenna.setRadialLength(value);
                this.groundingSystem.radialLength = value;
                break;
            case 'rodCount':
                this.antenna.setRodCount(value);
                this.groundingSystem.rodCount = value;
                break;
            case 'rodLength':
                this.antenna.setRodLength(value);
                this.groundingSystem.rodLength = value;
                break;
            case 'rodSpacing':
                this.antenna.setRodSpacing(value);
                this.groundingSystem.rodSpacing = value;
                break;
        }

        // Actualizar flujo de corriente
        const params = this.antenna.getParameters();
        this.currentFlow.updateFlowPattern(
            params.rodCount,
            params.rodSpacing,
            params.radialCount,
            params.radialLength
        );

        this.updateCalculations();
    }

    handleTerrainChange(param, value) {
        switch (param) {
            case 'soilType':
                this.terrain.setSoilType(value);
                this.groundingSystem.soilType = value;
                updateStatusBar(
                    this.ui.getParams().climate.weather,
                    this.ui.getParams().climate.timeOfDay,
                    value
                );
                break;
            case 'humidity':
                this.terrain.setHumidity(value);
                this.groundingSystem.humidity = value;
                break;
            case 'editMode':
                this.isEditing = value;
                this.terrain.setEditMode(value);
                updateModeIndicator(value ? 'edit' : 'navigate');
                break;
            case 'brushMode':
                this.terrain.setBrushMode(value);
                break;
            case 'brushSize':
                this.terrain.setBrushSize(value);
                break;
            case 'brushStrength':
                this.terrain.setBrushStrength(value);
                break;
        }

        this.updateCalculations();
    }

    handleClimateChange(param, value) {
        switch (param) {
            case 'weather':
                this.climate.setWeather(value);
                this.groundingSystem.weather = value;
                // Actualizar humedad basada en clima
                const humidity = this.climate.getHumidity();
                this.terrain.setHumidity(humidity);
                this.groundingSystem.humidity = humidity;
                this.ui.updateParams('soil', 'humidity', humidity);
                updateStatusBar(
                    value,
                    this.ui.getParams().climate.timeOfDay,
                    this.ui.getParams().soil.type
                );
                break;
            case 'timeOfDay':
                this.climate.setTimeOfDay(value);
                updateStatusBar(
                    this.ui.getParams().climate.weather,
                    value,
                    this.ui.getParams().soil.type
                );
                break;
        }

        this.updateCalculations();
    }

    handleAction(action, value) {
        switch (action) {
            case 'addObstacle':
                this.startPlacementMode(value);
                break;
            case 'clearObstacles':
                this.terrain.clearObstacles();
                break;
            case 'resetCamera':
                this.resetCamera();
                break;
            case 'screenshot':
                downloadCanvasAsImage(this.renderer, 'grounding-sim.png');
                break;
            case 'toggleCurrentFlow':
                this.currentFlow.setActive(value);
                break;
            case 'setFlowIntensity':
                this.currentFlow.setIntensity(value);
                break;
            case 'toggleGrid':
                // Buscar y toggle del grid
                const grid = this.terrain.group.children.find(c => c.type === 'GridHelper');
                if (grid) grid.visible = value;
                break;
        }
    }

    startPlacementMode(type) {
        this.placementMode = type;
        updateModeIndicator('place');
    }

    resetCamera() {
        this.camera.position.set(20, 15, 20);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    updateCalculations() {
        const metrics = this.groundingSystem.calculate();

        // Actualizar display
        updateMetricsDisplay(metrics);

        // Actualizar colores del flujo según resistencia
        this.currentFlow.updateColors(metrics.totalResistance);

        // Ajustar intensidad del flujo según eficiencia
        const flowIntensity = metrics.efficiency / 100;
        this.currentFlow.setIntensity(0.5 + flowIntensity);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Edición de terreno mientras se arrastra
        if (this.isEditing && event.buttons === 1 && event.ctrlKey) {
            this.editTerrain();
        }
    }

    onMouseDown(event) {
        if (this.placementMode && event.button === 0) {
            this.placeObstacle();
            return;
        }

        if (this.isEditing && event.button === 0 && event.ctrlKey) {
            this.editTerrain();
        }
    }

    onMouseUp(event) {
        // Fin de edición
    }

    onKeyDown(event) {
        if (event.key === 'Escape') {
            this.placementMode = null;
            this.isEditing = false;
            this.terrain.setEditMode(false);
            this.ui.updateParams('terrain', 'editMode', false);
            updateModeIndicator('navigate');
        }
    }

    onKeyUp(event) {
        // Para futuras funcionalidades
    }

    editTerrain() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.mesh);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.terrain.applyBrush(point.x, point.z);
        }
    }

    placeObstacle() {
        if (!this.placementMode) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.mesh);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.terrain.addObstacle(this.placementMode, point.x, point.z);
        }

        this.placementMode = null;
        updateModeIndicator('navigate');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // Actualizar controles
        this.controls.update();

        // Actualizar sistemas
        this.climate.update(deltaTime);
        this.terrain.update(deltaTime);
        this.antenna.update(deltaTime);
        this.currentFlow.update(deltaTime);

        // Renderizar
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.antenna.dispose();
        this.terrain.dispose();
        this.climate.dispose();
        this.currentFlow.dispose();
        this.ui.dispose();
        this.renderer.dispose();
    }
}

// Iniciar aplicación
const app = new GroundingSimulator();

// Exponer para debugging
window.groundingSim = app;
