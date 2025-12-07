// ui.js - Panel de controles y parámetros con lil-gui

import GUI from 'lil-gui';

export class UIManager {
    constructor(options = {}) {
        this.gui = new GUI({ title: '⚡ Control de Aterramento' });

        // Callbacks
        this.onAntennaChange = options.onAntennaChange || (() => { });
        this.onTerrainChange = options.onTerrainChange || (() => { });
        this.onClimateChange = options.onClimateChange || (() => { });
        this.onActionTrigger = options.onActionTrigger || (() => { });

        // Parámetros organizados por categoría
        this.params = {
            // Antena
            antenna: {
                mastHeight: 10,
                radialCount: 8,
                radialLength: 5
            },

            // Varillas de tierra
            groundRods: {
                rodCount: 4,
                rodLength: 2.4,
                rodSpacing: 3.0
            },

            // Suelo
            soil: {
                type: 'clay',
                humidity: 0.5
            },

            // Clima
            climate: {
                weather: 'sunny',
                timeOfDay: 0.5
            },

            // Terreno
            terrain: {
                editMode: false,
                brushSize: 3,
                brushStrength: 0.5,
                brushMode: 'raise'
            },

            // Visualización
            display: {
                showCurrentFlow: true,
                showGrid: true,
                flowIntensity: 1.0
            },

            // Parámetros eléctricos
            electrical: {
                faultVoltage: 220,
                targetResistance: 5
            }
        };

        this.setupFolders();
        this.gui.close(); // Iniciar colapsado
        this.gui.open();  // Abrir la UI
    }

    setupFolders() {
        this.setupAntennaFolder();
        this.setupGroundRodsFolder();
        this.setupSoilFolder();
        this.setupClimateFolder();
        this.setupTerrainFolder();
        this.setupDisplayFolder();
        this.setupActionsFolder();
    }

    setupAntennaFolder() {
        const folder = this.gui.addFolder('🗼 Antena');

        folder.add(this.params.antenna, 'mastHeight', 3, 30, 0.5)
            .name('Altura del mástil (m)')
            .onChange(v => this.onAntennaChange('mastHeight', v));

        folder.add(this.params.antenna, 'radialCount', 0, 16, 1)
            .name('Número de radiales')
            .onChange(v => this.onAntennaChange('radialCount', v));

        folder.add(this.params.antenna, 'radialLength', 1, 15, 0.5)
            .name('Longitud radiales (m)')
            .onChange(v => this.onAntennaChange('radialLength', v));

        folder.open();
    }

    setupGroundRodsFolder() {
        const folder = this.gui.addFolder('⚡ Varillas de Tierra');

        folder.add(this.params.groundRods, 'rodCount', 1, 12, 1)
            .name('Cantidad de varillas')
            .onChange(v => this.onAntennaChange('rodCount', v));

        folder.add(this.params.groundRods, 'rodLength', 1, 5, 0.1)
            .name('Longitud (m)')
            .onChange(v => this.onAntennaChange('rodLength', v));

        folder.add(this.params.groundRods, 'rodSpacing', 1, 10, 0.5)
            .name('Espaciamiento (m)')
            .onChange(v => this.onAntennaChange('rodSpacing', v));

        folder.open();
    }

    setupSoilFolder() {
        const folder = this.gui.addFolder('🌍 Suelo');

        const soilTypes = {
            'Húmedo': 'wet',
            'Arcilloso': 'clay',
            'Franco': 'loam',
            'Arenoso': 'sandy',
            'Grava': 'gravel',
            'Rocoso': 'rocky',
            'Seco': 'dry'
        };

        folder.add(this.params.soil, 'type', soilTypes)
            .name('Tipo de suelo')
            .onChange(v => this.onTerrainChange('soilType', v));

        folder.add(this.params.soil, 'humidity', 0, 1, 0.05)
            .name('Humedad')
            .onChange(v => this.onTerrainChange('humidity', v));

        folder.open();
    }

    setupClimateFolder() {
        const folder = this.gui.addFolder('🌤️ Clima');

        const weatherTypes = {
            'Soleado': 'sunny',
            'Lluvia': 'rain',
            'Nieve': 'snow',
            'Tormenta': 'storm'
        };

        folder.add(this.params.climate, 'weather', weatherTypes)
            .name('Clima')
            .onChange(v => this.onClimateChange('weather', v));

        folder.add(this.params.climate, 'timeOfDay', 0, 1, 0.01)
            .name('Hora del día')
            .onChange(v => this.onClimateChange('timeOfDay', v));
    }

    setupTerrainFolder() {
        const folder = this.gui.addFolder('🏔️ Edición de Terreno');

        folder.add(this.params.terrain, 'editMode')
            .name('Modo edición')
            .onChange(v => this.onTerrainChange('editMode', v));

        const brushModes = {
            'Elevar': 'raise',
            'Bajar': 'lower',
            'Suavizar': 'smooth',
            'Aplanar': 'flatten'
        };

        folder.add(this.params.terrain, 'brushMode', brushModes)
            .name('Modo pincel')
            .onChange(v => this.onTerrainChange('brushMode', v));

        folder.add(this.params.terrain, 'brushSize', 1, 10, 0.5)
            .name('Tamaño pincel')
            .onChange(v => this.onTerrainChange('brushSize', v));

        folder.add(this.params.terrain, 'brushStrength', 0.1, 1, 0.1)
            .name('Fuerza pincel')
            .onChange(v => this.onTerrainChange('brushStrength', v));
    }

