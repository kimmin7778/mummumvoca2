import { useState, useEffect } from 'react';
import type { WordSet, Word, LearningMode, TestResult } from './types/voca';
import {
  loadWordSets,
  saveWordSets,
  getActiveSetId,
  saveActiveSetId,
  loadTestHistory,
  clearTestHistory,
  createSetFromSelectedWords,
} from './utils/storage';
import { formatTimestamp } from './utils/dateFormatter';
import { initTTS } from './utils/tts';
import { decodeWordSetFromHash } from './utils/shareUtils';

import { Header } from './components/Header';
import { FlashcardMode } from './components/FlashcardMode';
import { RecallMode } from './components/RecallMode';
import { SpellingMode } from './components/SpellingMode';
import { MatchGameMode } from './components/MatchGameMode';
import { RaceHostMode } from './components/RaceHostMode';
import { RaceTabletMode } from './components/RaceTabletMode';
import { TestMode } from './components/TestMode';
import { TestHistoryDashboard } from './components/TestHistoryDashboard';
import { WordListManager } from './components/WordListManager';
import { TxtImportModal } from './components/TxtImportModal';
import { WordEditModal } from './components/WordEditModal';
import { ShareQrModal } from './components/ShareQrModal';

export function App() {
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>('');
  const [activeMode, setActiveMode] = useState<LearningMode>('flashcard');
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  // Modals state
  const [isTxtImportOpen, setIsTxtImportOpen] = useState(false);
  const [isWordEditOpen, setIsWordEditOpen] = useState(false);
  const [isShareQrOpen, setIsShareQrOpen] = useState(false);
  const [wordToEdit, setWordToEdit] = useState<Word | null>(null);
  const [tabletInitialRoom, setTabletInitialRoom] = useState<string>('');

  // Initialize TTS voices & load initial state from LocalStorage
  useEffect(() => {
    initTTS();
    const loadedSets = loadWordSets();

    // Check URL parameters / Hash
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    let initialSets = loadedSets;
    if (hash.startsWith('#p=')) {
      const decodedSet = decodeWordSetFromHash(hash.slice(3));
      if (decodedSet) {
        const existingIdx = loadedSets.findIndex(s => s.title === decodedSet.title);
        if (existingIdx >= 0) {
          initialSets[existingIdx] = decodedSet;
        } else {
          initialSets = [decodedSet, ...loadedSets];
        }
        saveWordSets(initialSets);
        saveActiveSetId(decodedSet.id);
      }
    }

    setWordSets(initialSets);
    const activeId = getActiveSetId(initialSets);
    setActiveSetId(activeId);

    const history = loadTestHistory();
    setTestHistory(history);

    // Route checks
    if (params.has('room')) {
      setTabletInitialRoom(params.get('room') || '');
      setActiveMode('race-tablet');
    } else if (params.has('host')) {
      setActiveMode('race-host');
    }
  }, []);

  // Sync wordSets changes to LocalStorage
  const updateWordSetsState = (newSets: WordSet[]) => {
    setWordSets(newSets);
    saveWordSets(newSets);
  };

  // Active word set
  const activeSet = wordSets.find(s => s.id === activeSetId) || wordSets[0];
  const activeWords = activeSet?.words || [];

  // Handlers
  const handleSelectSetId = (id: string) => {
    setActiveSetId(id);
    saveActiveSetId(id);
  };

  const handleCreateNewSet = () => {
    const title = prompt('새 단어장 제목을 입력하세요:', `사용자 단어장 ${wordSets.length + 1}`);
    if (!title) return;

    const now = formatTimestamp();
    const newSet: WordSet = {
      id: `set_${Date.now()}`,
      title,
      description: '새로 등록한 단어장입니다.',
      createdAt: now,
      updatedAt: now,
      words: [],
    };

    const updated = [...wordSets, newSet];
    updateWordSetsState(updated);
    setActiveSetId(newSet.id);
    saveActiveSetId(newSet.id);
  };

  // Add or edit single word
  const handleSaveWord = (wordData: Partial<Word>) => {
    if (!activeSet) return;

    let updatedWords: Word[];
    const now = formatTimestamp();

    if (wordData.id && activeSet.words.some(w => w.id === wordData.id)) {
      // Edit existing word
      updatedWords = activeSet.words.map(w =>
        w.id === wordData.id ? ({ ...w, ...wordData, updatedAt: now } as Word) : w
      );
    } else {
      // Add new word
      const newWord: Word = {
        id: `word_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        word: wordData.word || '',
        pos: wordData.pos,
        meaning: wordData.meaning || '',
        example: wordData.example,
        exampleMeaning: wordData.exampleMeaning,
        phonetic: wordData.phonetic,
        audioUrl: wordData.audioUrl,
        createdAt: wordData.createdAt || now,
        updatedAt: now,
        mastered: false,
        starred: false,
        wrongCount: 0,
        correctCount: 0,
      };
      updatedWords = [newWord, ...activeSet.words];
    }

    const updatedSets = wordSets.map(s =>
      s.id === activeSet.id ? { ...s, words: updatedWords, updatedAt: now } : s
    );
    updateWordSetsState(updatedSets);
  };

  // Batch TXT Import
  const handleImportWords = (parsedPartialWords: Partial<Word>[]) => {
    if (!activeSet) return;

    const now = formatTimestamp();
    const newWords: Word[] = parsedPartialWords.map(pw => ({
      id: pw.id || `word_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      word: pw.word || '',
      pos: pw.pos,
      meaning: pw.meaning || '',
      example: pw.example,
      exampleMeaning: pw.exampleMeaning,
      phonetic: pw.phonetic,
      createdAt: pw.createdAt || now,
      updatedAt: now,
      mastered: false,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    }));

    const updatedWords = [...newWords, ...activeSet.words];
    const updatedSets = wordSets.map(s =>
      s.id === activeSet.id ? { ...s, words: updatedWords, updatedAt: now } : s
    );
    updateWordSetsState(updatedSets);
  };

  // Delete word
  const handleDeleteWord = (wordId: string) => {
    if (!activeSet) return;
    if (!confirm('이 단어를 삭제하시겠습니까?')) return;

    const updatedWords = activeSet.words.filter(w => w.id !== wordId);
    const updatedSets = wordSets.map(s =>
      s.id === activeSet.id ? { ...s, words: updatedWords, updatedAt: formatTimestamp() } : s
    );
    updateWordSetsState(updatedSets);
  };

  // Delete multiple words
  const handleDeleteMultipleWords = (wordIds: string[]) => {
    if (!activeSet) return;
    if (!confirm(`선택한 ${wordIds.length}개 단어를 삭제하시겠습니까?`)) return;

    const updatedWords = activeSet.words.filter(w => !wordIds.includes(w.id));
    const updatedSets = wordSets.map(s =>
      s.id === activeSet.id ? { ...s, words: updatedWords, updatedAt: formatTimestamp() } : s
    );
    updateWordSetsState(updatedSets);
  };

  // Toggle Starred
  const handleToggleStar = (wordId: string) => {
    if (!activeSet) return;
    const updatedWords = activeSet.words.map(w =>
      w.id === wordId ? { ...w, starred: !w.starred, updatedAt: formatTimestamp() } : w
    );
    const updatedSets = wordSets.map(s => (s.id === activeSet.id ? { ...s, words: updatedWords } : s));
    updateWordSetsState(updatedSets);
  };

  // Toggle Mastered
  const handleToggleMastered = (wordId: string) => {
    if (!activeSet) return;
    const updatedWords = activeSet.words.map(w =>
      w.id === wordId ? { ...w, mastered: !w.mastered, updatedAt: formatTimestamp() } : w
    );
    const updatedSets = wordSets.map(s => (s.id === activeSet.id ? { ...s, words: updatedWords } : s));
    updateWordSetsState(updatedSets);
  };

  // Retest Wrong Words action (Requirement 2.D.1)
  const handleRetestWrongWords = (wrongWords: Word[]) => {
    if (wrongWords.length === 0) return;
    const title = `⚠️ 오답 복습 세트 (${formatTimestamp().split(' ')[0]})`;
    const newSet = createSetFromSelectedWords(title, wrongWords);

    const updatedSets = loadWordSets();
    setWordSets(updatedSets);
    setActiveSetId(newSet.id);
    saveActiveSetId(newSet.id);
    setActiveMode('test');
  };

  // Create custom set from selected (Requirement 2.D.2)
  const handleCreateSetFromSelected = (title: string, selectedWords: Word[]) => {
    const newSet = createSetFromSelectedWords(title, selectedWords);
    const updatedSets = loadWordSets();
    setWordSets(updatedSets);
    setActiveSetId(newSet.id);
    saveActiveSetId(newSet.id);
  };

  const handleClearHistory = () => {
    if (confirm('모든 시험 성적 기록을 삭제하시겠습니까?')) {
      clearTestHistory();
      setTestHistory([]);
    }
  };

  // Special full screen views for Word Race
  if (activeMode === 'race-host' && activeSet) {
    return (
      <RaceHostMode
        set={activeSet}
        onBackToLibrary={() => setActiveMode('flashcard')}
      />
    );
  }

  if (activeMode === 'race-tablet') {
    return (
      <RaceTabletMode
        initialRoom={tabletInitialRoom}
        onExit={() => setActiveMode('flashcard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Navigation Header */}
      <Header
        wordSets={wordSets}
        activeSetId={activeSetId}
        onSelectSetId={handleSelectSetId}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onCreateNewSet={handleCreateNewSet}
        onOpenTxtImport={() => setIsTxtImportOpen(true)}
        onOpenShareQr={() => setIsShareQrOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {activeMode === 'flashcard' && (
          <FlashcardMode
            words={activeWords}
            onToggleStar={handleToggleStar}
            onToggleMastered={handleToggleMastered}
          />
        )}

        {activeMode === 'recall' && <RecallMode words={activeWords} />}

        {activeMode === 'spelling' && <SpellingMode words={activeWords} />}

        {activeMode === 'match' && (
          <MatchGameMode words={activeWords} setId={activeSet?.id || 'default'} />
        )}

        {activeMode === 'test' && (
          <TestMode
            words={activeWords}
            setId={activeSet?.id || ''}
            setName={activeSet?.title || ''}
            onRetestWrongWords={handleRetestWrongWords}
          />
        )}

        {activeMode === 'manage' && (
          <WordListManager
            words={activeWords}
            wordSets={wordSets}
            onImportSetsJson={updateWordSetsState}
            onOpenAddModal={() => {
              setWordToEdit(null);
              setIsWordEditOpen(true);
            }}
            onEditWord={word => {
              setWordToEdit(word);
              setIsWordEditOpen(true);
            }}
            onDeleteWord={handleDeleteWord}
            onDeleteMultipleWords={handleDeleteMultipleWords}
            onToggleStar={handleToggleStar}
            onToggleMastered={handleToggleMastered}
            onCreateSetFromSelected={handleCreateSetFromSelected}
            onOpenTxtImport={() => setIsTxtImportOpen(true)}
          />
        )}

        {activeMode === 'history' && (
          <TestHistoryDashboard
            history={testHistory}
            onClearHistory={handleClearHistory}
            onRetestWrongWords={handleRetestWrongWords}
          />
        )}
      </main>

      {/* Modals */}
      <TxtImportModal
        isOpen={isTxtImportOpen}
        onClose={() => setIsTxtImportOpen(false)}
        onImportWords={handleImportWords}
      />

      <WordEditModal
        isOpen={isWordEditOpen}
        wordToEdit={wordToEdit}
        onClose={() => {
          setIsWordEditOpen(false);
          setWordToEdit(null);
        }}
        onSave={handleSaveWord}
      />

      <ShareQrModal
        isOpen={isShareQrOpen}
        set={activeSet}
        onClose={() => setIsShareQrOpen(false)}
      />
    </div>
  );
}

export default App;
