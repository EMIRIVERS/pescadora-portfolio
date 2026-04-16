"use client";
import React, { useEffect, useRef } from "react";

type ColorEntry = [string, number, number, number];

interface AnimatedDotsProps {
  dotsNum?: number;
  dotRadius?: number;
  dotSpacing?: number;
  speedRange?: [number, number];
  backgroundColor?: string;
  opacity?: number;
  blendMode?: GlobalCompositeOperation;
  fullScreen?: boolean;
  className?: string;
  colors?: ColorEntry[];
}

export const AnimatedDots: React.FC<AnimatedDotsProps> = ({
  dotsNum = 60,
  dotRadius = 10,
  dotSpacing = 0,
  speedRange = [1, 4],
  backgroundColor = "transparent",
  opacity = 1,
  blendMode = "normal",
  fullScreen = true,
  className = "",
  colors = [
    ["red", 255, 69, 58],
    ["orange", 255, 149, 0],
    ["yellow", 255, 214, 10],
    ["green", 52, 199, 89],
    ["mint", 0, 199, 190],
    ["teal", 48, 176, 199],
    ["blue", 0, 122, 255],
    ["indigo", 88, 86, 214],
    ["purple", 175, 82, 222],
    ["pink", 255, 45, 85],
    ["rose", 255, 100, 130],
    ["lime", 164, 255, 46],
    ["aqua", 46, 255, 220],
    ["sky", 100, 200, 255],
    ["violet", 205, 150, 255],
    ["gold", 255, 215, 0],
  ],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<object[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const TWO_PI = 2 * Math.PI;
    let width = fullScreen ? window.innerWidth : canvas.offsetWidth;
    let height = fullScreen ? window.innerHeight : canvas.offsetHeight;

    class Dot {
      i: number;
      velocity: number;
      ranVelocity: number;
      ranColor: number;
      radius: number;
      barLength: number;
      x: number;
      y: number;

      constructor(i: number) {
        this.i = i;
        this.radius = dotRadius;
        this.barLength = 80 + Math.random() * 160;
        this.ranVelocity =
          Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
        this.ranColor = Math.round(Math.random() * (colors.length - 1));
        this.x = this.radius + i * (this.radius * 2 + dotSpacing);
        // randomize start position so bars fill the screen immediately
        this.velocity = Math.random() * (height + this.barLength);
        this.y = -this.barLength + this.velocity;
      }

      draw() {
        this.velocity += this.ranVelocity;

        if (this.velocity >= height + this.barLength) {
          this.velocity = 0;
          this.ranColor = Math.round(Math.random() * (colors.length - 1));
          this.ranVelocity =
            Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
          this.barLength = 80 + Math.random() * 160;
        }

        this.y = -this.barLength + this.velocity;

        const x = this.x % width;
        const [, r, g, b] = colors[this.ranColor];

        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, this.y);
        ctx.lineTo(x, this.y + this.barLength);
        ctx.stroke();
      }
    }

    const resizeCanvas = () => {
      width = fullScreen ? window.innerWidth : canvas.offsetWidth;
      height = fullScreen ? window.innerHeight : canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      createDots();
    };

    const createDots = () => {
      dotsRef.current = [];
      const colWidth = dotRadius * 2 + dotSpacing + 1;
      const count = Math.max(dotsNum, Math.ceil(width / colWidth) + 1);
      for (let i = 0; i < count; i++) {
        dotsRef.current.push(new Dot(i));
      }
    };

    const draw = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (const dot of dotsRef.current as Dot[]) {
        dot.draw();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [
    dotsNum,
    dotRadius,
    colors,
    dotSpacing,
    speedRange,
    backgroundColor,
    opacity,
    blendMode,
    fullScreen,
  ]);

  return (
    <div
      className={`relative ${fullScreen ? "w-screen h-screen" : ""} ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
