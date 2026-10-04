import { useState, useEffect, useRef } from 'react';
import type { WordSet, RaceState, RaceAnswerPayload } from '../types/voca';
import * as mqttModule from 'mqtt';
import type { MqttClient } from 'mqtt';
import { generateQRCodeDataUrl, getRaceJoinUrl } from '../utils/shareUtils';
import { motion } from 'framer-motion';

const getMqttConnect = () => {
  const mod = (mqttModule as any).default || mqttModule;
  return mod.connect || mod['connect'];
};

const connectMqtt = (url: string, opts?: any): MqttClient => {
  const fn = getMqttConnect();
  if (typeof fn === 'function') return fn(url, opts);
  throw new Error('MQTT connect function not found');
};
import {
  Rocket,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Wifi,
  WifiOff,
  Clock,
  Settings,
  Users,
  QrCode,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import * as confettiModule from 'canvas-confetti';

const fireConfetti = (options: any) => {
  const fn = (confettiModule as any).default || confettiModule;
  if (typeof fn === 'function') fn(options);
};

interface RaceHostModeProps {
  set: WordSet;
  onBackToLibrary: () => void;
}

const TEAMS_COUNT = 7;
const TEAM_COLORS = [
  '#FF7A59', // Team 1: Orange-Red
  '#4DA3FF', // Team 2: Sky Blue
  '#3DDC97', // Team 3: Mint Green
  '#FFD23F', // Team 4: Gold Yellow
  '#B98CFF', // Team 5: Purple
  '#2FD4D4', // Team 6: Cyan
  '#FF8FD1', // Team 7: Pink
];
const DEFAULT_TEAM_NAMES = Array.from({ length: TEAMS_COUNT }, (_, i) => `${i + 1}모둠`);

const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];

