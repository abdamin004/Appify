import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const handleMouseMove = (event) => {
            mouseRef.current.x = event.x;
            mouseRef.current.y = event.y;
        };

        const handleMouseLeave = () => {
            mouseRef.current.x = null;
            mouseRef.current.y = null;
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        // Configuration
        const PARTICLE_count = Math.min(80, (window.innerWidth * window.innerHeight) / 10000);
        const CONNECTION_DISTANCE = 160;
        const MOUSE_RADIUS = 200;

        // Subtle Slate Theme (Less "light/white")
        const COLORS = ['#cbd5e1', '#94a3b8', '#64748b']; // Slate-300, 400, 500

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 1.0; // Slower natural movement
                this.vy = (Math.random() - 0.5) * 1.0;
                this.baseSize = Math.random() * 2 + 1.5; // Smaller (1.5-3.5px)
                this.size = this.baseSize;
                this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
                this.angle = Math.random() * Math.PI * 2;
                this.spinSpeed = (Math.random() - 0.5) * 0.02; // Slower spin
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.angle += this.spinSpeed;

                // Bounce off edges
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

                this.size = this.baseSize;

                // Mouse Interaction (Very Gentle)
                if (mouseRef.current.x != null) {
                    let dx = mouseRef.current.x - this.x;
                    let dy = mouseRef.current.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < MOUSE_RADIUS) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;

                        // Very subtle attraction (0.15)
                        const directionX = forceDirectionX * force * 0.15;
                        const directionY = forceDirectionY * force * 0.15;

                        this.vx += directionX;
                        this.vy += directionY;

                        // Minimal growth (+1px max)
                        this.size = this.baseSize + (force * 1);

                        // Low Max Speed
                        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                        const maxSpeed = 3;
                        if (speed > maxSpeed) {
                            this.vx = (this.vx / speed) * maxSpeed;
                            this.vy = (this.vy / speed) * maxSpeed;
                        }
                    } else {
                        // Drag/Friction to slow down
                        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                        if (speed > 1.5) {
                            this.vx *= 0.96;
                            this.vy *= 0.96;
                        }
                    }
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);

                // Hexagon Shape
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    ctx.lineTo(this.size * Math.cos(i * Math.PI / 3), this.size * Math.sin(i * Math.PI / 3));
                }
                ctx.closePath();

                ctx.fillStyle = this.color;
                ctx.globalAlpha = 0.6; // More transparent

                // Minimal/No Glow
                // ctx.shadowBlur = 0; 

                ctx.fill();

                ctx.restore();
            }
        }

        const initParticles = () => {
            particles = [];
            const numberOfParticles = Math.min(80, (canvas.width * canvas.height) / 10000);
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        };

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((particle, index) => {
                particle.update();
                particle.draw();

                // Connections
                for (let j = index + 1; j < particles.length; j++) {
                    const dx = particle.x - particles[j].x;
                    const dy = particle.y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DISTANCE) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 - distance / 1000})`; // Slate-400, very faint
                        ctx.lineWidth = 1;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }

                // Mouse Connections
                if (mouseRef.current.x != null) {
                    const dx = particle.x - mouseRef.current.x;
                    const dy = particle.y - mouseRef.current.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < MOUSE_RADIUS) {
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; // Discrete slate connection
                        ctx.lineWidth = 1;

                        // Dynamic opacity
                        ctx.globalAlpha = 0.3 - distance / MOUSE_RADIUS;

                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'transparent' }}
        />
    );
};

export default ParticleBackground;
