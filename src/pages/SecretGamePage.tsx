
import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Skull, Swords, Zap, Ghost, Pause, LogOut } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

// Game constants
const CANVAS_SIZE = 600;
const GRID_SIZE = 20;
const TILE_COUNT = CANVAS_SIZE / GRID_SIZE;

interface SecretGamePageProps {
    onExit?: () => void;
}

export default function SecretGamePage({ onExit }: SecretGamePageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('secret_snake_highscore') || '0'));
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');


    const getSpeed = (diff: Difficulty) => {
        switch (diff) {
            case 'easy': return 150;
            case 'medium': return 100;
            case 'hard': return 60;
        }
    };

    // Game State Refs (mutable for loop)
    const snakeRef = useRef<{ x: number; y: number }[]>([]);
    const foodRef = useRef<{ x: number; y: number }>({ x: 15, y: 15 });
    const dirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const nextDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const scoreRef = useRef(0);

    const initGame = () => {
        snakeRef.current = [{ x: 10, y: 10 }];
        foodRef.current = { x: 15, y: 15 };
        dirRef.current = { x: 1, y: 0 };
        nextDirRef.current = { x: 1, y: 0 };
        scoreRef.current = 0;
        setScore(0);
        setGameState('playing');
    };

    useEffect(() => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let lastTime = 0;
        let animationFrameId: number;
        const currentSpeed = getSpeed(difficulty);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                if (gameState === 'playing') {
                    setGameState('paused');
                } else if (onExit) {
                    onExit();
                }
                return;
            }
            switch (e.code) {
                case 'ArrowUp':
                    if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                    if (dirRef.current.y === 0) nextDirRef.current = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                    if (dirRef.current.x === 0) nextDirRef.current = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                    if (dirRef.current.x === 0) nextDirRef.current = { x: 1, y: 0 };
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        const loop = (timestamp: number) => {
            animationFrameId = requestAnimationFrame(loop);

            if (timestamp - lastTime < currentSpeed) return;
            lastTime = timestamp;

            // Update Logic
            dirRef.current = nextDirRef.current;
            const head = { ...snakeRef.current[0] };
            head.x += dirRef.current.x;
            head.y += dirRef.current.y;

            // Wall Collision
            if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
                gameOver();
                return;
            }

            // Self Collision
            if (snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
                gameOver();
                return;
            }

            snakeRef.current.unshift(head);

            // Eat Food
            if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
                scoreRef.current += 10;
                setScore(scoreRef.current);
                spawnFood();
            } else {
                snakeRef.current.pop();
            }

            // Draw
            ctx.fillStyle = '#0f172a'; // Slate-900 (Background)
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid (Subtle)
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            for (let i = 0; i <= TILE_COUNT; i++) {
                ctx.beginPath();
                ctx.moveTo(i * GRID_SIZE, 0);
                ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i * GRID_SIZE);
                ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
                ctx.stroke();
            }

            // Draw Snake
            ctx.shadowBlur = 15;
            snakeRef.current.forEach((segment, i) => {
                if (i === 0) {
                    ctx.fillStyle = '#f472b6'; // Head
                    ctx.shadowColor = '#f472b6';
                } else {
                    ctx.fillStyle = '#db2777'; // Body
                    ctx.shadowColor = '#db2777';
                }

                ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            });
            ctx.shadowBlur = 0;

            // Draw Food
            ctx.fillStyle = '#22c55e'; // Green-500
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(
                foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
                foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
                GRID_SIZE / 3, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.shadowBlur = 0;
        };

        const spawnFood = () => {
            let newFood: { x: number; y: number };
            while (true) {
                newFood = {
                    x: Math.floor(Math.random() * TILE_COUNT),
                    y: Math.floor(Math.random() * TILE_COUNT)
                };
                // Check if on snake
                if (!snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y)) {
                    break;
                }
            }
            foodRef.current = newFood;
        };

        const gameOver = () => {
            setGameState('gameover');
            if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current);
                localStorage.setItem('secret_snake_highscore', scoreRef.current.toString());
            }
            cancelAnimationFrame(animationFrameId);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState, difficulty, highScore, onExit]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-mono">
            {/* Fullscreen Retro Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(236, 72, 153, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(236, 72, 153, 0.2) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>

            <div className="z-10 w-full max-w-4xl flex flex-col items-center gap-6">

                {/* Header */}
                <div className="flex items-center gap-6">
                    <Skull size={48} className="text-pink-500 animate-pulse" />
                    <div className="text-center">
                        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-tighter filter drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                            SECRET_SNAKE.EXE
                        </h1>
                        <p className="text-slate-500 tracking-[0.5em] text-sm mt-2">CLASSIFIED CLEARANCE</p>
                    </div>
                    <Skull size={48} className="text-pink-500 animate-pulse" />
                </div>

            </div>

            {/* Game Container */}
            <div className="relative p-1 rounded-2xl bg-gradient-to-br from-pink-500/50 to-purple-600/50 shadow-[0_0_100px_rgba(236,72,153,0.2)]">
                <div className="bg-slate-900 rounded-xl p-1">
                    <canvas
                        ref={canvasRef}
                        width={600}
                        height={600}
                        className="bg-slate-950 block rounded-lg shadow-inner cursor-none"
                    />
                </div>

                {/* Start Screen Overlay */}
                {gameState === 'start' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-10 rounded-xl">
                        <h2 className="text-4xl font-bold mb-8 text-white drop-shadow-lg">SELECT DIFFICULTY</h2>

                        <div className="flex gap-4 mb-10">
                            <button
                                onClick={() => setDifficulty('easy')}
                                className={`px-6 py-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 w-32 ${difficulty === 'easy' ? 'border-green-500 bg-green-500/20 text-green-400 scale-110 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                            >
                                <Ghost size={24} />
                                <span className="font-bold">NOOB</span>
                            </button>
                            <button
                                onClick={() => setDifficulty('medium')}
                                className={`px-6 py-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 w-32 ${difficulty === 'medium' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 scale-110 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                            >
                                <Swords size={24} />
                                <span className="font-bold">DEV</span>
                            </button>
                            <button
                                onClick={() => setDifficulty('hard')}
                                className={`px-6 py-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 w-32 ${difficulty === 'hard' ? 'border-red-500 bg-red-500/20 text-red-500 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                            >
                                <Zap size={24} />
                                <span className="font-bold">10X</span>
                            </button>
                        </div>

                        <button
                            onClick={initGame}
                            className="group relative px-10 py-4 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xl rounded-full shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(236,72,153,0.6)]"
                        >
                            <span className="flex items-center gap-3">
                                <Play size={24} className="fill-current" /> EXECUTE MISSION
                            </span>
                        </button>
                    </div>
                )}

                {/* Pause Overlay */}
                {gameState === 'paused' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10 rounded-xl">
                        <h2 className="text-5xl font-bold mb-8 text-white tracking-widest animate-pulse flex items-center gap-4">
                            <Pause size={48} /> PAUSED
                        </h2>

                        <div className="flex flex-col gap-4 w-48">
                            <button
                                onClick={() => setGameState('playing')}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-all hover:scale-105 shadow-[0_0_20px_rgba(236,72,153,0.4)]"
                            >
                                <Play size={20} className="fill-current" /> RESUME
                            </button>
                            <button
                                onClick={onExit}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 transition-all hover:text-white"
                            >
                                <LogOut size={20} /> QUIT
                            </button>
                        </div>
                    </div>
                )}

                {/* Game Over Overlay */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-10 rounded-xl">
                        <h2 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-600 drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]">
                            WASTED
                        </h2>
                        <p className="text-red-400/80 mb-8 font-mono tracking-widest">SEGMENTATION FAULT (CORE DUMPED)</p>

                        <div className="grid grid-cols-2 gap-8 mb-10 w-full max-w-sm">
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-center">
                                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                <p className="text-4xl font-bold text-pink-500">{score}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-center">
                                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">High Score</p>
                                <p className="text-4xl font-bold text-yellow-400">{highScore}</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setGameState('start')}
                                className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 transition-all"
                            >
                                MENU
                            </button>
                            <button
                                onClick={initGame}
                                className="flex items-center gap-2 px-8 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                <RotateCcw size={20} /> RETRY
                            </button>
                        </div>
                    </div>
                )}

                {/* HUD */}
                {gameState === 'playing' && (
                    <div className="absolute top-6 right-6 flex flex-col items-end gap-1 pointer-events-none">
                        <div className="text-xs text-slate-400 uppercase tracking-widest">Score</div>
                        <div className="text-3xl font-bold text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                            {score}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
