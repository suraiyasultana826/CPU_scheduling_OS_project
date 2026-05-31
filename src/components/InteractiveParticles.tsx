import { useEffect, useRef } from 'react';

interface InteractiveParticlesProps {
  darkMode: boolean;
}

export default function InteractiveParticles({ darkMode }: InteractiveParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class definition
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Slow float speeds
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 2.5 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off bounds with small padding
        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        // Beautiful slate blue / sky blue coloring
        ctx.fillStyle = darkMode ? 'rgba(56, 189, 248, 0.45)' : 'rgba(14, 165, 233, 0.25)';
        ctx.fill();
      }
    }

    const mouse = { x: -1000, y: -1000 };
    const particles: Particle[] = Array.from({ length: 45 }, () => new Particle());

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const drawConnections = () => {
      const maxDistance = 140;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * (darkMode ? 0.15 : 0.08);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = darkMode
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(14, 165, 233, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Mouse interaction: draw faint link to mouse and gently repel particle
        if (mouse.x > 0) {
          const dx = particles[i].x - mouse.x;
          const dy = particles[i].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            // Push particles gently away from the mouse
            const force = (180 - dist) / 180;
            particles[i].vx += (dx / dist) * force * 0.04;
            particles[i].vy += (dy / dist) * force * 0.04;

            // Cap velocity
            const speed = Math.sqrt(particles[i].vx ** 2 + particles[i].vy ** 2);
            if (speed > 1.2) {
              particles[i].vx = (particles[i].vx / speed) * 1.2;
              particles[i].vy = (particles[i].vy / speed) * 1.2;
            }

            const alpha = (1 - dist / 180) * (darkMode ? 0.12 : 0.06);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = darkMode
              ? `rgba(99, 102, 241, ${alpha})` // Indigo link
              : `rgba(79, 70, 229, ${alpha})`;
            ctx.stroke();
          }
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      drawConnections();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}
