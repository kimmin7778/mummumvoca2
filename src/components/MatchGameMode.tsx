import { useState, useEffect, useRef } from 'react';
import type { Word } from '../types/voca';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, RotateCcw, Trophy, Sparkles, Clock, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../utils/audio';
import { getBestMatchTime, saveBestMatchTime } from '../utils/storage';

interface MatchTile {
  uid: string;
  wordId: string;
  text: string;
  type: 'en' | 'ko';
  matched: boolean;
  shaking: boolean;
}

interface MatchGameModeProps {
  words: Word[];
  setId: string;
}

export function MatchGameMode({ words, setId }: MatchGameModeProps) {
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [penaltyCount, setPenaltyCount] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [pairsCount, setPairsCount] = useState<number>(8); // default 8 pairs (16 tiles)

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize game
  const initializeGame = (numPairs = pairsCount) => {
    if (words.length < 2) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const actualPairsCount = Math.min(numPairs, words.length);
    const shuffledPool = [...words].sort(() => 0.5 - Math.random()).slice(0, actualPairsCount);

    const generatedTiles: MatchTile[] = [];
    shuffledPool.forEach(w => {
      generatedTiles.push({
        uid: `${w.id}_en`,
        wordId: w.id,
        text: w.word,
        type: 'en',
        matched: false,
        shaking: false,
      });
      generatedTiles.push({
        uid: `${w.id}_ko`,
        wordId: w.id,
        text: w.meaning,
        type: 'ko',
        matched: false,
        shaking: false,
      });
    });

    // Shuffle tiles
    setTiles(generatedTiles.sort(() => 0.5 - Math.random()));
    setSelectedUid(null);
    setElapsedTime(0);
    setPenaltyCount(0);
    setIsGameOver(false);
    setIsNewRecord(false);

    // Load best score for this set and pair count
    const best = getBestMatchTime(setId, actualPairsCount);
    setBestScore(best);

    // Start timer
    startTimeRef.current = performance.now();
    timerRef.current = window.setInterval(() => {
      const now = performance.now();
      setElapsedTime((now - startTimeRef.current) / 1000);
    }, 100);
  };

  useEffect(() => {
    initializeGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [words, setId, pairsCount]);

  const handleTileClick = (clickedUid: string) => {
    if (isGameOver) return;

    const clickedTile = tiles.find(t => t.uid === clickedUid);
    if (!clickedTile || clickedTile.matched) return;

    // First tile selection
    if (!selectedUid) {
      setSelectedUid(clickedUid);
      playSound('click');
      return;
    }

    // Deselect if clicking the same tile
    if (selectedUid === clickedUid) {
      setSelectedUid(null);
      return;
    }

    const firstTile = tiles.find(t => t.uid === selectedUid);
    if (!firstTile) return;

    // Check match
    if (firstTile.wordId === clickedTile.wordId && firstTile.type !== clickedTile.type) {
      // Correct Match!
      playSound('correct');
      const updated = tiles.map(t =>
        t.uid === firstTile.uid || t.uid === clickedTile.uid ? { ...t, matched: true } : t
      );
      setTiles(updated);
      setSelectedUid(null);

      // Check win condition
      if (updated.every(t => t.matched)) {
        if (timerRef.current) clearInterval(timerRef.current);
        const totalTime = elapsedTime + penaltyCount * 1.0;
        const recordResult = saveBestMatchTime(setId, Math.min(pairsCount, words.length), totalTime);

        setIsNewRecord(recordResult);
        setIsGameOver(true);
        playSound('pass');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } else {
      // Wrong Match - Penalty!
      playSound('wrong');
      setPenaltyCount(prev => prev + 1);

      // Trigger shake animation
      setTiles(prev =>
        prev.map(t => (t.uid === firstTile.uid || t.uid === clickedTile.uid ? { ...t, shaking: true } : t))
      );

      setTimeout(() => {
        setTiles(prev =>
          prev.map(t => (t.uid === firstTile.uid || t.uid === clickedTile.uid ? { ...t, shaking: false } : t))
        );
        setSelectedUid(null);
      }, 400);
    }
  };

  if (words.length < 2) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-amber-900 mb-2">단어가 부족합니다</h3>
        <p className="text-amber-700">매칭 게임을 시작하려면 단어가 최소 2개 이상 필요합니다.</p>
      </div>
    );
  }

  const finalTime = (elapsedTime + penaltyCount * 1.0).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">단어 매칭 게임</h2>
            <p className="text-xs text-slate-500">영단어와 한글 뜻 짝을 신속하게 연결하세요!</p>
          </div>
        </div>

        {/* Stopwatch & Penalty display */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl font-mono text-lg font-extrabold text-slate-800">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>{finalTime}s</span>
            {penaltyCount > 0 && (
              <span className="text-xs font-sans text-rose-500 font-semibold">(+{penaltyCount}s)</span>
            )}
          </div>

          {bestScore !== null && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>최고 기록: {bestScore}s</span>
            </div>
          )}

          <button
            onClick={() => initializeGame()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="다시 시작"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode options */}
      <div className="flex items-center justify-between gap-2 mb-4 px-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          단어 수: {Math.min(pairsCount, words.length)}쌍 ({Math.min(pairsCount, words.length) * 2}개 타일)
        </div>
        <div className="flex gap-2">
          {[4, 8, 12].map(num => (
            <button
              key={num}
              onClick={() => {
                setPairsCount(num);
                initializeGame(num);
              }}
              disabled={words.length < num}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                pairsCount === num
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40'
              }`}
            >
              {num}쌍
            </button>
          ))}
        </div>
      </div>

      {/* Tile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <AnimatePresence>
          {tiles.map(tile => {
            const isSelected = selectedUid === tile.uid;
            if (tile.matched) {
              return (
                <div
                  key={tile.uid}
                  className="h-24 rounded-2xl border-2 border-dashed border-slate-200/60 bg-slate-50/40 opacity-30 pointer-events-none"
                />
              );
            }

            return (
              <motion.button
                key={tile.uid}
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x: tile.shaking ? [-6, 6, -4, 4, 0] : 0,
                }}
                transition={{ duration: tile.shaking ? 0.3 : 0.2 }}
                onClick={() => handleTileClick(tile.uid)}
                className={`h-24 p-3 rounded-2xl font-bold text-base transition-all flex flex-col items-center justify-center text-center shadow-sm select-none break-words ${
                  tile.shaking
                    ? 'bg-rose-500 text-white border-2 border-rose-600 shadow-rose-200'
                    : isSelected
                    ? 'bg-amber-500 text-white border-2 border-amber-600 ring-4 ring-amber-500/20 shadow-md scale-105'
                    : tile.type === 'en'
                    ? 'bg-white hover:bg-amber-50 text-slate-800 border-2 border-slate-200 hover:border-amber-300 font-serif'
                    : 'bg-slate-800 hover:bg-slate-900 text-slate-100 border-2 border-slate-700 font-sans'
                }`}
              >
                <span className="line-clamp-2">{tile.text}</span>
                <span
                  className={`text-[10px] mt-1 uppercase font-semibold px-2 py-0.5 rounded-full ${
                    isSelected || tile.shaking
                      ? 'bg-white/20 text-white'
                      : tile.type === 'en'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {tile.type === 'en' ? 'ENGLISH' : 'KOREAN'}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Trophy className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 mb-1">짝 맞추기 완성!</h3>
            <p className="text-sm text-slate-500 mb-6">모든 단어 카드를 성공적으로 연결했습니다.</p>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">최종 소요 시간</div>
              <div className="text-4xl font-black text-amber-500 font-mono mb-2">{finalTime}초</div>

              {isNewRecord && (
                <div className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-bounce">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🎉 새 최고 기록 달성!</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => initializeGame()}
                className="flex-1 py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>한 번 더 도전</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
