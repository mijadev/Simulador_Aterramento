// currentShader.js - Shaders para visualización de flujo de corriente

export const currentFlowShader = {
    uniforms: {
        time: { value: 0 },
        intensity: { value: 1.0 },
        color1: { value: null },
        color2: { value: null }
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
    uniform float time;
    uniform float intensity;
    uniform vec3 color1;
    uniform vec3 color2;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Función de ruido simple
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      // Dirección del flujo (desde el centro hacia afuera)
      float distFromCenter = length(vPosition.xz);
      
      // Animación de pulso
      float pulse = sin(distFromCenter * 2.0 - time * 3.0) * 0.5 + 0.5;
      pulse = smoothstep(0.3, 0.7, pulse);
      
      // Ruido para efecto eléctrico
      float n = noise(vUv * 10.0 + time);
      float electric = smoothstep(0.4, 0.6, n);
      
      // Mezcla de colores
      vec3 color = mix(color2, color1, pulse * intensity);
      
      // Añadir brillo
      float glow = pulse * electric * intensity;
      color += vec3(glow * 0.3);
      
      // Alpha basado en intensidad y distancia
      float alpha = (0.5 + pulse * 0.5) * intensity;
      alpha *= 1.0 - smoothstep(5.0, 10.0, distFromCenter);
      
      gl_FragColor = vec4(color, alpha);
    }
  `
};

export const particleFlowShader = {
    uniforms: {
        time: { value: 0 },
        intensity: { value: 1.0 },
        pointTexture: { value: null }
    },

    vertexShader: `
    attribute float size;
    attribute float phase;
    attribute vec3 velocity;
    
    varying vec3 vColor;
    varying float vAlpha;
    
    uniform float time;
    uniform float intensity;
    
    void main() {
      vColor = color;
      
      vec3 pos = position;
      
      // Movimiento de partículas
      pos += velocity * time * 0.1;
      
      // Ondulación
      float wave = sin(time * 2.0 + phase) * 0.1;
      pos.y += wave;
      
      // Efecto de parpadeo
      vAlpha = 0.5 + 0.5 * sin(time * 5.0 + phase * 3.0);
      vAlpha *= intensity;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (150.0 / -mvPosition.z) * intensity;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

    fragmentShader: `
    uniform sampler2D pointTexture;
    
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      vec2 uv = gl_PointCoord;
      
      // Gradiente circular
      float dist = length(uv - 0.5);
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      
      // Color con brillo central
      vec3 color = vColor;
      color += vec3(1.0) * (1.0 - dist * 2.0) * 0.3;
      
      gl_FragColor = vec4(color, alpha * vAlpha);
    }
  `
};

export const electricArcShader = {
    uniforms: {
        time: { value: 0 },
        intensity: { value: 1.0 },
        arcColor: { value: null }
    },

    vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

    fragmentShader: `
    uniform float time;
    uniform float intensity;
    uniform vec3 arcColor;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
      // Efecto de arco eléctrico
      float arc = noise(vUv * 20.0 + time * 10.0);
      arc = pow(arc, 3.0);
      
      // Pulso de energía
      float pulse = sin(vUv.x * 10.0 - time * 5.0) * 0.5 + 0.5;
      
      vec3 color = arcColor * (1.0 + arc * 0.5);
      color += vec3(1.0, 1.0, 0.8) * arc * pulse;
      
      float alpha = (0.3 + arc * 0.7) * intensity * pulse;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
};

export default {
    currentFlowShader,
    particleFlowShader,
    electricArcShader
};
