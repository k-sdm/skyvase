"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

export interface SkyShaderProps {
  yShift: number;   // screen-space vertical shift, -2 to +2 (fraction of screen height)
  vStretch: number; // vertical stretch multiplier, 0.05 (squished) to 3 (tall)
}

const vertexShader = /* glsl */ `
  uniform vec3 sunPosition;
  uniform vec3 up;
  uniform float turbidity;
  uniform float rayleigh;
  uniform float mieCoefficient;

  varying vec3 vWorldPosition;
  varying vec3 vSunDirection;
  varying float vSunfade;
  varying vec3 vBetaR;
  varying vec3 vBetaM;
  varying float vSunE;

  const float e = 2.71828182845904523536028747135266249775724709369995;
  const float pi = 3.141592653589793238462643383279502884197169;
  const float cutoffAngle = 1.6110731556870734;
  const float steepness = 1.5;
  const float EE = 1000.0;
  const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
  const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);

  float sunIntensity(float zenithAngleCos) {
    zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
    return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
  }

  vec3 totalMie(float T) {
    float c = (0.2 * T) * 10E-18;
    return 0.434 * c * MieConst;
  }

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w;

    vSunDirection = normalize(sunPosition);
    vSunE = sunIntensity(dot(vSunDirection, up));
    vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);

    float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));
    vBetaR = totalRayleigh * rayleighCoefficient;
    vBetaM = totalMie(turbidity) * mieCoefficient;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float mieDirectionalG;
  uniform vec3 up;

  varying vec3 vWorldPosition;
  varying vec3 vSunDirection;
  varying float vSunfade;
  varying vec3 vBetaR;
  varying vec3 vBetaM;
  varying float vSunE;

  const float pi = 3.141592653589793238462643383279502884197169;
  const float rayleighZenithLength = 8.4E3;
  const float mieZenithLength = 1.25E3;
  const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692;
  const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
  const float ONE_OVER_FOURPI = 0.07957747154594767;

  float rayleighPhase(float cosTheta) {
    return THREE_OVER_SIXTEENPI * (1.0 + pow(cosTheta, 2.0));
  }

  float hgPhase(float cosTheta, float g) {
    float g2 = pow(g, 2.0);
    float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
    return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
  }

  void main() {
    vec3 direction = normalize(vWorldPosition - cameraPosition);
    float zenithAngle = acos(max(0.0, dot(up, direction)));
    float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
    float sR = rayleighZenithLength * inverse;
    float sM = mieZenithLength * inverse;

    vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));

    float cosTheta = dot(direction, vSunDirection);
    float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
    vec3 betaRTheta = vBetaR * rPhase;
    float mPhase = hgPhase(cosTheta, mieDirectionalG);
    vec3 betaMTheta = vBetaM * mPhase;

    vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
    Lin *= mix(
      vec3(1.0),
      pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0 / 2.0)),
      clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0)
    );

    vec3 L0 = vec3(0.1) * Fex;
    // Sun disk disabled — atmospheric scattering only
    // float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
    // L0 += (vSunE * 19000.0 * Fex) * sundisk;

    vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
    vec3 retColor = pow(texColor, vec3(1.0 / (1.2 + (1.2 * vSunfade))));

    gl_FragColor = vec4(retColor, 1.0);
  }
`;

const PITCH_DEG = 22;

export function SkyShader({ yShift, vStretch }: SkyShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const paramsRef = useRef({ yShift, vStretch });
  paramsRef.current = { yShift, vStretch };

  function applyProjection(cam: THREE.PerspectiveCamera) {
    cam.updateProjectionMatrix();
    const p = paramsRef.current;
    cam.projectionMatrix.elements[5] *= p.vStretch;
    cam.projectionMatrix.elements[9] = p.yShift;
  }

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    applyProjection(cam);
  }, [yShift, vStretch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.26;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      100,
      2000000
    );
    camera.position.set(0, 200, 0);
    cameraRef.current = camera;

    const pitchRad = (PITCH_DEG * Math.PI) / 180;
    camera.lookAt(
      0,
      200 + Math.sin(pitchRad) * 1000,
      -Math.cos(pitchRad) * 1000
    );
    applyProjection(camera);

    const skyGeo = new THREE.SphereGeometry(450000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        turbidity: { value: 1.6 },
        rayleigh: { value: 2.85 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.7 },
        sunPosition: { value: new THREE.Vector3() },
        up: { value: new THREE.Vector3(0, 1, 0) },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 2.3);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    skyMat.uniforms.sunPosition.value.copy(sun);

    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      applyProjection(camera);
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      cameraRef.current = null;
      renderer.dispose();
      skyGeo.dispose();
      skyMat.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-screen w-screen"
    />
  );
}