    setupDisplayFolder() {
        const folder = this.gui.addFolder('👁️ Visualización');

        folder.add(this.params.display, 'showCurrentFlow')
            .name('Mostrar corriente')
            .onChange(v => this.onActionTrigger('toggleCurrentFlow', v));

        folder.add(this.params.display, 'flowIntensity', 0, 2, 0.1)
            .name('Intensidad del flujo')
            .onChange(v => this.onActionTrigger('setFlowIntensity', v));

        folder.add(this.params.display, 'showGrid')
            .name('Mostrar cuadrícula')
            .onChange(v => this.onActionTrigger('toggleGrid', v));
    }

    setupActionsFolder() {
        const folder = this.gui.addFolder('🎮 Acciones');

        const actions = {
            addTree: () => this.onActionTrigger('addObstacle', 'tree'),
            addRock: () => this.onActionTrigger('addObstacle', 'rock'),
            addBuilding: () => this.onActionTrigger('addObstacle', 'building'),
            clearObstacles: () => this.onActionTrigger('clearObstacles'),
            resetCamera: () => this.onActionTrigger('resetCamera'),
            screenshot: () => this.onActionTrigger('screenshot')
        };

        folder.add(actions, 'addTree').name('🌲 Añadir árbol');
        folder.add(actions, 'addRock').name('🪨 Añadir roca');
        folder.add(actions, 'addBuilding').name('🏠 Añadir edificio');
        folder.add(actions, 'clearObstacles').name('🗑️ Limpiar obstáculos');
        folder.add(actions, 'resetCamera').name('📷 Resetear cámara');
        folder.add(actions, 'screenshot').name('📸 Captura de pantalla');
    }

    // Actualizar UI desde código externo
    updateParams(category, key, value) {
        if (this.params[category] && this.params[category][key] !== undefined) {
            this.params[category][key] = value;
            this.gui.controllersRecursive().forEach(c => {
                if (c.property === key) {
                    c.updateDisplay();
                }
            });
        }
    }

    getParams() {
        return this.params;
    }

    setVisible(visible) {
        this.gui.domElement.style.display = visible ? 'block' : 'none';
    }

    dispose() {
        this.gui.destroy();
    }
}

// Actualización de métricas en el DOM
export function updateMetricsDisplay(metrics) {
    const resistanceEl = document.getElementById('resistance-value');
    const efficiencyEl = document.getElementById('efficiency-value');
    const currentEl = document.getElementById('current-value');
    const resistivityEl = document.getElementById('resistivity-value');
    const statusEl = document.getElementById('status-value');

    if (resistanceEl) {
        resistanceEl.textContent = `${metrics.totalResistance.toFixed(2)} Ω`;
        resistanceEl.className = 'metric-value ' + metrics.status.status;
    }

    if (efficiencyEl) {
        efficiencyEl.textContent = `${metrics.efficiency.toFixed(1)} %`;
        const effClass = metrics.efficiency >= 80 ? '' :
            metrics.efficiency >= 50 ? 'warning' : 'danger';
        efficiencyEl.className = 'metric-value ' + effClass;
    }

    if (currentEl) {
        currentEl.textContent = `${metrics.faultCurrent.toFixed(2)} A`;
    }

    if (resistivityEl) {
        resistivityEl.textContent = `${metrics.resistivity.toFixed(1)} Ω·m`;
    }

    if (statusEl) {
        statusEl.textContent = metrics.status.message;
        statusEl.style.color = metrics.status.color;
    }
}

// Actualización de la barra de estado
export function updateStatusBar(weather, timeOfDay, soilType) {
    const weatherEl = document.getElementById('weather-status');
    const timeEl = document.getElementById('time-status');
    const soilEl = document.getElementById('soil-status');

    const weatherNames = {
        'sunny': '☀️ Soleado',
        'rain': '🌧️ Lluvia',
        'snow': '❄️ Nieve',
        'storm': '⛈️ Tormenta'
    };

    const soilNames = {
        'wet': 'Húmedo',
        'clay': 'Arcilloso',
        'loam': 'Franco',
        'sandy': 'Arenoso',
        'gravel': 'Grava',
        'rocky': 'Rocoso',
        'dry': 'Seco'
    };

    if (weatherEl) {
        weatherEl.textContent = weatherNames[weather] || weather;
    }

    if (timeEl) {
        const isDay = timeOfDay > 0.2 && timeOfDay < 0.8;
        timeEl.textContent = isDay ? '🌞 Día' : '🌙 Noche';
    }

    if (soilEl) {
        soilEl.textContent = `Suelo: ${soilNames[soilType] || soilType}`;
    }
}

// Actualización del indicador de modo
export function updateModeIndicator(mode) {
    const modeEl = document.getElementById('mode-indicator');
    if (modeEl) {
        const modeTexts = {
            'navigate': 'Modo: Navegación | Click derecho + arrastrar para rotar',
            'edit': 'Modo: Edición | Ctrl + Click para modificar terreno',
            'place': 'Modo: Colocación | Click para colocar obstáculo'
        };
        modeEl.textContent = modeTexts[mode] || mode;
    }
}

export default UIManager;
