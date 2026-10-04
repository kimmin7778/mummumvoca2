import LZString from 'lz-string';
import QRCode from 'qrcode';
import type { WordSet, Word } from '../types/voca';
import { formatTimestamp } from './dateFormatter';

export interface CompactWordSet {
  t: string; // title
  w: [string, string][]; // [word, meaning][]
}

/**
 * Encodes a WordSet into a compressed LZ-String for URL hash sharing (#p=...)
 */
export function encodeWordSetToHash(set: WordSet): string {
  const compact: CompactWordSet = {
    t: set.title,
    w: set.words.map(w => [w.word, w.meaning]),
  };
  const jsonStr = JSON.stringify(compact);
  return LZString.compressToEncodedURIComponent(jsonStr);
}

/**
 * Decodes a compressed LZ-String hash back into a WordSet
 */
export function decodeWordSetFromHash(code: string): WordSet | null {
  try {
    const jsonStr = LZString.decompressFromEncodedURIComponent(code);
    if (!jsonStr) return null;

    const data: CompactWordSet = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.w) || data.w.length === 0) return null;

    const now = formatTimestamp();
    const words: Word[] = data.w.map(([word, meaning], i) => ({
      id: `w_shared_${i}_${Math.random().toString(36).substring(2, 7)}`,
      word: String(word || ''),
      meaning: String(meaning || ''),
      createdAt: now,
      updatedAt: now,
      mastered: false,
      starred: false,
      wrongCount: 0,
      correctCount: 0,
    }));

    return {
      id: `shared_${Date.now()}`,
      title: data.t || '공유된 단어장',
      description: 'URL 링크를 통해 공유받은 단어장입니다.',
      category: '공유 단어장',
      createdAt: now,
      updatedAt: now,
      words,
    };
  } catch (e) {
    console.error('Failed to decode word set from hash:', e);
    return null;
  }
}

/**
 * Generates QR Code SVG string or Data URL
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code Data URL:', err);
    return '';
  }
}

/**
 * Gets absolute shareable URL for a WordSet
 */
export function getShareableUrl(set: WordSet): string {
  const hash = encodeWordSetToHash(set);
  const base = window.location.origin + window.location.pathname;
  return `${base}#p=${hash}`;
}

/**
 * Gets tablet join URL with room code
 */
export function getRaceJoinUrl(roomCode: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?room=${roomCode}`;
}
