// groundMath.js - Cálculos de resistencia y eficiencia de puesta a tierra

/**
 * Resistividad típica de diferentes tipos de suelo (Ω·m)
 */
export const SOIL_RESISTIVITY = {
    wet: 10,        // Suelo húmedo/pantanoso
    clay: 40,       // Arcilloso
    loam: 100,      // Franco (mezcla)
    sandy: 200,     // Arenoso
    gravel: 400,    // Grava
    rocky: 1000,    // Rocoso
    dry: 1500       // Muy seco
};

/**
 * Factor de acoplamiento entre varillas según espaciamiento
 * @param {number} spacing - Distancia entre varillas (m)
 * @param {number} length - Longitud de la varilla (m)
 * @returns {number} Factor de acoplamiento λ (0-1)
 */
export function getCouplingFactor(spacing, length) {
    const ratio = spacing / length;
    if (ratio >= 2) return 0.0;
    if (ratio >= 1.5) return 0.1;
    if (ratio >= 1.0) return 0.2;
    if (ratio >= 0.7) return 0.35;
    if (ratio >= 0.5) return 0.5;
    return 0.7;
}

/**
 * Calcula la resistencia de una sola varilla de tierra
 * Fórmula: R = (ρ / 2πL) × ln(4L/d)
 * 
 * @param {number} resistivity - Resistividad del suelo (Ω·m)
 * @param {number} length - Longitud de la varilla (m)
 * @param {number} diameter - Diámetro de la varilla (m)
 * @returns {number} Resistencia en Ohms
 */
export function calculateSingleRodResistance(resistivity, length, diameter) {
    if (length <= 0 || diameter <= 0) return Infinity;
    const R = (resistivity / (2 * Math.PI * length)) * Math.log((4 * length) / diameter);
    return R;
}

/**
 * Calcula la resistencia total de varillas en paralelo
 * Considera el factor de acoplamiento entre varillas
 * 
 * @param {number} singleRodResistance - Resistencia de una varilla (Ω)
 * @param {number} rodCount - Número de varillas
 * @param {number} couplingFactor - Factor de acoplamiento λ
 * @returns {number} Resistencia total en Ohms
 */
export function calculateParallelResistance(singleRodResistance, rodCount, couplingFactor) {
    if (rodCount <= 0) return Infinity;
    if (rodCount === 1) return singleRodResistance;

    // Rt = R / n × (1 + λ×(n-1))
    const Rt = (singleRodResistance / rodCount) * (1 + couplingFactor * (rodCount - 1));
    return Rt;
}

/**
 * Calcula la contribución de radiales a la reducción de resistencia
 * 
 * @param {number} baseResistance - Resistencia base sin radiales (Ω)
 * @param {number} radialCount - Número de radiales
 * @param {number} radialLength - Longitud de cada radial (m)
 * @returns {number} Factor de reducción (0-1)
 */
export function calculateRadialContribution(baseResistance, radialCount, radialLength) {
    if (radialCount === 0 || radialLength === 0) return 1;

    // Los radiales reducen la resistencia hasta un 40%
    const reductionFactor = Math.min(0.4, (radialCount * radialLength * 0.005));
    return 1 - reductionFactor;
}

/**
 * Ajusta la resistividad según condiciones climáticas
 * 
 * @param {number} baseResistivity - Resistividad base del suelo (Ω·m)
 * @param {string} weather - Condición climática
 * @param {number} humidity - Humedad del suelo (0-1)
 * @returns {number} Resistividad ajustada
 */
export function adjustResistivityForWeather(baseResistivity, weather, humidity = 0.5) {
    let factor = 1;

    switch (weather) {
        case 'rain':
            factor = 0.5;
            break;
        case 'storm':
            factor = 0.3;
            break;
        case 'snow':
            factor = 1.2;
            break;
        case 'sunny':
            factor = 1.0;
            break;
        default:
            factor = 1.0;
    }

    // La humedad afecta directamente
    factor *= (1 - humidity * 0.3);

    return baseResistivity * factor;
}

/**
 * Calcula la eficiencia del sistema de puesta a tierra
 * 
 * @param {number} resistance - Resistencia total (Ω)
 * @param {number} targetResistance - Resistencia objetivo (Ω)
 * @returns {number} Eficiencia en porcentaje
 */
export function calculateEfficiency(resistance, targetResistance = 5) {
    if (resistance <= 0) return 100;
    if (resistance >= targetResistance * 10) return 0;

    const efficiency = Math.max(0, Math.min(100, (1 - (resistance - targetResistance) / (targetResistance * 9)) * 100));
    return efficiency;
}

/**
 * Calcula la corriente de dispersión hacia tierra
 * 
 * @param {number} voltage - Voltaje de falla (V)
 * @param {number} resistance - Resistencia total (Ω)
 * @returns {number} Corriente en Amperes
 */
export function calculateFaultCurrent(voltage, resistance) {
    if (resistance <= 0) return 0;
    return voltage / resistance;
}

/**
 * Determina el estado del sistema basado en la resistencia
 * 
 * @param {number} resistance - Resistencia total (Ω)
 * @returns {object} Estado con color y mensaje
 */
export function getSystemStatus(resistance) {
    if (resistance <= 5) {
        return { status: 'excellent', color: '#00ff88', message: 'Excelente' };
    } else if (resistance <= 10) {
        return { status: 'good', color: '#88ff00', message: 'Bueno' };
    } else if (resistance <= 25) {
        return { status: 'warning', color: '#ffaa00', message: 'Advertencia' };
    } else {
        return { status: 'danger', color: '#ff4444', message: 'Peligro' };
    }
}

/**
 * Objeto principal con todos los parámetros del sistema
 */
export class GroundingSystem {
    constructor() {
        this.rodCount = 4;
        this.rodLength = 2.4;  // metros
        this.rodDiameter = 0.016;  // 16mm típico
        this.rodSpacing = 3;  // metros entre varillas
        this.radialCount = 8;
        this.radialLength = 5;  // metros
        this.soilType = 'clay';
        this.weather = 'sunny';
        this.humidity = 0.5;
        this.faultVoltage = 220;  // Voltios
        this.targetResistance = 5;  // Ohms objetivo
    }

    /**
     * Calcula todas las métricas del sistema
     * @returns {object} Todas las métricas calculadas
     */
    calculate() {
        // Obtener resistividad base del suelo
        let resistivity = SOIL_RESISTIVITY[this.soilType] || 100;

        // Ajustar por clima y humedad
        resistivity = adjustResistivityForWeather(resistivity, this.weather, this.humidity);

        // Resistencia de una varilla
        const singleRodR = calculateSingleRodResistance(
            resistivity,
            this.rodLength,
            this.rodDiameter
        );

        // Factor de acoplamiento
        const coupling = getCouplingFactor(this.rodSpacing, this.rodLength);

        // Resistencia total de varillas en paralelo
        let totalR = calculateParallelResistance(singleRodR, this.rodCount, coupling);

        // Aplicar reducción por radiales
        const radialFactor = calculateRadialContribution(totalR, this.radialCount, this.radialLength);
        totalR *= radialFactor;

        // Calcular métricas derivadas
        const efficiency = calculateEfficiency(totalR, this.targetResistance);
        const faultCurrent = calculateFaultCurrent(this.faultVoltage, totalR);
        const status = getSystemStatus(totalR);

        return {
            resistivity: resistivity,
            singleRodResistance: singleRodR,
            couplingFactor: coupling,
            totalResistance: totalR,
            efficiency: efficiency,
            faultCurrent: faultCurrent,
            status: status
        };
    }
}

export default GroundingSystem;
