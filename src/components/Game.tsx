import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LANES, LANE_WIDTH, CAR_WIDTH, CAR_HEIGHT, GAME_SPEED_INITIAL, MAX_SPEED, SPAWN_INTERVAL, BOOSTER_SPAWN_INTERVAL, QUESTION_SPAWN_INTERVAL, QUESTIONS } from '../constants';
import { GameObject, PlayerState, GameState, BoosterType } from '../types';
import { MudikQuestion } from './MudikQuestion';
import { Trophy, Shield, Zap, RotateCcw, Play, Pause, FastForward, Shield as ShieldIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const boosterTimerRef = useRef<number>(0);
  const questionTimerRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // Game State (Refs for loop, State for UI)
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true);

  // Refs for game loop logic
  const playerRef = useRef<PlayerState>({
    lane: 1,
    x: LANE_WIDTH * 1.5 - CAR_WIDTH / 2,
    y: 0, // Set in resize
    isTurbo: false,
    isShielded: false,
    turboTime: 0,
    shieldTime: 0,
  });

  const obstaclesRef = useRef<GameObject[]>([]);
  const boostersRef = useRef<GameObject[]>([]);
  const gameSpeedRef = useRef(GAME_SPEED_INITIAL);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);

  // Resize handler
  const resizeCanvas = useCallback(() => {
    if (canvasRef.current && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      playerRef.current.y = height - CAR_HEIGHT - 40;
      playerRef.current.x = (playerRef.current.lane + 0.5) * (width / LANES) - CAR_WIDTH / 2;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Controls
  const moveLeft = useCallback(() => {
    if (playerRef.current.lane > 0 && !isPaused && !isGameOver && activeQuestion === null) {
      playerRef.current.lane--;
    }
  }, [isPaused, isGameOver, activeQuestion]);

  const moveRight = useCallback(() => {
    if (playerRef.current.lane < LANES - 1 && !isPaused && !isGameOver && activeQuestion === null) {
      playerRef.current.lane++;
    }
  }, [isPaused, isGameOver, activeQuestion]);

  // Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Swipe threshold
    const threshold = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) {
        moveRight();
      } else if (deltaX < -threshold) {
        moveLeft();
      }
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveLeft();
      if (e.key === 'ArrowRight') moveRight();
      if (e.key === 'p') setIsPaused(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight]);

  // Game Loop
  const update = (time: number) => {
    if (isPaused || isGameOver || activeQuestion !== null || showStartScreen) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const laneWidth = canvas.width / LANES;

    // Update Player Position (Smooth lane change)
    const targetX = (playerRef.current.lane + 0.5) * laneWidth - CAR_WIDTH / 2;
    playerRef.current.x += (targetX - playerRef.current.x) * 0.2;

    // Update Timers
    if (playerRef.current.isTurbo) {
      playerRef.current.turboTime -= deltaTime;
      if (playerRef.current.turboTime <= 0) playerRef.current.isTurbo = false;
    }
    if (playerRef.current.isShielded) {
      playerRef.current.shieldTime -= deltaTime;
      if (playerRef.current.shieldTime <= 0) playerRef.current.isShielded = false;
    }

    // Update Speed (Aggressive progression)
    const baseSpeed = Math.min(MAX_SPEED, GAME_SPEED_INITIAL + (distanceRef.current / 400) * 1.2);
    gameSpeedRef.current = baseSpeed;
    if (playerRef.current.isTurbo) gameSpeedRef.current *= 2;

    // Spawn Obstacles (Scaling frequency and quantity)
    spawnTimerRef.current += deltaTime;
    const currentSpawnInterval = SPAWN_INTERVAL / (gameSpeedRef.current / 3);
    if (spawnTimerRef.current > currentSpawnInterval) {
      spawnTimerRef.current = 0;
      
      // Spawn 1 or 2 cars at higher speeds
      const numToSpawn = gameSpeedRef.current > 8 ? (Math.random() > 0.6 ? 2 : 1) : 1;
      const usedLanes = new Set<number>();
      
      for (let i = 0; i < numToSpawn; i++) {
        let lane = Math.floor(Math.random() * LANES);
        // Avoid spawning in the same lane in one batch
        let attempts = 0;
        while (usedLanes.has(lane) && attempts < 5) {
          lane = Math.floor(Math.random() * LANES);
          attempts++;
        }
        usedLanes.add(lane);

        obstaclesRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          x: (lane + 0.5) * laneWidth - CAR_WIDTH / 2,
          y: -CAR_HEIGHT - (i * 120), // Stagger if multiple
          width: CAR_WIDTH,
          height: CAR_HEIGHT,
          lane,
          speed: Math.random() * 4 + 1,
        });
      }
    }

    // Spawn Boosters
    boosterTimerRef.current += deltaTime;
    if (boosterTimerRef.current > BOOSTER_SPAWN_INTERVAL) {
      boosterTimerRef.current = 0;
      const lane = Math.floor(Math.random() * LANES);
      const type: BoosterType = Math.random() > 0.5 ? 'turbo' : 'shield';
      boostersRef.current.push({
        id: Math.random().toString(36).substr(2, 9),
        x: (lane + 0.5) * laneWidth - 20,
        y: -40,
        width: 40,
        height: 40,
        lane,
        speed: 0,
        type,
      });
    }

    // Spawn Questions
    questionTimerRef.current += deltaTime;
    if (questionTimerRef.current > QUESTION_SPAWN_INTERVAL) {
      questionTimerRef.current = 0;
      const qIndex = Math.floor(Math.random() * QUESTIONS.length);
      setActiveQuestion(qIndex);
    }

    // Update Distance & Score
    distanceRef.current += gameSpeedRef.current * 0.1;
    setDistance(Math.floor(distanceRef.current));
    scoreRef.current = Math.floor(distanceRef.current / 10);
    setScore(scoreRef.current);

    // Draw Background
    ctx.fillStyle = '#334155'; // Slate 700
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Lanes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 2;
    for (let i = 1; i < LANES; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Update & Draw Obstacles
    obstaclesRef.current.forEach((obs, index) => {
      obs.y += (gameSpeedRef.current + obs.speed);
      
      // Random lane change for obstacles
      if (Math.random() < 0.008) { // Slightly more frequent lane changes
        const dir = Math.random() > 0.5 ? 1 : -1;
        const newLane = Math.max(0, Math.min(LANES - 1, obs.lane + dir));
        obs.lane = newLane;
      }
      const targetObsX = (obs.lane + 0.5) * laneWidth - CAR_WIDTH / 2;
      obs.x += (targetObsX - obs.x) * 0.1;

      // Draw Obstacle Car
      ctx.fillStyle = '#ef4444'; // Red 500
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 10);
      ctx.fill();
      // Windows
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(obs.x + 5, obs.y + 10, obs.width - 10, 20);
      ctx.fillRect(obs.x + 5, obs.y + 50, obs.width - 10, 20);

      // Collision Detection
      if (
        playerRef.current.x < obs.x + obs.width &&
        playerRef.current.x + CAR_WIDTH > obs.x &&
        playerRef.current.y < obs.y + obs.height &&
        playerRef.current.y + CAR_HEIGHT > obs.y
      ) {
        if (playerRef.current.isShielded) {
          obstaclesRef.current.splice(index, 1);
          playerRef.current.isShielded = false;
        } else if (!playerRef.current.isTurbo) {
          setIsGameOver(true);
        }
      }

      if (obs.y > canvas.height) obstaclesRef.current.splice(index, 1);
    });

    // Update & Draw Boosters
    boostersRef.current.forEach((booster, index) => {
      booster.y += gameSpeedRef.current;
      
      ctx.fillStyle = booster.type === 'turbo' ? '#f59e0b' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(booster.x + 20, booster.y + 20, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw Icon Symbol on Canvas
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      if (booster.type === 'turbo') {
        ctx.fillText('>>', booster.x + 20, booster.y + 26);
      } else {
        // Simple shield shape
        ctx.beginPath();
        ctx.moveTo(booster.x + 20, booster.y + 12);
        ctx.lineTo(booster.x + 28, booster.y + 16);
        ctx.lineTo(booster.x + 28, booster.y + 24);
        ctx.lineTo(booster.x + 20, booster.y + 30);
        ctx.lineTo(booster.x + 12, booster.y + 24);
        ctx.lineTo(booster.x + 12, booster.y + 16);
        ctx.closePath();
        ctx.fill();
      }

      // Collision
      if (
        playerRef.current.x < booster.x + booster.width &&
        playerRef.current.x + CAR_WIDTH > booster.x &&
        playerRef.current.y < booster.y + booster.height &&
        playerRef.current.y + CAR_HEIGHT > booster.y
      ) {
        if (booster.type === 'turbo') {
          playerRef.current.isTurbo = true;
          playerRef.current.turboTime = 5000;
        } else {
          playerRef.current.isShielded = true;
          playerRef.current.shieldTime = 8000;
        }
        boostersRef.current.splice(index, 1);
      }

      if (booster.y > canvas.height) boostersRef.current.splice(index, 1);
    });

    // Draw Player Car
    ctx.save();
    if (playerRef.current.isShielded) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#3b82f6';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.strokeRect(playerRef.current.x - 5, playerRef.current.y - 5, CAR_WIDTH + 10, CAR_HEIGHT + 10);
    }
    if (playerRef.current.isTurbo) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f59e0b';
    }
    ctx.fillStyle = '#10b981'; // Emerald 500
    ctx.beginPath();
    ctx.roundRect(playerRef.current.x, playerRef.current.y, CAR_WIDTH, CAR_HEIGHT, 10);
    ctx.fill();
    // Windows
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(playerRef.current.x + 5, playerRef.current.y + 10, CAR_WIDTH - 10, 20);
    ctx.fillRect(playerRef.current.x + 5, playerRef.current.y + 50, CAR_WIDTH - 10, 20);
    ctx.restore();

    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPaused, isGameOver, activeQuestion, showStartScreen]);

  const resetGame = () => {
    setIsGameOver(false);
    setIsPaused(false);
    setActiveQuestion(null);
    setScore(0);
    setDistance(0);
    scoreRef.current = 0;
    distanceRef.current = 0;
    gameSpeedRef.current = GAME_SPEED_INITIAL;
    obstaclesRef.current = [];
    boostersRef.current = [];
    playerRef.current = {
      lane: 1,
      x: (1 + 0.5) * (canvasRef.current?.width || 0) / LANES - CAR_WIDTH / 2,
      y: (canvasRef.current?.height || 0) - CAR_HEIGHT - 40,
      isTurbo: false,
      isShielded: false,
      turboTime: 0,
      shieldTime: 0,
    };
    setShowStartScreen(false);
    lastTimeRef.current = performance.now();
  };

  const handleAnswer = (correct: boolean) => {
    if (!correct) {
      // Penalty: slow down or lose score
      distanceRef.current = Math.max(0, distanceRef.current - 100);
    }
    setActiveQuestion(null);
    lastTimeRef.current = performance.now();
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-3">
            <Trophy className="text-yellow-400 w-5 h-5" />
            <span className="text-white font-black text-xl tracking-tight">{score}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
            <span className="text-white/60 text-xs font-bold uppercase tracking-wider block">Jarak</span>
            <span className="text-white font-mono text-lg">{distance}m</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="pointer-events-auto p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white hover:bg-white/20 transition-colors"
          >
            {isPaused ? <Play size={24} /> : <Pause size={24} />}
          </button>
          
          <div className="flex gap-2">
            <AnimatePresence>
              {playerRef.current.isShielded && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="p-2 bg-blue-500 rounded-full text-white shadow-lg shadow-blue-500/50"
                >
                  <ShieldIcon size={20} />
                </motion.div>
              )}
              {playerRef.current.isTurbo && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="p-2 bg-amber-500 rounded-full text-white shadow-lg shadow-amber-500/50"
                >
                  <FastForward size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showStartScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-50 p-6"
          >
            <div className="text-center max-w-sm">
              <motion.h1 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-6xl font-black text-white mb-4 tracking-tighter"
              >
                MUDIK<br/><span className="text-emerald-500">SIMULATOR</span>
              </motion.h1>
              <p className="text-slate-400 mb-8 font-medium">
                Hindari macet, kumpulkan booster, dan jawab pertanyaan maut keluarga!
              </p>
              <button 
                onClick={resetGame}
                className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black text-2xl shadow-xl shadow-emerald-500/40 active:scale-95 transition-transform"
              >
                MULAI MUDIK
              </button>
              <div className="mt-8 grid grid-cols-1 gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <div>SWIPE KIRI/KANAN UNTUK PINDAH LAJUR</div>
                <div className="mt-2 text-[10px] opacity-50">TIPS: AMBIL BOOSTER UNTUK TURBO & SHIELD</div>
              </div>
            </div>
          </motion.div>
        )}

        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-red-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-6"
          >
            <div className="text-center max-w-sm">
              <h2 className="text-5xl font-black text-white mb-2 tracking-tight">NABRAK!</h2>
              <p className="text-red-200/60 mb-8 font-medium italic">Yah, nggak jadi lebaran di kampung...</p>
              
              <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/10">
                <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Skor Akhir</div>
                <div className="text-5xl font-black text-white">{score}</div>
              </div>

              <button 
                onClick={resetGame}
                className="w-full py-5 bg-white text-red-600 rounded-3xl font-black text-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
              >
                <RotateCcw size={28} />
                COBA LAGI
              </button>
            </div>
          </motion.div>
        )}

        {activeQuestion !== null && (
          <MudikQuestion 
            questionIndex={activeQuestion} 
            onAnswer={handleAnswer} 
          />
        )}
      </AnimatePresence>

      {/* Instruction Overlay (Temporary) */}
      {!showStartScreen && distance < 100 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-20 left-0 right-0 text-center pointer-events-none"
        >
          <p className="text-white/40 font-bold text-sm tracking-widest uppercase animate-pulse">
            Swipe Kiri / Kanan untuk Navigasi
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Game;


