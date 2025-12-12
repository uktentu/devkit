
import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const SPEED = 5;
const OBSTACLE_INTERVAL = 1500; // ms

export default function BugRunnerPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('devgame_highscore') || '0'));


    const scoreRef = useRef(0);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let lastObstacleTime = 0;

        // Reset mutable state
        scoreRef.current = 0;


        // Player state
        const player = {
            x: 50,
            y: canvas.height - 50,
            width: 30,
            height: 30,
            dy: 0,
            isJumping: false
        };

        // Obstacles
        let obstacles: { x: number; y: number; width: number; height: number; passed: boolean }[] = [];

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && !player.isJumping) {
                player.dy = JUMP_FORCE;
                player.isJumping = true;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        const loop = (timestamp: number) => {
            // Update
            player.dy += GRAVITY;
            player.y += player.dy;

            // Ground collision
            if (player.y > canvas.height - 30) {
                player.y = canvas.height - 30;
                player.dy = 0;
                player.isJumping = false;
            }

            // Spawn obstacles
            const currentScore = scoreRef.current;
            if (timestamp - lastObstacleTime > OBSTACLE_INTERVAL / (1 + currentScore * 0.001)) {
                const height = Math.random() * 50 + 20;
                obstacles.push({
                    x: canvas.width,
                    y: canvas.height - height,
                    width: 20,
                    height: height,
                    passed: false
                });
                lastObstacleTime = timestamp;
            }

            // Move obstacles
            obstacles.forEach(obs => {
                obs.x -= SPEED + (currentScore * 0.01);
            });

            // Remove off-screen obstacles
            obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

            // Collision detection
            const collision = obstacles.some(obs => {
                return (
                    player.x < obs.x + obs.width &&
                    player.x + player.width > obs.x &&
                    player.y < obs.y + obs.height &&
                    player.y + player.height > obs.y
                );
            });

            if (collision) {
                setGameState('gameover');
                if (currentScore > highScore) {
                    setHighScore(currentScore);
                    localStorage.setItem('devgame_highscore', currentScore.toString());
                }
                return;
            }

            // Score update
            obstacles.forEach(obs => {
                if (!obs.passed && obs.x + obs.width < player.x) {
                    obs.passed = true;
                    scoreRef.current += 100;
                    setScore(scoreRef.current);
                }
            });

            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Ground
            ctx.fillStyle = '#334155'; // Slate-700
            ctx.fillRect(0, canvas.height - 2, canvas.width, 2);

            // Draw Player (Green Code Block)
            ctx.fillStyle = '#22c55e'; // Green-500
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 10;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.shadowBlur = 0;

            // Draw Face on Player
            ctx.fillStyle = '#fff';
            ctx.fillRect(player.x + 20, player.y + 5, 4, 4); // Eye
            ctx.fillRect(player.x + 20, player.y + 15, 6, 2); // Mouth

            // Draw Obstacles (Red Bugs)
            ctx.fillStyle = '#ef4444'; // Red-500
            obstacles.forEach(obs => {
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                // "Bug" legs
                ctx.strokeStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + obs.height);
                ctx.lineTo(obs.x - 5, obs.y + obs.height + 5);
                ctx.stroke();
            });

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState, highScore]);

    const startGame = () => {
        setScore(0);
        setGameState('playing');
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-8 relative overflow-hidden">
            {/* Matrix Digital Rain Effect (css-only background) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
            }}></div>

            <h1 className="text-4xl font-mono font-bold mb-8 text-green-500 glow-text flex items-center gap-3">
                <span className="animate-pulse">&gt;</span> BUG RUNNER_
            </h1>

            <div className="relative bg-slate-800 p-2 rounded-lg border-2 border-slate-700 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="bg-slate-900 rounded border border-slate-700 block w-full max-w-[800px]"
                />

                {gameState === 'start' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                        <Trophy size={48} className="text-yellow-400 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Ready to squish bugs?</h2>
                        <p className="text-slate-400 mb-6 font-mono">Press SPACE to Jump</p>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-green-800 hover:border-green-700"
                        >
                            <Play size={20} /> START GAME
                        </button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 backdrop-blur-sm z-10">
                        <h2 className="text-4xl font-bold mb-2 text-white">SEGMENTATION FAULT</h2>
                        <p className="text-red-200 mb-6 font-mono">Process terminated. Bugs won.</p>
                        <div className="flex gap-8 mb-8 text-center">
                            <div>
                                <p className="text-xs text-red-300 uppercase">Score</p>
                                <p className="text-3xl font-mono font-bold">{score}</p>
                            </div>
                            <div>
                                <p className="text-xs text-yellow-300 uppercase">High Score</p>
                                <p className="text-3xl font-mono font-bold text-yellow-400">{highScore}</p>
                            </div>
                        </div>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-red-600 font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                        >
                            <RotateCcw size={20} /> TRY AGAIN
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="absolute top-4 right-4 font-mono text-xl font-bold text-green-500">
                        SCORE: {score}
                    </div>
                )}
            </div>

            <div className="mt-6 text-slate-500 font-mono text-sm max-w-lg text-center">
                <p>Run code. Dodge bugs. Don't crash.</p>
            </div>

            <style>{`
                .glow-text {
                    text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
                }
            `}</style>
        </div>
    );
}
