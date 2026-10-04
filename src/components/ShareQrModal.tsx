import { useState, useEffect } from 'react';
import type { WordSet } from '../types/voca';
import { generateQRCodeDataUrl, getShareableUrl } from '../utils/shareUtils';
import { X, Copy, ExternalLink, Download, QrCode, Check } from 'lucide-react';

interface ShareQrModalProps {
  isOpen: boolean;
  set: WordSet | null;
  onClose: () => void;
}

export function ShareQrModal({ isOpen, set, onClose }: ShareQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && set) {
      const url = getShareableUrl(set);
      generateQRCodeDataUrl(url).then(setQrDataUrl);
      setCopied(false);
    }
  }, [isOpen, set]);

  if (!isOpen || !set) return null;

  const shareUrl = getShareableUrl(set);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('링크 복사에 실패했습니다. 아래 주소를 직접 복사하세요.');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${set.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">
          학생 연습용 QR 코드 & 링크
        </span>
        <h3 className="text-xl font-black text-slate-900 mb-1">{set.title}</h3>
        <p className="text-xs text-slate-500 mb-4">
          서버 연결 없이 QR 코드나 링크 하나로 태블릿/스마트폰에서 학습할 수 있습니다.
        </p>

        {/* QR Code display */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 shadow-inner">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 rounded-lg object-contain mx-auto" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 font-semibold text-sm">
              QR 코드 생성 중...
            </div>
          )}
        </div>

        {/* URL Display */}
        <div className="w-full bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 truncate mb-5 select-all">
          {shareUrl}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '복사 완료!' : '링크 복사'}</span>
          </button>

          <button
            onClick={handleDownloadQr}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
          >
            <Download className="w-4 h-4" />
            <span>QR 저장</span>
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>새 창 열기</span>
          </a>
        </div>
      </div>
    </div>
  );
}
