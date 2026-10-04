import type { WordSet, TestResult, Word } from '../types/voca';
import { formatTimestamp } from './dateFormatter';

const STORAGE_KEYS = {
  WORD_SETS: 'class_voca_word_sets_v1',
  ACTIVE_SET_ID: 'class_voca_active_set_id_v1',
  TEST_HISTORY: 'class_voca_test_history_v1',
};

// Requirement 4.3: Pre-loaded starter word set (10 essential English words)
const DEFAULT_STARTER_SET: WordSet = {
  id: 'starter_set_001',
  title: '📘 필수 영어 단어 TOP 10 (Starter Set)',
  description: '클래스카드 스타일로 배우는 초중급 핵심 영단어 10개입니다.',
  category: '기초 필수',
  createdAt: '2026-10-04 10:00:00',
  updatedAt: '2026-10-04 10:00:00',
  isDefault: true,
  words: [
    {
      id: 'w_1',
      word: 'effort',
      pos: 'n.',
      meaning: '노력, 수고',
      example: 'Success requires constant effort and hard work.',
      exampleMeaning: '성공은 지속적인 노력과 수고를 요구한다.',
      phonetic: '/ˈef.ɚt/',
      createdAt: '2026-10-04 10:00:00',
      updatedAt: '2026-10-04 10:00:00',
      mastered: false,
      starred: true,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_2',
      word: 'focus',
      pos: 'v.',
      meaning: '집중하다, 초점을 맞추다',
      example: 'You need to focus on your main learning goals.',
      exampleMeaning: '너는 주 학습 목표에 집중할 필요가 있다.',
      phonetic: '/ˈfoʊ.kəs/',
      createdAt: '2026-10-04 10:00:01',
      updatedAt: '2026-10-04 10:00:01',
      mastered: false,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_3',
      word: 'honest',
      pos: 'adj.',
      meaning: '정직한, 솔직한',
      example: 'He gave an honest feedback on the project.',
      exampleMeaning: '그는 프로젝트에 대해 솔직한 피드백을 주었다.',
      phonetic: '/ˈɑː.nɪst/',
      createdAt: '2026-10-04 10:00:02',
      updatedAt: '2026-10-04 10:00:02',
      mastered: true,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_4',
      word: 'imagine',
      pos: 'v.',
      meaning: '상상하다, 마음속에 그리다',
      example: 'Imagine living in a world of limitless opportunity.',
      exampleMeaning: '무한한 기회의 세상에서 살아가는 모습을 상상해보세요.',
      phonetic: '/ɪˈmædʒ.ɪn/',
      createdAt: '2026-10-04 10:00:03',
      updatedAt: '2026-10-04 10:00:03',
      mastered: false,
      starred: true,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_5',
      word: 'journey',
      pos: 'n.',
      meaning: '여정, 여행',
      example: 'Learning a new language is an exciting journey.',
      exampleMeaning: '새로운 언어를 배우는 것은 흥미진진한 여정이다.',
      phonetic: '/ˈdʒɝː.ni/',
      createdAt: '2026-10-04 10:00:04',
      updatedAt: '2026-10-04 10:00:04',
      mastered: false,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_6',
      word: 'knowledge',
      pos: 'n.',
      meaning: '지식, 학식',
      example: 'Knowledge grows when it is shared with others.',
      exampleMeaning: '지식은 타인과 공유될 때 성장한다.',
      phonetic: '/ˈnɑː.lɪdʒ/',
      createdAt: '2026-10-04 10:00:05',
      updatedAt: '2026-10-04 10:00:05',
      mastered: true,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_7',
      word: 'navigate',
      pos: 'v.',
      meaning: '길을 찾다, 항해하다',
      example: 'We navigated through the complex grammar rules.',
      exampleMeaning: '우리는 복잡한 문법 규칙 속에서 길을 찾아냈다.',
      phonetic: '/ˈnæv.ə.ɡeɪt/',
      createdAt: '2026-10-04 10:00:06',
      updatedAt: '2026-10-04 10:00:06',
      mastered: false,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_8',
      word: 'opportunity',
      pos: 'n.',
      meaning: '기회',
      example: 'Every mistake is a valuable learning opportunity.',
      exampleMeaning: '모든 실수는 가치 있는 학습 기회이다.',
      phonetic: '/ˌɑː.pɚˈtuː.nə.t̬i/',
      createdAt: '2026-10-04 10:00:07',
      updatedAt: '2026-10-04 10:00:07',
      mastered: false,
      starred: true,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_9',
      word: 'resilient',
      pos: 'adj.',
      meaning: '회복력 있는, 굴하지 않는',
      example: 'She is resilient and never gives up under pressure.',
      exampleMeaning: '그녀는 회복력이 뛰어나 압박 속에서도 결코 포기하지 않는다.',
      phonetic: '/rɪˈzɪl.jənt/',
      createdAt: '2026-10-04 10:00:08',
      updatedAt: '2026-10-04 10:00:08',
      mastered: false,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    },
    {
      id: 'w_10',
      word: 'strategy',
      pos: 'n.',
      meaning: '전략, 계책',
      example: 'A good revision strategy leads to top exam scores.',
      exampleMeaning: '좋은 복습 전략이 최고 시험 점수로 이어진다.',
      phonetic: '/ˈstræt.ə.dʒi/',
      createdAt: '2026-10-04 10:00:09',
      updatedAt: '2026-10-04 10:00:09',
      mastered: false,
      starred: true,
      wrongCount: 0,
      correctCount: 0,
    },
  ],
};

