// terrainShader.js - Shaders para efectos de terreno y humedad

export const terrainShader = {
    uniforms: {
        baseColor: { value: null },
        wetColor: { value: null },
        humidity: { value: 0.5 },
        time: { value: 0 },
        highlightPosition: { value: null },
        highlightRadius: { value: 3.0 },
        highlightActive: { value: false }
    },

    vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying float vElevation;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      vElevation = position.y;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

    fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 wetColor;
    uniform float humidity;
    uniform float time;
    uniform vec3 highlightPosition;
    uniform float highlightRadius;
    uniform bool highlightActive;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying float vElevation;
    
    // Ruido para textura
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      return value;
    }
    
    void main() {
      // Color base con variación de ruido
      float n = fbm(vUv * 50.0);
      vec3 color = baseColor * (0.8 + n * 0.4);
      
      // Efecto de humedad
      float wetFactor = humidity;
      
      // Zonas bajas más húmedas
      wetFactor += smoothstep(0.5, -0.5, vElevation) * 0.3;
      wetFactor = clamp(wetFactor, 0.0, 1.0);
      
      // Mezclar con color húmedo
      color = mix(color, wetColor * color, wetFactor * 0.5);
      
      // Oscurecer zonas húmedas
      color *= 1.0 - wetFactor * 0.2;
      
      // Brillo especular en zonas húmedas
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float spec = pow(max(dot(reflect(-lightDir, vNormal), vec3(0.0, 1.0, 0.0)), 0.0), 16.0);
      color += vec3(spec * wetFactor * 0.3);
      
      // Resaltado del pincel en modo edición
      if (highlightActive) {
        float dist = length(vPosition.xz - highlightPosition.xz);
        float ring = smoothstep(highlightRadius, highlightRadius - 0.2, dist);
        ring *= smoothstep(highlightRadius - 0.5, highlightRadius - 0.3, dist);
        
        // Añadir anillo de resaltado
        color += vec3(0.0, 0.5, 1.0) * ring * 0.5;
        
        // Centro del pincel
        float center = smoothstep(highlightRadius * 0.3, 0.0, dist);
        color += vec3(0.0, 1.0, 0.5) * center * 0.3;
      }
      
      // Iluminación básica
      float light = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;
      color *= light;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export const groundLayerShader = {
    uniforms: {
        surfaceColor: { value: null },
        subsoilColor: { value: null },
        rockColor: { value: null },
        depth: { value: 0 },
        conductivity: { value: 0.5 },
        time: { value: 0 }
    },

    vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

    fragmentShader: `
    uniform vec3 surfaceColor;
    uniform vec3 subsoilColor;
    uniform vec3 rockColor;
    uniform float depth;
    uniform float conductivity;
    uniform float time;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      // Capas del suelo
      float d = -vPosition.y;  // Profundidad (positiva hacia abajo)
      
      vec3 color;
      
      if (d < 0.3) {
        // Capa superficial
        color = surfaceColor;
      } else if (d < 1.5) {
        // Subsuelo
        float t = (d - 0.3) / 1.2;
        color = mix(surfaceColor, subsoilColor, t);
      } else {
        // Roca/base
        float t = clamp((d - 1.5) / 1.0, 0.0, 1.0);
        color = mix(subsoilColor, rockColor, t);
      }
      
      // Indicador de conductividad
      float condGlow = conductivity * sin(time * 2.0 + d * 3.0) * 0.15;
      color += vec3(condGlow, condGlow * 0.8, 0.0);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export const soilCrossSectionShader = {
    uniforms: {
        layers: { value: [] },  // Array de colores de capas
        layerHeights: { value: [] },  // Alturas de cada capa
        humidity: { value: 0.5 },
        showCurrent: { value: true },
        currentIntensity: { value: 1.0 },
        time: { value: 0 }
    },

    vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

    fragmentShader: `
    uniform float humidity;
    uniform bool showCurrent;
    uniform float currentIntensity;
    uniform float time;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      // Colores de las capas predefinidos
      vec3 topsoilColor = vec3(0.4, 0.25, 0.1);
      vec3 subsoilColor = vec3(0.5, 0.35, 0.2);
      vec3 clayColor = vec3(0.6, 0.4, 0.25);
      vec3 rockColor = vec3(0.4, 0.4, 0.45);
      
      float depth = -vPosition.y;
      vec3 color;
      
      // Transiciones suaves entre capas
      if (depth < 0.5) {
        color = topsoilColor;
      } else if (depth < 1.5) {
        float t = smoothstep(0.5, 1.5, depth);
        color = mix(topsoilColor, subsoilColor, t);
      } else if (depth < 3.0) {
        float t = smoothstep(1.5, 3.0, depth);
        color = mix(subsoilColor, clayColor, t);
      } else {
        float t = smoothstep(3.0, 5.0, depth);
        color = mix(clayColor, rockColor, t);
      }
      
      // Efecto de humedad
      color *= 1.0 - humidity * 0.2;
      
      // Visualización de corriente
      if (showCurrent) {
        float dist = length(vPosition.xz);
        float currentFlow = sin(dist * 2.0 - time * 3.0) * 0.5 + 0.5;
        currentFlow *= exp(-dist * 0.2) * currentIntensity;
        currentFlow *= exp(-depth * 0.5);  // Decrece con la profundidad
        
        color += vec3(1.0, 0.8, 0.0) * currentFlow * 0.3;
      }
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export default {
    terrainShader,
    groundLayerShader,
    soilCrossSectionShader
};
