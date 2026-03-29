'use client';

import { useEffect, useRef, useCallback } from 'react';

const CANVAS_WIDTH = 40;
const CANVAS_HEIGHT = 30;
const LERP_FACTOR = 0.15;
const ANGLE_LERP = 0.1;
const BASE_WAG_SPEED = 3;
const WAG_AMPLITUDE = 0.4;
const VELOCITY_WAG_MULTIPLIER = 0.15;

export default function FishCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -100, y: -100 });
  const posRef = useRef({ x: -100, y: -100 });
  const prevMouseRef = useRef({ x: -100, y: -100 });
  const velocityRef = useRef({ dx: 0, dy: 0 });
  const angleRef = useRef(Math.PI);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  }, []);

  useEffect(() => {
    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';

    const styleEl = document.createElement('style');
    styleEl.textContent = '* { cursor: none !important; }';
    document.head.appendChild(styleEl);

    window.addEventListener('mousemove', handleMouseMove);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      time += 1 / 60;

      // Compute velocity
      const dx = mouseRef.current.x - prevMouseRef.current.x;
      const dy = mouseRef.current.y - prevMouseRef.current.y;
      velocityRef.current.dx = dx;
      velocityRef.current.dy = dy;
      prevMouseRef.current.x = mouseRef.current.x;
      prevMouseRef.current.y = mouseRef.current.y;

      // Lerp position
      posRef.current.x += (mouseRef.current.x - posRef.current.x) * LERP_FACTOR;
      posRef.current.y += (mouseRef.current.y - posRef.current.y) * LERP_FACTOR;

      // Compute target angle from velocity
      const speed = Math.sqrt(dx * dx + dy * dy);
      let targetAngle = Math.PI; // face left when still
      if (speed > 1.5) {
        targetAngle = Math.atan2(dy, dx);
      }

      // Lerp angle (handle wrapping)
      let angleDiff = targetAngle - angleRef.current;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      angleRef.current += angleDiff * ANGLE_LERP;

      // Tail wag parameters
      const wagSpeed = BASE_WAG_SPEED + speed * VELOCITY_WAG_MULTIPLIER;
      const tailAngle = Math.sin(time * wagSpeed * 2 * Math.PI) * WAG_AMPLITUDE;

      // Draw
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.rotate(angleRef.current);

      // Body ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f2ede6';
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      const tailTipX = -16;
      const tailTipY = Math.sin(tailAngle) * 6;
      const cpX = -12;
      const cpY = tailTipY * 0.5;
      ctx.quadraticCurveTo(cpX, cpY - 3, tailTipX, tailTipY - 4);
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(cpX, cpY + 3, tailTipX, tailTipY + 4);
      ctx.strokeStyle = '#f2ede6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tail fill
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(cpX, cpY - 3, tailTipX, tailTipY - 4);
      ctx.lineTo(tailTipX, tailTipY + 4);
      ctx.quadraticCurveTo(cpX, cpY + 3, -8, 0);
      ctx.fillStyle = '#f2ede6';
      ctx.fill();

      // Eye
      ctx.beginPath();
      ctx.arc(5, -1.5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();

      ctx.restore();

      // Position canvas
      canvas.style.left = `${posRef.current.x}px`;
      canvas.style.top = `${posRef.current.y}px`;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
      styleEl.remove();
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}
