"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

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
  uniform float cloudScale;
  uniform float cloudSpeed;
  uniform float cloudCoverage;
  uniform float cloudDensity;
  uniform float cloudElevation;
  uniform float time;

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

  // Cloud noise functions
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

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

    // Clouds
    if (direction.y > 0.0 && cloudCoverage > 0.0) {

      // Project to cloud plane (higher elevation = clouds appear lower/closer)
      float elevation = mix(1.0, 0.1, cloudElevation);
      vec2 cloudUV = direction.xz / (direction.y * elevation);
      cloudUV *= cloudScale;
      cloudUV += time * cloudSpeed;

      // Multi-octave noise for fluffy clouds
      float cloudNoise = fbm(cloudUV * 1000.0);
      cloudNoise += 0.5 * fbm(cloudUV * 2000.0 + 3.7);
      cloudNoise = cloudNoise * 0.5 + 0.5;

      // Apply coverage threshold
      float cloudMask = smoothstep(1.0 - cloudCoverage, 1.0 - cloudCoverage + 0.3, cloudNoise);

      // Fade clouds near horizon (adjusted by elevation)
      float horizonFade = smoothstep(0.0, 0.1 + 0.2 * cloudElevation, direction.y);
      cloudMask *= horizonFade;

      // Cloud lighting based on sun position
      float sunInfluence = dot(direction, vSunDirection) * 0.5 + 0.5;
      float daylight = max(0.0, vSunDirection.y * 2.0);

      // Base cloud color affected by atmosphere
      vec3 atmosphereColor = Lin * 0.04;
      vec3 cloudColor = mix(vec3(0.3), vec3(1.0), daylight);
      cloudColor = mix(cloudColor, atmosphereColor + vec3(1.0), sunInfluence * 0.5);
      cloudColor *= vSunE * 0.00002;

      // Blend clouds with sky
      texColor = mix(texColor, cloudColor, cloudMask * cloudDensity);

    }

    vec3 retColor = pow(texColor, vec3(1.0 / (1.2 + (1.2 * vSunfade))));

    gl_FragColor = vec4(retColor, 1.0);
  }
`;

const PITCH_DEG = 22;

const SKY_CLEAR = 0xffffff;

// Subtle camera "wiggle" parallax driven by the desktop mouse — tune to taste.
const WIGGLE = {
  yawDeg: 2.2,   // max horizontal sway
  pitchDeg: 1.6, // max vertical sway
  ease: 0.06,    // smoothing toward target per frame (~60fps)
};

// Cloud appearance — tune to taste.
const CLOUDS = {
  scale: 0.0002,
  speed: 0.0001,
  coverage: 0.3,
  density: 0.25,
  elevation: 0.45,
};

function isMobileSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

function readCanvasSize(canvas: HTMLCanvasElement) {
  const vv = window.visualViewport;
  if (vv && isMobileSafari()) {
    return {
      width: Math.round(vv.width),
      height: Math.round(vv.height),
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
      useVisualViewport: true as const,
    };
  }
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w > 0 && h > 0) {
    return { width: w, height: h, offsetTop: 0, offsetLeft: 0, useVisualViewport: false as const };
  }
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
    useVisualViewport: false as const,
  };
}

function applyCanvasLayout(
  canvas: HTMLCanvasElement,
  layout: ReturnType<typeof readCanvasSize>
) {
  if (layout.useVisualViewport) {
    canvas.style.position = "fixed";
    canvas.style.top = `${layout.offsetTop}px`;
    canvas.style.left = `${layout.offsetLeft}px`;
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    canvas.style.right = "auto";
    canvas.style.bottom = "auto";
  } else {
    canvas.style.position = "";
    canvas.style.top = "";
    canvas.style.left = "";
    canvas.style.width = "";
    canvas.style.height = "";
    canvas.style.right = "";
    canvas.style.bottom = "";
  }
}

export function SkyShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const canvas: HTMLCanvasElement = el;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(SKY_CLEAR);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.26;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 100, 2000000);
    camera.position.set(0, 200, 0);

    const basePitch = (PITCH_DEG * Math.PI) / 180;
    const maxYaw = (WIGGLE.yawDeg * Math.PI) / 180;
    const maxPitch = (WIGGLE.pitchDeg * Math.PI) / 180;
    const lookAt = new THREE.Vector3();

    // nx/ny are normalised offsets in [-1, 1]; (0, 0) is the resting view.
    function applyLook(nx: number, ny: number) {
      const yaw = nx * maxYaw;
      const pitch = basePitch + ny * maxPitch;
      const cosP = Math.cos(pitch);
      lookAt.set(
        camera.position.x + Math.sin(yaw) * cosP * 1000,
        camera.position.y + Math.sin(pitch) * 1000,
        camera.position.z - Math.cos(yaw) * cosP * 1000
      );
      camera.lookAt(lookAt);
    }
    applyLook(0, 0);

    // Target is driven by cursor position (desktop pointer only); current
    // eases toward it each frame for a soft, floaty feel.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    function onPointerMove(e: PointerEvent) {
      // Ignore touch/pen so the wiggle stays a desktop-mouse-only effect.
      if (e.pointerType !== "mouse") return;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("pointermove", onPointerMove);

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
        cloudScale: { value: CLOUDS.scale },
        cloudSpeed: { value: CLOUDS.speed },
        cloudCoverage: { value: CLOUDS.coverage },
        cloudDensity: { value: CLOUDS.density },
        cloudElevation: { value: CLOUDS.elevation },
        time: { value: 0 },
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

    const clock = new THREE.Clock();
    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      current.x += (target.x - current.x) * WIGGLE.ease;
      current.y += (target.y - current.y) * WIGGLE.ease;
      applyLook(current.x, current.y);
      skyMat.uniforms.time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const layout = readCanvasSize(canvas);
      applyCanvasLayout(canvas, layout);
      camera.aspect = layout.width / layout.height;
      camera.updateProjectionMatrix();
      renderer.setSize(layout.width, layout.height, false);
    }
    onResize();

    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      skyGeo.dispose();
      skyMat.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="viewport-bleed"
    />
  );
}
