# Simulador de Aterramento de Antenas 3D

Simulador interactivo para visualizar y calcular sistemas de aterramento de antenas con Three.js.

## 🚀 Instalación

```bash
cd /home/mija/.gemini/antigravity/scratch/grounding-sim
npm install
npm run dev
```

## 🎮 Controles

| Acción | Control |
|--------|---------|
| Rotar cámara | Click derecho + arrastrar |
| Zoom | Rueda del mouse |
| Mover cámara | Click central + arrastrar |
| Editar terreno | Ctrl + Click izquierdo |
| Mover antena | Click izquierdo + arrastrar |

## ⚙️ Panel de Controles (lil-gui)

- **Antena**: Altura del mástil, número de radiales
- **Varillas**: Cantidad, longitud, diámetro
- **Suelo**: Tipo (arenoso, arcilloso, rocoso, húmedo)
- **Clima**: Soleado, lluvia, nieve, tormenta
- **Hora**: Día/Noche
- **Terreno**: Modo edición, tamaño de pincel

## 📊 Métricas

- **Rt**: Resistencia total de puesta a tierra (Ω)
- **Eficiencia**: Porcentaje de dispersión
- **Corriente**: Corriente de falla (A)
- **Estado**: Bueno/Advertencia/Peligro

## 🔬 Fórmulas

**Resistencia de una varilla:**
```
R = (ρ / 2πL) × ln(4L/d)
```

**Varillas en paralelo:**
```
Rt = R / n × (1 + λ(n-1))
```

## 📁 Estructura

```
grounding-sim/
├── src/
│   ├── main.js          # Entrada principal
│   ├── antenna.js       # Antena y varillas
│   ├── terrain.js       # Terreno editable
│   ├── climate.js       # Clima y efectos
│   ├── currentFlow.js   # Flujo de corriente
│   ├── groundMath.js    # Cálculos
│   ├── ui.js            # Panel de control
│   └── utils.js         # Utilidades
├── shaders/
│   ├── currentShader.js
│   └── terrainShader.js
└── assets/
    ├── textures/
    ├── models/
    └── heightmaps/
```
