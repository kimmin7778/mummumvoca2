import { useState, useEffect, useRef } from 'react';
import type { RaceState, RaceAnswerPayload } from '../types/voca';
import * as mqttModule from 'mqtt';
import type { MqttClient } from 'mqtt';
import { playSound } from '../utils/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, ShieldAlert, Flame, Wifi, WifiOff, ArrowLeft } from 'lucide-react';

const getMqttConnect = () => {
  const mod = (mqttModule as any).default || mqttModule;
  return mod.connect || mod['connect'];
};

const connectMqtt = (url: string, opts?: any): MqttClient => {
  const fn = getMqttConnect();
  if (typeof fn === 'function') return fn(url, opts);
  throw new Error('MQTT connect function not found');
};

interface RaceTabletModeProps {
  initialRoom?: string;
  onExit: () => void;
}

const TEAMS_COUNT = 7;
const TEAM_COLORS = ['#FF7A59', '#4DA3FF', '#3DDC97', '#FFD23F', '#B98CFF', '#2FD4D4', '#FF8FD1'];
const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];

export function RaceTabletMode({ initialRoom = '', onExit }: RaceTabletModeProps) {
  const [roomInput, setRoomInput] = useState<string>(initialRoom);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Tablet Game States
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [options, setOptions] = useState<[string, string][]>([]);
  const [combo, setCombo] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [lockoutAnswerHint, setLockoutAnswerHint] = useState<string>('');

  const clientRef = useRef<MqttClient | null>(null);
  const cidRef = useRef<string>(`tab_${Math.random().toString(36).substring(2, 8)}`);
  const seqRef = useRef<number>(0);
  const lockoutIntervalRef = useRef<number | null>(null);

  // Generate question options when word index or state changes
  const generateQuestion = (state: RaceState, wordIdx: number) => {
    const wordList = state.words || [];
    if (wordList.length === 0) return;
    const currentPair = wordList[wordIdx % wordList.length];
    if (!currentPair) return;

    // Distractors
    const otherPairs = wordList.filter((_, idx) => idx !== wordIdx % wordList.length);
    const shuffledOthers = [...otherPairs].sort(() => 0.5 - Math.random()).slice(0, 3);
    const pool = [currentPair, ...shuffledOthers].sort(() => 0.5 - Math.random());

    setOptions(pool);
  };

  // Connect to MQTT when joined
  const handleJoin = () => {
    if (!/^\d{4}$/.test(roomInput) || selectedTeam === null) {
      alert('4자리 방 번호와 모둠을 선택해주세요.');
      return;
    }

    setIsJoined(true);
    const topicBase = `wordlab-race/v1/${roomInput}`;
    const clientId = cidRef.current;

    try {
      const client = connectMqtt(BROKERS[0], {
        clientId,
        reconnectPeriod: 3000,
        connectTimeout: 8000,
        keepalive: 30,
        clean: true,
      });

      client.on('connect', () => {
        setIsConnected(true);
        client.subscribe(`${topicBase}/state`, { qos: 0 });
        // Send hello
        client.publish(
          `${topicBase}/hello`,
          JSON.stringify({ cid: clientId, team: selectedTeam }),
          { qos: 0 }
        );
      });

      client.on('offline', () => setIsConnected(false));
      client.on('error', () => setIsConnected(false));

      client.on('message', (topic, payload) => {
        if (topic.endsWith('/state')) {
          try {
            const state: RaceState = JSON.parse(payload.toString());
            setRaceState(state);
          } catch (e) {
            // ignore
          }
        }
      });

      clientRef.current = client;
    } catch (e) {
      console.error('Tablet connect error:', e);
    }
  };

  // Update question on state update or next question
  useEffect(() => {
    if (raceState && raceState.words) {
      generateQuestion(raceState, currentWordIndex);
    }
  }, [raceState, currentWordIndex]);

  // Clean up
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
      if (lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
      }
    };
  }, []);

  const handleSelectAnswer = (selectedMeaning: string) => {
    if (!raceState || !raceState.words || lockoutRemaining > 0) return;
    if (raceState.phase !== 'play') return;

    const currentPair = raceState.words[currentWordIndex % raceState.words.length];
    if (!currentPair) return;

    const [targetWord, targetMeaning] = currentPair;

    if (selectedMeaning === targetMeaning) {
      // Correct Answer!
      playSound('correct');
      setCombo(prev => prev + 1);
      seqRef.current += 1;

      // Publish answer payload to host
      if (clientRef.current && clientRef.current.connected) {
        const payload: RaceAnswerPayload = {
          team: selectedTeam!,
          cid: cidRef.current,
          seq: seqRef.current,
        };
        clientRef.current.publish(
          `wordlab-race/v1/${roomInput}/ans`,
          JSON.stringify(payload),
          { qos: 0 }
        );
      }

      // Next Question
      setCurrentWordIndex(prev => prev + 1);
    } else {
      // Wrong Answer - 3 Second Lockout Penalty!
      playSound('wrong');
      setCombo(0);
      setLockoutAnswerHint(`${targetWord} = ${targetMeaning}`);
      setLockoutRemaining(3);

      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);

      lockoutIntervalRef.current = window.setInterval(() => {
        setLockoutRemaining(prev => {
          if (prev <= 1) {
            if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
            setCurrentWordIndex(old => old + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Render Join Form
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">학생 태블릿</div>
              <h2 className="text-2xl font-black">모둠 레이스 참가</h2>
            </div>
          </div>

          {/* Room PIN Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              방 번호 (4자리 PIN)
            </label>
            <input
              type="text"
              maxLength={4}
              value={roomInput}
              onChange={e => setRoomInput(e.target.value.replace(/\D/g, ''))}
              placeholder="예: 1234"
              className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 font-mono font-black text-3xl text-center tracking-widest text-amber-400 focus:outline-none"
            />
          </div>

          {/* Team Select Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              우리 모둠 선택
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: TEAMS_COUNT }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTeam(i)}
                  className={`py-3 px-2 rounded-2xl border-2 font-black text-sm flex flex-col items-center gap-1 transition ${
                    selectedTeam === i
                      ? 'bg-slate-800 border-amber-500 text-amber-400 shadow-lg'
                      : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: TEAM_COLORS[i] }} />
                  <span>{i + 1}모둠</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!/^\d{4}$/.test(roomInput) || selectedTeam === null}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition"
          >
            참가하기
          </button>
        </div>
      </div>
    );
  }

  const teamScore = raceState?.scores?.[selectedTeam!] ?? 0;
  const teamGoal = raceState?.goal ?? 20;
  const currentPair = raceState?.words?.[currentWordIndex % (raceState.words?.length || 1)];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col font-sans max-w-2xl mx-auto">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: TEAM_COLORS[selectedTeam!] }} />
          <div>
            <div className="font-extrabold text-base text-white">
              {raceState?.names?.[selectedTeam!] || `${selectedTeam! + 1}모둠`}
            </div>
            <div className="text-xs font-semibold text-slate-400">
              방 번호: <span className="font-mono text-amber-400">{roomInput}</span>
            </div>
          </div>
        </div>

        {/* Score & Progress */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono font-black text-xl text-amber-400">
              {teamScore} <span className="text-xs text-slate-500 font-sans">/ {teamGoal}점</span>
            </div>
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (teamScore / teamGoal) * 100)}%` }}
              />
            </div>
          </div>

          <div
            className={`p-2 rounded-xl text-xs ${
              isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 flex flex-col justify-center gap-4 relative">
        {/* Waiting phase */}
        {(!raceState || raceState.phase === 'lobby') && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4">
            <Rocket className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
            <h3 className="text-2xl font-black">선생님이 레이스를 시작하길 기다리고 있습니다...</h3>
            <p className="text-sm text-slate-400">화면을 끄지 말고 기다려 주세요!</p>
          </div>
        )}

        {/* Paused Phase */}
        {raceState?.phase === 'pause' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4">
            <div className="text-4xl">⏸️</div>
            <h3 className="text-2xl font-black">레이스 일시 정지</h3>
            <p className="text-sm text-slate-400">선생님이 다시 시작할 때까지 잠시 대기하세요.</p>
          </div>
        )}

        {/* End Phase */}
        {raceState?.phase === 'end' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4">
            <div className="text-5xl">🏆</div>
            <h3 className="text-2xl font-black">레이스가 종료되었습니다!</h3>
            <p className="text-base text-amber-400 font-bold">우리 모둠 최종 점수: {teamScore}점</p>
          </div>
        )}

        {/* Play Phase - Quiz Card */}
        {raceState?.phase === 'play' && currentPair && (
          <div className="flex flex-col gap-4">
            {/* Combo Streak Indicator */}
            {combo >= 3 && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center gap-1.5 text-amber-400 font-extrabold text-sm bg-amber-500/10 py-1.5 px-4 rounded-full border border-amber-500/20 w-max mx-auto"
              >
                <Flame className="w-4 h-4 fill-amber-400" />
                <span>{combo}연속 정답! 🔥</span>
              </motion.div>
            )}

            {/* Question Box */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                알맞은 뜻을 고르세요
              </span>
              <div className="text-4xl sm:text-5xl font-black font-serif text-white tracking-wide break-words">
                {currentPair[0]}
              </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {options.map(([, m], idx) => (
                <button
                  key={idx}
                  disabled={lockoutRemaining > 0}
                  onClick={() => handleSelectAnswer(m)}
                  className="p-5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-amber-500/50 rounded-2xl text-left font-bold text-lg text-slate-100 transition active:scale-95 disabled:opacity-50"
                >
                  {m}
                </button>
              ))}

              {/* 3-Second Lockout Overlay */}
              <AnimatePresence>
                {lockoutRemaining > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/90 backdrop-blur border-2 border-rose-500/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center z-20"
                  >
                    <ShieldAlert className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
                    <div className="text-3xl font-black font-mono text-rose-500 mb-1">{lockoutRemaining}초</div>
                    <div className="text-sm font-bold text-slate-300">오답! 잠시 대기 후 다음 문제로 넘어갑니다.</div>
                    <div className="text-xs text-amber-400 font-mono mt-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                      힌트: {lockoutAnswerHint}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