export function RaceHostMode({ set, onBackToLibrary }: RaceHostModeProps) {
  const [roomCode] = useState<string>(() => String(1000 + Math.floor(Math.random() * 9000)));
  const [phase, setPhase] = useState<'lobby' | 'play' | 'pause' | 'end'>('lobby');
  const [goal, setGoal] = useState<number>(20);
  const [timeLimit, setTimeLimit] = useState<number>(0); // 0 = unlimited, in minutes
  const [questionType, setQuestionType] = useState<'en2ko' | 'ko2en' | 'mix'>('mix');
  const [teamNames, setTeamNames] = useState<string[]>(DEFAULT_TEAM_NAMES);
  const [scores, setScores] = useState<number[]>(Array(TEAMS_COUNT).fill(0));
  const [connectedClients, setConnectedClients] = useState<Record<string, { team: number; lastSeen: number }>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const clientRef = useRef<MqttClient | null>(null);
  const seenAnswersRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const remainingMsRef = useRef<number>(0);
  const endsAtRef = useRef<number>(0);
  const [timeText, setTimeText] = useState<string>('');

  // Generate QR Code URL
  useEffect(() => {
    const url = getRaceJoinUrl(roomCode);
    generateQRCodeDataUrl(url).then(setQrCodeDataUrl);
  }, [roomCode]);

  // Connect to MQTT broker
  useEffect(() => {
    const topicBase = `wordlab-race/v1/${roomCode}`;
    const clientId = `host_${Math.random().toString(36).substring(2, 8)}`;

    let mqttClient: MqttClient | null = null;
    try {
      mqttClient = connectMqtt(BROKERS[0], {
        clientId,
        reconnectPeriod: 3000,
        connectTimeout: 8000,
        keepalive: 30,
        clean: true,
      });

      mqttClient.on('connect', () => {
        setIsConnected(true);
        mqttClient?.subscribe(`${topicBase}/#`, { qos: 0 });
        publishState(mqttClient, 'lobby');
      });

      mqttClient.on('offline', () => setIsConnected(false));
      mqttClient.on('error', () => setIsConnected(false));

      mqttClient.on('message', (topic, payload) => {
        const subTopic = topic.slice(topicBase.length + 1);
        try {
          const data = JSON.parse(payload.toString());
          if (subTopic === 'hello' && data.cid && data.team !== undefined) {
            setConnectedClients(prev => ({
              ...prev,
              [data.cid]: { team: data.team, lastSeen: Date.now() },
            }));
          } else if (subTopic === 'ans' && data.cid && data.seq !== undefined && data.team !== undefined) {
            handleAnswerReceived(data as RaceAnswerPayload);
          }
        } catch (e) {
          // Parse error ignore
        }
      });

      clientRef.current = mqttClient;
    } catch (e) {
      console.error('MQTT connect error:', e);
    }

    return () => {
      if (mqttClient) {
        mqttClient.end(true);
      }
    };
  }, [roomCode]);

  // State broadcaster helper
  const publishState = (
    client: MqttClient | null = clientRef.current,
    currentPhase = phase,
    currentScores = scores,
    currentGoal = goal
  ) => {
    if (!client || !client.connected) return;

    const state: RaceState = {
      setId: set.id,
      room: roomCode,
      phase: currentPhase,
      goal: currentGoal,
      time: timeLimit,
      type: questionType,
      scores: currentScores,
      names: teamNames,
      endsAt: endsAtRef.current,
      remain: remainingMsRef.current,
      ts: Date.now(),
      title: set.title,
      words: set.words.map(w => [w.word, w.meaning]),
    };

    client.publish(`wordlab-race/v1/${roomCode}/state`, JSON.stringify(state), {
      qos: 0,
      retain: true,
    });
  };

  // Handle student answer message
  const handleAnswerReceived = (data: RaceAnswerPayload) => {
    const key = `${data.cid}:${data.seq}`;
    if (seenAnswersRef.current.has(key)) return;
    seenAnswersRef.current.add(key);

    if (data.team < 0 || data.team >= TEAMS_COUNT) return;

    setScores(prevScores => {
      if (phase !== 'play') return prevScores;
      const nextScores = [...prevScores];
      nextScores[data.team] += 1;

      if (nextScores[data.team] >= goal) {
        nextScores[data.team] = goal;
        setPhase('end');
        publishState(clientRef.current, 'end', nextScores);
        fireConfetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      } else {
        publishState(clientRef.current, 'play', nextScores);
      }

      return nextScores;
    });
  };

  // Timer loop
  useEffect(() => {
    if (phase === 'play' && timeLimit > 0) {
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, endsAtRef.current - Date.now());
        const seconds = Math.ceil(remaining / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setTimeText(`${mins}:${String(secs).padStart(2, '0')}`);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('end');
          publishState(clientRef.current, 'end');
          fireConfetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        }
      }, 250);
    } else {
      setTimeText(timeLimit === 0 ? `목표 ${goal}점` : '');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLimit, goal]);

  // Handlers
  const handleStartRace = () => {
    setScores(Array(TEAMS_COUNT).fill(0));
    seenAnswersRef.current.clear();
    endsAtRef.current = Date.now() + timeLimit * 60 * 1000;
    setPhase('play');
    publishState(clientRef.current, 'play', Array(TEAMS_COUNT).fill(0));
  };

  const handlePauseResume = () => {
    if (phase === 'play') {
      remainingMsRef.current = endsAtRef.current - Date.now();
      setPhase('pause');
      publishState(clientRef.current, 'pause');
    } else if (phase === 'pause') {
      endsAtRef.current = Date.now() + remainingMsRef.current;
      setPhase('play');
      publishState(clientRef.current, 'play');
    }
  };

  const handleEndRace = () => {
    setPhase('end');
    publishState(clientRef.current, 'end');
    fireConfetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
  };

  const handleRestartLobby = () => {
    setScores(Array(TEAMS_COUNT).fill(0));
    setPhase('lobby');
    publishState(clientRef.current, 'lobby', Array(TEAMS_COUNT).fill(0));
  };

  // Connected device count per team
  const now = Date.now();
  const teamDeviceCounts = Array(TEAMS_COUNT).fill(0);
  Object.values(connectedClients).forEach(c => {
    if (now - c.lastSeen < 25000 && c.team >= 0 && c.team < TEAMS_COUNT) {
      teamDeviceCounts[c.team] += 1;
    }
  });

  // Calculate leader order
  const highestScore = Math.max(...scores);
  const sortedTeamIndices = Array.from({ length: TEAMS_COUNT }, (_, i) => i).sort(
    (a, b) => scores[b] - scores[a] || a - b
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Top Mission Control Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 backdrop-blur border border-slate-800 p-5 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLibrary}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="단어장 목록으로 이동"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-400">
                <Rocket className="w-4 h-4" />
                <span>단어 레이스 · {set.title}</span>
              </div>
              <h1 className="text-2xl font-black text-white">달나라 실시간 모둠 레이스</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 animate-pulse" />}
              <span>{isConnected ? '서버 연결됨' : '연결 중...'}</span>
            </div>

            {/* Room Code Badge */}
            <div className="bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">방 번호</span>
              <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">{roomCode}</span>
            </div>

            {/* Timer or Goal text */}
            {timeText && (
              <div className="bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700 flex items-center gap-2 font-mono text-xl font-black text-slate-200">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>{timeText}</span>
              </div>
            )}

            <button
              onClick={() => setShowQrModal(true)}
              className="p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 text-sm"
            >
              <QrCode className="w-5 h-5" />
              <span>참가 QR</span>
            </button>
          </div>
        </header>

        {/* LOBBY PHASE */}
        {phase === 'lobby' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* QR & Join Code Panel */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xl">
              <div className="bg-white p-4 rounded-2xl shadow-lg mb-4">
                {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="Join Race QR" className="w-64 h-64" />}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">태블릿 카메라로 QR 코드를 스캔하세요</h3>
              <p className="text-xs text-slate-400 mb-3">또는 아래 주소로 접속하여 4자리 방 번호를 입력하세요.</p>
              <code className="bg-slate-950 px-4 py-2 rounded-xl text-amber-400 font-mono text-sm border border-slate-800 select-all">
                {getRaceJoinUrl(roomCode)}
              </code>
            </div>

            {/* Game Setup Panel */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center gap-2 text-lg font-bold text-amber-400 border-b border-slate-800 pb-3">
                <Settings className="w-5 h-5" />
                <span>레이스 게임 설정</span>
              </div>

              {/* Goal Score selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  목표 점수 (달 도착 기준)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[15, 20, 30, 40, 50].map(val => (
                    <button
                      key={val}
                      onClick={() => setGoal(val)}
                      className={`px-4 py-2 rounded-xl font-extrabold text-sm transition ${
                        goal === val
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {val}점
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  제한 시간
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { m: 0, label: '무제한' },
                    { m: 3, label: '3분' },
                    { m: 5, label: '5분' },
                    { m: 7, label: '7분' },
                  ].map(opt => (
                    <button
                      key={opt.m}
                      onClick={() => setTimeLimit(opt.m)}
                      className={`px-4 py-2 rounded-xl font-extrabold text-sm transition ${
                        timeLimit === opt.m
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Type selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  문제 유형
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'mix', label: '🔀 섞어서' },
                    { id: 'en2ko', label: '🔤 뜻 고르기 (English → Korean)' },
                    { id: 'ko2en', label: '🇰🇷 단어 고르기 (Korean → English)' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setQuestionType(opt.id as any)}
                      className={`px-4 py-2 rounded-xl font-extrabold text-sm transition ${
                        questionType === opt.id
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Names edit */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  모둠 이름 설정
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {teamNames.map((name, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
                    >
                      <span className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: TEAM_COLORS[i] }} />
                      <input
                        type="text"
                        value={name}
                        onChange={e => {
                          const newNames = [...teamNames];
                          newNames[i] = e.target.value;
                          setTeamNames(newNames);
                        }}
                        className="bg-transparent text-white font-bold text-xs w-full focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Race Button */}
              <button
                onClick={handleStartRace}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xl rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-3 mt-2"
              >
                <Play className="w-7 h-7 fill-slate-950" />
                <span>모둠 레이스 시작하기!</span>
              </button>
            </div>
          </div>
        )}

        {/* PLAYING or PAUSED PHASE - RACE TRACK */}
        {(phase === 'play' || phase === 'pause') && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            {/* Control Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-sm text-slate-300">실시간 달나라 탐사 경기 중</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm rounded-xl transition flex items-center gap-2"
                >
                  {phase === 'pause' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                  <span>{phase === 'pause' ? '다시 시작' : '일시 정지'}</span>
                </button>

                <button
                  onClick={handleEndRace}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-extrabold text-sm rounded-xl border border-rose-500/30 transition"
                >
                  레이스 끝내기
                </button>
              </div>
            </div>

            {/* 7-Team Race Tracks */}
            <div className="space-y-4 py-2">
              {teamNames.map((name, i) => {
                const score = scores[i];
                const progressPct = Math.min(100, (score / goal) * 100);
                const isLeader = score > 0 && score === highestScore;
                const devCount = teamDeviceCounts[i];

                return (
                  <div
                    key={i}
                    className={`bg-slate-950 border p-3.5 rounded-2xl transition flex items-center gap-4 relative overflow-hidden ${
                      isLeader ? 'border-amber-500/60 bg-amber-950/10' : 'border-slate-850'
                    }`}
                  >
                    {/* Team Name & Status */}
                    <div className="w-32 sm:w-44 flex-none flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: TEAM_COLORS[i] }} />
                        <span className="font-black text-sm text-white truncate">{name}</span>
                        {isLeader && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md flex-none">
                            1위
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {devCount > 0 ? `태블릿 ${devCount}대` : '대기 중'}
                      </span>
                    </div>

                    {/* Outer Space Track with Moon Goal */}
                    <div className="flex-1 relative h-12 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center px-4 overflow-hidden">
                      {/* Dashed Center Line */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-slate-800" />

                      {/* Progress Bar Fill */}
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 opacity-20 rounded-xl"
                        style={{ backgroundColor: TEAM_COLORS[i] }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.4 }}
                      />

                      {/* Astronaut Rocket Icon */}
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 z-10"
                        style={{ left: `calc(${progressPct}% * 0.85)` }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20"
                          style={{ backgroundColor: TEAM_COLORS[i] }}
                        >
                          <Rocket className="w-5 h-5 text-slate-950 -rotate-45" />
                        </div>
                      </motion.div>

                      {/* Moon Goal Icon at the far right */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 font-extrabold text-xs flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                        <span>🌕 달</span>
                      </div>
                    </div>

                    {/* Score display */}
                    <div className="w-16 flex-none text-right font-mono font-black text-xl text-amber-400">
                      {score}
                      <span className="text-xs text-slate-500 font-sans block font-semibold">/ {goal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* END PHASE - WINNER PODIUM */}
        {phase === 'end' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">최종 탐사 결과</div>
              <h2 className="text-3xl font-black text-white">
                🎉 {teamNames[sortedTeamIndices[0]]} 달 도달 성공! (우승)
              </h2>
            </div>

            {/* 3D Podium */}
            <div className="flex items-end justify-center gap-4 w-full max-w-2xl py-6">
              {/* 2nd Place */}
              {sortedTeamIndices[1] !== undefined && (
                <div className="flex-1 flex flex-col items-center">
                  <span className="font-extrabold text-sm text-slate-300 mb-2">{teamNames[sortedTeamIndices[1]]}</span>
                  <div className="w-full bg-slate-800 border border-slate-700 rounded-t-2xl h-32 flex flex-col items-center justify-center font-mono font-black text-2xl text-slate-300">
                    <span>2위</span>
                    <span className="text-sm font-sans text-slate-400">{scores[sortedTeamIndices[1]]}점</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {sortedTeamIndices[0] !== undefined && (
                <div className="flex-1 flex flex-col items-center">
                  <Sparkles className="w-6 h-6 text-amber-400 mb-1 animate-bounce" />
                  <span className="font-black text-lg text-amber-400 mb-2">{teamNames[sortedTeamIndices[0]]}</span>
                  <div className="w-full bg-gradient-to-t from-amber-600 to-amber-500 border-2 border-amber-300 rounded-t-2xl h-44 flex flex-col items-center justify-center font-mono font-black text-4xl text-slate-950 shadow-xl shadow-amber-500/20">
                    <span>🥇 1위</span>
                    <span className="text-sm font-sans text-slate-900 font-bold">{scores[sortedTeamIndices[0]]}점</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {sortedTeamIndices[2] !== undefined && (
                <div className="flex-1 flex flex-col items-center">
                  <span className="font-extrabold text-sm text-slate-300 mb-2">{teamNames[sortedTeamIndices[2]]}</span>
                  <div className="w-full bg-slate-850 border border-slate-750 rounded-t-2xl h-24 flex flex-col items-center justify-center font-mono font-black text-xl text-slate-400">
                    <span>3위</span>
                    <span className="text-sm font-sans text-slate-500">{scores[sortedTeamIndices[2]]}점</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleRestartLobby}
              className="py-4 px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center gap-2"
            >
              <RotateCcw className="w-6 h-6" />
              <span>새 레이스 준비하기</span>
            </button>
          </div>
        )}

        {/* QR Modal Overlay */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center">
              <h3 className="text-xl font-extrabold text-white mb-2">학생 참가용 QR 코드</h3>
              <div className="bg-white p-4 rounded-2xl mb-4">
                {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" className="w-64 h-64" />}
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 mb-6">방 번호: {roomCode}</div>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