/**
 * Loads all WordSets from LocalStorage, initializing default set if empty
 */
export function loadWordSets(): WordSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORD_SETS);
    if (!raw) {
      const initial = [DEFAULT_STARTER_SET];
      saveWordSets(initial);
      return initial;
    }
    const parsed: WordSet[] = JSON.parse(raw);
    if (parsed.length === 0) {
      const initial = [DEFAULT_STARTER_SET];
      saveWordSets(initial);
      return initial;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load word sets from LocalStorage:', e);
    return [DEFAULT_STARTER_SET];
  }
}

/**
 * Saves WordSets array to LocalStorage
 */
export function saveWordSets(sets: WordSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WORD_SETS, JSON.stringify(sets));
  } catch (e) {
    console.error('Failed to save word sets to LocalStorage:', e);
  }
}

/**
 * Gets currently active set ID
 */
export function getActiveSetId(sets: WordSet[]): string {
  try {
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SET_ID);
    if (savedId && sets.some(s => s.id === savedId)) {
      return savedId;
    }
  } catch (e) {
    console.error(e);
  }
  return sets[0]?.id || DEFAULT_STARTER_SET.id;
}

/**
 * Saves active set ID
 */
export function saveActiveSetId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SET_ID, id);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Loads test history array
 */
export function loadTestHistory(): TestResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEST_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load test history:', e);
    return [];
  }
}

/**
 * Saves a new test result entry
 */
export function saveTestResult(result: TestResult): TestResult[] {
  const current = loadTestHistory();
  const updated = [result, ...current];
  try {
    localStorage.setItem(STORAGE_KEYS.TEST_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save test result:', e);
  }
  return updated;
}

/**
 * Clears test history
 */
export function clearTestHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TEST_HISTORY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Creates a new WordSet from selected words (Requirement 2.D.2)
 */
export function createSetFromSelectedWords(title: string, words: Word[]): WordSet {
  const now = formatTimestamp();
  const newSet: WordSet = {
    id: `set_${Date.now()}`,
    title,
    description: `선택한 단어 ${words.length}개로 생성된 사용자 단어장`,
    category: '맞춤 단어장',
    createdAt: now,
    updatedAt: now,
    words: words.map(w => ({ ...w, updatedAt: now })),
  };

  const sets = loadWordSets();
  const updatedSets = [...sets, newSet];
  saveWordSets(updatedSets);
  return newSet;
}

/**
 * High score key for Match Game
 */
export function getBestMatchTime(setId: string, tileCount: number): number | null {
  try {
    const raw = localStorage.getItem(`class_voca_best_match_${setId}_${tileCount}`);
    return raw ? parseFloat(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveBestMatchTime(setId: string, tileCount: number, timeSeconds: number): boolean {
  try {
    const key = `class_voca_best_match_${setId}_${tileCount}`;
    const currentBest = getBestMatchTime(setId, tileCount);
    if (currentBest === null || timeSeconds < currentBest) {
      localStorage.setItem(key, timeSeconds.toFixed(1));
      return true; // New record
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

/**
 * JSON Full Backup Export
 */
export function exportWordSetsJson(sets: WordSet[]): string {
  const data = {
    app: 'mummumvoca',
    version: '2.0',
    exportedAt: formatTimestamp(),
    sets,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * JSON Full Backup Import
 */
export function importWordSetsJson(jsonText: string): { importedCount: number; updatedSets: WordSet[] } {
  try {
    const data = JSON.parse(jsonText);
    const incomingSets: WordSet[] = data.sets || (Array.isArray(data) ? data : []);
    if (!Array.isArray(incomingSets) || incomingSets.length === 0) {
      throw new Error('유효한 단어장 데이터가 없습니다.');
    }

    const currentSets = loadWordSets();
    const setMap = new Map<string, WordSet>();

    currentSets.forEach(s => setMap.set(s.id, s));
    let count = 0;

    incomingSets.forEach(s => {
      if (s && s.title && Array.isArray(s.words)) {
        const id = s.id || `set_imp_${Date.now()}_${count}`;
        setMap.set(id, { ...s, id });
        count++;
      }
    });

    const updated = Array.from(setMap.values());
    saveWordSets(updated);
    return { importedCount: count, updatedSets: updated };
  } catch (e) {
    console.error('Failed to import JSON word sets:', e);
    throw e;
  }
}
