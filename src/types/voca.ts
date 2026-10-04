export interface Word {
  id: string;
  word: string;
  pos?: string; // Part of Speech (n., v., adj., adv., etc.)
  meaning: string; // Korean meaning
  example?: string; // English example sentence
  exampleMeaning?: string; // Korean translation of example sentence
  phonetic?: string; // e.g. /æp.əl/
  audioUrl?: string; // Audio pronunciation URL from dictionary
  createdAt: string; // YYYY-MM-DD HH:mm:ss
  updatedAt: string; // YYYY-MM-DD HH:mm:ss
  mastered?: boolean; // 완전 암기 여부
  starred?: boolean; // 관심/중요 단어 여부
  wrongCount?: number; // 틀린 횟수
  correctCount?: number; // 맞춘 횟수
}

export interface WordSet {
  id: string;
  title: string;
  description?: string;
  category?: string;
  createdAt: string; // YYYY-MM-DD HH:mm:ss
  updatedAt: string; // YYYY-MM-DD HH:mm:ss
  words: Word[];
  isDefault?: boolean;
}

export type DelimiterType = 'auto' | 'colon' | 'tab' | 'comma' | 'equal' | 'hyphen' | 'pipe';

export interface ParseError {
  line: number;
  rawText: string;
  reason: string;
}

export interface TxtParseResult {
  parsedWords: Partial<Word>[];
  validCount: number;
  errorCount: number;
  errors: ParseError[];
  detectedDelimiter?: string;
}

export interface TestResult {
  id: string;
  setId: string;
  setName: string;
  date: string; // YYYY-MM-DD HH:mm
  totalQuestions: number;
  correctAnswers: number;
  score: number; // 0-100
  accuracy: number; // percentage
  timeTakenSeconds: number;
  wrongWords: Word[];
  mode: 'recall' | 'spelling' | 'test';
}

export interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: {
      definition: string;
      example?: string;
    }[];
  }[];
}

export interface AutoFillResult {
  word: string;
  pos?: string;
  phonetic?: string;
  audioUrl?: string;
  meaning?: string;
  example?: string;
  exampleMeaning?: string;
}

export type LearningMode =
  | 'flashcard'
  | 'recall'
  | 'spelling'
  | 'match'
  | 'race-host'
  | 'race-tablet'
  | 'test'
  | 'manage'
  | 'history';

export interface RaceState {
  setId: string;
  room: string;
  phase: 'lobby' | 'play' | 'pause' | 'end' | 'closed';
  goal: number;
  time: number; // in minutes (0 = unlimited)
  type: 'en2ko' | 'ko2en' | 'mix';
  scores: number[];
  names: string[];
  endsAt: number;
  remain: number;
  ts: number;
  title?: string;
  words?: [string, string][];
}

export interface RaceAnswerPayload {
  team: number;
  cid: string;
  seq: number;
}
