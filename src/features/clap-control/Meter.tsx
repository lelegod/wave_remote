import { useEffect, useRef } from "react";

export interface MeterController {
  push(amplitude: number): void;
}

interface MeterProps {
  controller: React.MutableRefObject<MeterController | null>;
  accent?: string;
  height?: number;
}

const BARS = 34;

export function Meter({ controller, accent = "#F5A623", height = 84 }: MeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(0);
  const env = useRef(0);

  useEffect(() => {
    controller.current = {
      push(amplitude: number) {
        target.current = Math.max(0, Math.min(1, amplitude / 255));
      }
    };

    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext("2d") : null;

    let raf = 0;
    let onResize: (() => void) | null = null;

    if (canvas && ctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      function resize() {
        const rect = canvas!.getBoundingClientRect();
        canvas!.width = Math.max(1, Math.round(rect.width * dpr));
        canvas!.height = Math.max(1, Math.round(rect.height * dpr));
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        return rect;
      }

      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function draw(t: number, rect: DOMRect) {
        const w = rect.width;
        const h = rect.height;
        const mid = h / 2;
        ctx!.clearRect(0, 0, w, h);
        const gap = 3;
        const bw = (w - (BARS - 1) * gap) / BARS;
        for (let i = 0; i < BARS; i++) {
          const x = i * (bw + gap);
          const d = Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
          const wobble = 0.5 + 0.5 * Math.sin(t / 180 + i * 0.7);
          const idle = (0.14 + wobble * 0.12) * 0.16;
          const mag = idle + env.current * (1 - d * 0.7) * 0.9;
          const bh = Math.max(2, mag * (h * 0.9));
          ctx!.fillStyle = accent;
          ctx!.globalAlpha = 0.35 + Math.min(0.65, mag * 1.4);
          ctx!.fillRect(x, mid - bh / 2, bw, bh);
        }
        ctx!.globalAlpha = 1;
      }

      let rect = resize();
      onResize = () => { rect = resize(); };
      window.addEventListener("resize", onResize);

      if (reduce) {
        env.current = 0.4;
        draw(0, rect);
      } else {
        const loop = (t: number) => {
          env.current += (target.current - env.current) * 0.25;
          target.current *= 0.92;
          draw(t, rect);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
    }

    return () => {
      controller.current = null;
      if (onResize) window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [accent]);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: `${height}px` }} />;
}
