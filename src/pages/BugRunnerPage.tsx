
import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy, ArrowUp } from 'lucide-react';

// Game constants - fixed values (not scaled)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const BASE_SPEED = 6;
const OBSTACLE_INTERVAL = 1500;

export default function BugRunnerPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
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

        // Player state - fixed positions (canvas is always 800x400)
        const player = {
            x: 80,
            y: CANVAS_HEIGHT - 60,
            width: 40,
            height: 40,
            dy: 0,
            isJumping: false
        };

        const groundY = CANVAS_HEIGHT - 20;

        // Obstacles
        let obstacles: { x: number; y: number; width: number; height: number; passed: boolean }[] = [];

        const handleJump = () => {
            if (!player.isJumping) {
                player.dy = JUMP_FORCE;
                player.isJumping = true;
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleJump();
            }
        };

        // Touch/click handler for mobile
        const handleTouch = (e: TouchEvent | MouseEvent) => {
            e.preventDefault();
            handleJump();
        };

        window.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('touchstart', handleTouch as EventListener, { passive: false });
        canvas.addEventListener('click', handleTouch as EventListener);

        const loop = (timestamp: number) => {
            // Update physics every frame
            player.dy += GRAVITY;
            player.y += player.dy;

            // Ground collision - player sits on ground
            if (player.y + player.height > groundY) {
                player.y = groundY - player.height;
                player.dy = 0;
                player.isJumping = false;
            }

            // Speed increases with score
            const currentScore = scoreRef.current;
            const currentSpeed = BASE_SPEED + currentScore * 0.01;

            // Spawn obstacles
            if (timestamp - lastObstacleTime > OBSTACLE_INTERVAL / (1 + currentScore * 0.001)) {
                const height = Math.random() * 50 + 30;
                obstacles.push({
                    x: CANVAS_WIDTH,
                    y: groundY - height,
                    width: 25,
                    height: height,
                    passed: false
                });
                lastObstacleTime = timestamp;
            }

            // Move obstacles
            obstacles.forEach(obs => {
                obs.x -= currentSpeed;
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
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw Ground
            ctx.fillStyle = '#334155';
            ctx.fillRect(0, groundY, CANVAS_WIDTH, CANVAS_HEIGHT - groundY);

            // Draw ground line
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(CANVAS_WIDTH, groundY);
            ctx.stroke();

            // Draw Player (Green Code Block)
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 15;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.shadowBlur = 0;

            // Draw Face on Player
            ctx.fillStyle = '#fff';
            ctx.fillRect(player.x + 28, player.y + 8, 6, 6); // Eye
            ctx.fillRect(player.x + 24, player.y + 22, 10, 3); // Mouth

            // Draw Obstacles (Red Bugs)
            obstacles.forEach(obs => {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 10;
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.shadowBlur = 0;

                // "Bug" legs
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + obs.height);
                ctx.lineTo(obs.x - 5, obs.y + obs.height + 8);
                ctx.moveTo(obs.x + obs.width, obs.y + obs.height);
                ctx.lineTo(obs.x + obs.width + 5, obs.y + obs.height + 8);
                ctx.stroke();
            });

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('touchstart', handleTouch as EventListener);
            canvas.removeEventListener('click', handleTouch as EventListener);
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState, highScore]);

    const startGame = () => {
        setScore(0);
        setGameState('playing');
    };

    return (
        <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4 md:p-8 relative overflow-hidden">
            {/* Matrix Digital Rain Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
            }}></div>

            <h1 className="text-2xl md:text-4xl font-mono font-bold mb-4 md:mb-8 text-green-500 flex items-center gap-3" style={{ textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>
                <span className="animate-pulse">&gt;</span> BUG RUNNER_
            </h1>

            <div className="relative bg-slate-800 p-2 rounded-lg border-2 border-slate-700 shadow-2xl w-full max-w-[832px]">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="bg-slate-900 rounded border border-slate-700 block w-full"
                    style={{ cursor: gameState === 'playing' ? 'pointer' : 'default' }}
                />

                {gameState === 'start' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                        <Trophy size={48} className="text-yellow-400 mb-4" />
                        <h2 className="text-xl md:text-2xl font-bold mb-2">Ready to squish bugs?</h2>
                        <p className="text-slate-400 mb-6 font-mono text-sm md:text-base text-center px-4">
                            Press SPACE or TAP to Jump
                        </p>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 md:px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-green-800 hover:border-green-700"
                        >
                            <Play size={20} /> START GAME
                        </button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 backdrop-blur-sm z-10">
                        <h2 className="text-2xl md:text-4xl font-bold mb-2 text-white">SEGMENTATION FAULT</h2>
                        <p className="text-red-200 mb-6 font-mono text-sm md:text-base">Process terminated. Bugs won.</p>
                        <div className="flex gap-4 md:gap-8 mb-8 text-center">
                            <div>
                                <p className="text-xs text-red-300 uppercase">Score</p>
                                <p className="text-2xl md:text-3xl font-mono font-bold">{score}</p>
                            </div>
                            <div>
                                <p className="text-xs text-yellow-300 uppercase">High Score</p>
                                <p className="text-2xl md:text-3xl font-mono font-bold text-yellow-400">{highScore}</p>
                            </div>
                        </div>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 md:px-8 py-3 bg-white text-red-600 font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                        >
                            <RotateCcw size={20} /> TRY AGAIN
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="absolute top-4 right-4 font-mono text-lg md:text-xl font-bold text-green-500">
                        SCORE: {score}
                    </div>
                )}
            </div>

            {/* Mobile Jump Button */}
            {gameState === 'playing' && (
                <button
                    onTouchStart={(e) => {
                        e.preventDefault();
                        const canvas = canvasRef.current;
                        if (canvas) canvas.dispatchEvent(new Event('click'));
                    }}
                    className="md:hidden mt-6 flex items-center justify-center gap-2 px-12 py-6 bg-green-600 active:bg-green-500 text-white font-bold text-xl rounded-2xl transition-all active:scale-95 shadow-lg select-none"
                >
                    <ArrowUp size={28} /> JUMP
                </button>
            )}

            <div className="mt-4 md:mt-6 text-slate-500 font-mono text-xs md:text-sm max-w-lg text-center px-4">
                <p>Run code. Dodge bugs. Don't crash.</p>
                <p className="mt-1 text-slate-600 md:hidden">Tap canvas or button to jump!</p>
            </div>
        </div>
    );
}
