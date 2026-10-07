'use client';
import { useEffect, useRef } from 'react';

export default function PixelCursor({
  color = '#3700f8',
  particleCount = 60,
  particleSize = 4,
  magnetism = 0.04,
  friction = 0.82
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.size = particleSize * (Math.random() * 0.8 + 0.5); // Slight size variation
        this.alpha = Math.random() * 0.5 + 0.5; // Random opacity for depth
      }

      update() {
        // Calculate distance to mouse
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        
        // Magnetism: apply force towards mouse
        this.vx += dx * magnetism;
        this.vy += dy * magnetism;
        
        // Add random noise for a "swarm" or "fly" feeling
        this.vx += (Math.random() - 0.5) * 1.5;
        this.vy += (Math.random() - 0.5) * 1.5;
        
        // Apply friction
        this.vx *= friction;
        this.vy *= friction;
        
        this.x += this.vx;
        this.y += this.vy;
      }

      draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, particleCount, particleSize, magnetism, friction]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
}
