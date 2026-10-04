import React, { useState, useMemo, useRef } from 'react';
import type { Word, WordSet } from '../types/voca';
import { exportWordsToTxt, exportWordsToCsv } from '../utils/txtParser';
import { exportWordSetsJson, importWordSetsJson } from '../utils/storage';
import { speakWord } from '../utils/tts';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  Star,
  CheckCircle,
  Download,
  FolderPlus,
  FileText,
  Clock,
  Save,
  Upload,
} from 'lucide-react';

interface WordListManagerProps {
  words: Word[];
  wordSets?: WordSet[];
  onImportSetsJson?: (sets: WordSet[]) => void;
  onOpenAddModal: () => void;
  onEditWord: (word: Word) => void;
  onDeleteWord: (wordId: string) => void;
  onDeleteMultipleWords: (wordIds: string[]) => void;
  onToggleStar: (wordId: string) => void;
  onToggleMastered: (wordId: string) => void;
  onCreateSetFromSelected: (title: string, selectedWords: Word[]) => void;
  onOpenTxtImport: () => void;
}

export const WordListManager: React.FC<WordListManagerProps> = ({
  words,
  wordSets = [],
  onImportSetsJson,
  onOpenAddModal,
  onEditWord,
  onDeleteWord,
  onDeleteMultipleWords,
  onToggleStar,
  onToggleMastered,
  onCreateSetFromSelected,
  onOpenTxtImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'starred' | 'mastered'>('all');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [newSetTitleInput, setNewSetTitleInput] = useState('');
  const [isCreatingSetModal, setIsCreatingSetModal] = useState(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportFullJson = () => {
    if (wordSets.length === 0) return;
    const jsonStr = exportWordSetsJson(wordSets);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mummumvoca_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = importWordSetsJson(reader.result as string);
        if (onImportSetsJson) {
          onImportSetsJson(result.updatedSets);
        }
        alert(`${result.importedCount}개 단어장을 불러왔습니다.`);
      } catch (err) {
        alert('백업 JSON 파일을 읽지 못했습니다.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered word list
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const matchSearch =
        w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.meaning.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filterType === 'starred') return w.starred;
      if (filterType === 'mastered') return w.mastered;
      return true;
    });
  }, [words, searchTerm, filterType]);

  const toggleSelectAll = () => {
    if (selectedWordIds.length === filteredWords.length) {
      setSelectedWordIds([]);
    } else {
      setSelectedWordIds(filteredWords.map(w => w.id));
    }
  };

  const toggleSelectWord = (id: string) => {
    setSelectedWordIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  // Export handlers
  const handleExportTxt = () => {
    const targetWords = words.filter(w => selectedWordIds.length === 0 || selectedWordIds.includes(w.id));
    const txtContent = exportWordsToTxt(targetWords);
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary_export_${Date.now()}.txt`;
    link.click();
  };

  const handleExportCsv = () => {
    const targetWords = words.filter(w => selectedWordIds.length === 0 || selectedWordIds.includes(w.id));
    const csvContent = exportWordsToCsv(targetWords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary_export_${Date.now()}.csv`;
    link.click();
  };

  const handleCreateCustomSetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetTitleInput.trim()) return;
    const selected = words.filter(w => selectedWordIds.includes(w.id));
    onCreateSetFromSelected(newSetTitleInput.trim(), selected);
    setIsCreatingSetModal(false);
    setNewSetTitleInput('');
    setSelectedWordIds([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">단어장 관리 (Vocabulary Set)</h2>
          <p className="text-xs text-slate-500">등록된 단어를 개별/일괄 편집하고 TXT 파일로 내보내거나 새 단어장을 만듭니다.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>단어 추가</span>
          </button>

          <button
            onClick={onOpenTxtImport}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>TXT 일괄 가져오기</span>
          </button>

          <button
            onClick={handleExportFullJson}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            title="모든 단어장을 JSON 파일로 내보내기"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">JSON 백업</span>
          </button>

          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            title="JSON 백업 파일 불러오기"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">백업 복원</span>
          </button>
          <input
            type="file"
            ref={jsonFileInputRef}
            onChange={handleImportJsonFile}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="단어 또는 한글 뜻 검색..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-1 w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            전체 ({words.length})
          </button>

          <button
            onClick={() => setFilterType('starred')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'starred'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>관심 단어 ({words.filter(w => w.starred).length})</span>
          </button>

          <button
            onClick={() => setFilterType('mastered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'mastered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>완전 암기 ({words.filter(w => w.mastered).length})</span>
          </button>
        </div>
      </div>

      {/* Selected Items Multi-Action Bar (Requirement 2.D.2) */}
      {selectedWordIds.length > 0 && (
        <div className="bg-blue-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <span className="text-xs font-bold">
            선택된 단어: <span className="text-blue-300 font-mono text-sm">{selectedWordIds.length}개</span>
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreatingSetModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>선택한 단어로 새 단어장 만들기</span>
            </button>

            <button
              onClick={handleExportTxt}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>TXT 내보내기</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV 내보내기</span>
            </button>

            <button
              onClick={() => {
                onDeleteMultipleWords(selectedWordIds);
                setSelectedWordIds([]);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>선택 삭제</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredWords.length > 0 && selectedWordIds.length === filteredWords.length}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">영단어 (Word)</th>
                <th className="py-3.5 px-4">품사</th>
                <th className="py-3.5 px-4">한글 뜻 (Meaning)</th>
                <th className="py-3.5 px-4 hidden md:table-cell">예문 (Example)</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">등록 일시 (Timestamp)</th>
                <th className="py-3.5 px-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    검색 결과 또는 단어가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredWords.map(word => {
                  const isSelected = selectedWordIds.includes(word.id);
                  return (
                    <tr
                      key={word.id}
                      className={`hover:bg-slate-50/80 transition-all ${
                        isSelected ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectWord(word.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => speakWord(word.word)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-all"
                            title="발음 듣기"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <span>{word.word}</span>
                          {word.phonetic && (
                            <span className="text-xs font-normal font-mono text-slate-400">
                              {word.phonetic}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-500">
                        {word.pos || '-'}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">{word.meaning}</td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 hidden md:table-cell max-w-[220px] truncate">
                        {word.example || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400 hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <span>{word.createdAt}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onToggleStar(word.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              word.starred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                            }`}
                            title="관심 단어"
                          >
                            <Star className={`w-4 h-4 ${word.starred ? 'fill-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => onToggleMastered(word.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              word.mastered ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500'
                            }`}
                            title="완전 암기"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditWord(word)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDeleteWord(word.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Set from Selected */}
      {isCreatingSetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">선택한 단어로 새 단어장 만들기</h3>
            <p className="text-xs text-slate-500 mb-4">
              총 <span className="font-bold text-blue-600">{selectedWordIds.length}개</span> 단어로 새로운 학습 세트를 만듭니다.
            </p>

            <form onSubmit={handleCreateCustomSetSubmit} className="space-y-4">
              <input
                type="text"
                value={newSetTitleInput}
                onChange={e => setNewSetTitleInput(e.target.value)}
                placeholder="단어장 제목 입력 (예: 10월 오답 복습 세트)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingSetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!newSetTitleInput.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  단어장 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
