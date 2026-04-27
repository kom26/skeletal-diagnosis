// app/page.tsx
'use client';

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ResultCard from '@/components/ResultCard';
import { DiagnosisResult, ApiResponse } from '@/types';

type State = 'idle' | 'analyzing' | 'done' | 'error';

export default function HomePage() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleDiagnose = async () => {
    if (!imageData) return;
    setState('analyzing');
    setErrorMsg('');

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      const json: ApiResponse = await res.json();

      if (!json.success || !json.data) {
        setErrorMsg(json.error || '診断に失敗しました');
        setState('error');
        return;
      }

      setResult(json.data);
      setState('done');
    } catch {
      setErrorMsg('通信エラーが発生しました。しばらくしてから再度お試しください。');
      setState('error');
    }
  };

  const handleRetry = () => {
    setImageData(null);
    setResult(null);
    setState('idle');
    setErrorMsg('');
  };

  const isAnalyzing = state === 'analyzing';
  const canDiagnose = imageData && !isAnalyzing && state !== 'done';

  return (
    <main className="min-h-screen bg-stone-50">
      {/* ノイズテクスチャ背景 */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative max-w-lg mx-auto px-6 py-16">
        {/* ロゴ・ヘッダー */}
        <header className="text-center mb-14">
          <p className="text-xs tracking-[0.5em] text-stone-400 uppercase mb-3 font-display">
            AI Diagnosis
          </p>
          <h1 className="font-display text-6xl font-light tracking-wider text-stone-800 mb-3">
            SKELÉ
          </h1>
          <div className="w-8 h-px bg-amber-600 mx-auto mb-4 opacity-60" />
          <p className="text-stone-500 text-sm font-light leading-relaxed tracking-wide">
            写真1枚から、あなたの骨格タイプを<br />
            AIが瞬時に診断します
          </p>
        </header>

        {/* コンテンツカード */}
        <div className="bg-white rounded-3xl shadow-sm shadow-stone-200/50 p-8 border border-stone-100">
          {state === 'done' && result ? (
            <ResultCard result={result} onRetry={handleRetry} />
          ) : (
            <>
              {/* アップローダー */}
              <ImageUploader
                onImageReady={setImageData}
                disabled={isAnalyzing}
              />

              {/* エラー表示 */}
              {state === 'error' && errorMsg && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-red-600 text-sm font-light text-center">{errorMsg}</p>
                </div>
              )}

              {/* 診断ボタン */}
              <button
                onClick={handleDiagnose}
                disabled={!canDiagnose}
                className={`
                  mt-6 w-full py-4 rounded-xl text-sm tracking-[0.3em] font-light transition-all duration-300
                  ${canDiagnose
                    ? 'bg-stone-800 text-stone-50 hover:bg-stone-700 shadow-md shadow-stone-900/10 hover:shadow-lg hover:shadow-stone-900/15'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }
                `}
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-4 h-4 border border-stone-400 border-t-stone-200 rounded-full animate-spin" />
                    AI が分析中...
                  </span>
                ) : (
                  '診断する'
                )}
              </button>

              {/* 注意事項 */}
              <p className="mt-4 text-xs text-stone-400 text-center leading-relaxed">
                アップロードされた画像はAI分析のみに使用され、<br />
                第三者に提供されることはありません
              </p>
            </>
          )}
        </div>

        {/* フッター */}
        <footer className="mt-10 text-center">
          <p className="text-xs text-stone-300 tracking-wider">
            © 2025 SKELÉ — AI骨格診断
          </p>
        </footer>
      </div>
    </main>
  );
}
