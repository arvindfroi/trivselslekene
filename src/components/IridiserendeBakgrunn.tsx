"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

/**
 * Flytende, flettede regnbuebånd som WebGL-bakgrunn — inspirert av
 * "iridescent braided shader", men skrevet for ogl (som prosjektet
 * allerede bruker til PrismaticBurst) i stedet for three.js.
 *
 * Fem sinus-tråder flettes over/under hverandre (dybden moduleres i
 * motfase), farges med en tynnfilm-aktig cosinuspalett og tones ut mot
 * kantene med en vignett. Tegnes i redusert oppløsning for ytelse.
 */

const vertex = /* glsl */ `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;

// Tynnfilm-palett: regnbueskimmer via cosinus over fasene RGB
vec3 pal(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.00, 0.33, 0.67)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float t = uTime * 0.12;
  vec3 col = vec3(0.0);

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float fase = fi * 1.257 + t * (0.6 + 0.11 * fi);
    // Trådens bane: to overlagrede bølger gir "halvsirkel"-flyt
    float y = (0.30 + 0.05 * fi) * sin(uv.x * (1.6 + 0.25 * fi) + fase)
            * cos(uv.x * 0.6 - t * 0.8 + fi * 0.7);
    float d = abs(uv.y - y);
    float w = 0.014 + 0.007 * sin(uv.x * 2.5 + fase * 1.7);
    // Myk glorie rundt tråden + skarp kjerne
    float glorie = exp(-(d * d) / (w * w * 40.0));
    float kjerne = smoothstep(w, 0.0, d);
    // Fletting: tråden går "over" og "under" i motfase med banen
    float dybde = 0.55 + 0.45 * sin(uv.x * (1.6 + 0.25 * fi) + fase + 1.5708);
    vec3 irid = pal(uv.x * 0.30 + fi * 0.19 + t * 0.6 + d * 5.0);
    col += irid * (glorie * 0.18 + kjerne * 0.55) * dybde;
  }

  // Vignett mot kantene så innholdet over får ro
  float vig = smoothstep(1.35, 0.30, length(uv * vec2(0.8, 1.15)));
  col *= vig;

  // Alfa følger lysstyrken: de mørke mellomrommene blir gjennomsiktige, så
  // bare de iriserende båndene tegnes og glød-blobbene skinner gjennom bak
  float a = clamp(max(col.r, max(col.g, col.b)) * 1.4, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

export default function IridiserendeBakgrunn({
  className = "",
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // WebGL kan mangle (headless, eldre enheter, GPU-sperre). Da faller vi
    // stille tilbake til de vanlige glød-blobbene bak — ingen kræsj, ingen
    // svart flate over innholdet.
    let renderer: Renderer;
    try {
      // alpha: true så lerretet ALDRI legger en ugjennomsiktig svart flate
      // over sliden hvis stablingen skulle svikte — bakgrunnen skinner gjennom
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2) * 0.6,
        alpha: true,
        antialias: false,
      });
    } catch {
      return;
    }
    const gl = renderer.gl;
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    container.appendChild(gl.canvas);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uResolution: { value: [1, 1] },
        uTime: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const settStorrelse = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    settStorrelse();
    const ro = new ResizeObserver(settStorrelse);
    ro.observe(container);

    let raf = 0;
    const start = performance.now();
    const tegn = (naa: number) => {
      program.uniforms.uTime.value = (naa - start) / 1000;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(tegn);
    };
    raf = requestAnimationFrame(tegn);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      try {
        // canvas kan alt være fjernet av en tidligere StrictMode-cleanup
        if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        /* opprydding skal aldri velte siden */
      }
    };
  }, []);

  return <div ref={containerRef} aria-hidden className={`absolute inset-0 ${className}`} />;
}
