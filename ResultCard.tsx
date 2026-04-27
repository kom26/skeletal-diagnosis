// components/ResultCard.tsx
'use client';

import { DiagnosisResult, BodyType } from '@/types';

const TYPE_META: Record<BodyType, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  accent: string;
  tagline: string;
}> = {
  straight: {
    label: 'ストレート',
    emoji: '◆',
    color: 'text-rose-800',
    bgColor: 'bg-rose-50',
    accent: 'bg-rose-800',
    tagline: 'メリハリのある立体的なボディライン',
  },
  wave: {
    label: 'ウェーブ',
    emoji: '◐',
    color: 'text-sky-800',
    bgColor: 'bg-sky-50',
    accent: 'bg-sky-800',
    tagline: '柔らかく曲線的なフェミニンライン',
  },
  natural: {
    label: 'ナチュラル',
    emoji: '◇',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-50',
    accent: 'bg-emerald-800',
    tagline: '骨感のあるスタイリッシュなフレーム',
  },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

interface Props {
  result: DiagnosisResult;
  onRetry: () => void;
}

export default function ResultCard({ result, onRetry }: Props) {
  const meta = TYPE_META[result.bodyType];

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ヘッダー */}
      <div className={`${meta.bgColor} rounded-2xl p-8 mb-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-stone-400 uppercase mb-2">Diagnosis Result</p>
            <h2 className={`text-4xl font-light tracking-wider ${meta.color}`}>
              <span className="mr-2 text-2xl">{meta.emoji}</span>
              {meta.label}
            </h2>
            <p className="text-stone-500 text-sm mt-2 font-light">{meta.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400 tracking-wider">確信度</p>
            <p className={`text-lg font-light ${meta.color} mt-1`}>
              {CONFIDENCE_LABEL[result.confidence]}
            </p>
          </div>
        </div>

        {/* アクセントライン */}
        <div className={`h-0.5 w-16 ${meta.accent} rounded-full opacity-40`} />
      </div>

      {/* 説明文 */}
      <div className="mb-6 px-1">
        <p className="text-stone-600 font-light leading-relaxed text-sm">{result.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 骨格の特徴 */}
        <div className="bg-stone-50 rounded-xl p-5">
          <h3 className="text-xs tracking-[0.25em] text-stone-400 uppercase mb-4">骨格の特徴</h3>
          <ul className="space-y-2">
            {result.characteristics.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 w-1 h-1 rounded-full ${meta.accent} flex-shrink-0 opacity-60`} />
                <span className="text-stone-600 text-sm font-light leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* スタイルアドバイス */}
        <div className="bg-stone-50 rounded-xl p-5">
          <h3 className="text-xs tracking-[0.25em] text-stone-400 uppercase mb-4">スタイルアドバイス</h3>
          <ul className="space-y-2">
            {result.styleAdvice.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 w-1 h-1 rounded-full ${meta.accent} flex-shrink-0 opacity-60`} />
                <span className="text-stone-600 text-sm font-light leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 免責事項 */}
      <p className="text-xs text-stone-400 text-center leading-relaxed mb-6 font-light">
        この診断はAIによる参考情報です。骨格診断はプロのスタイリストによる対面診断が最も正確です。
      </p>

      {/* もう一度ボタン */}
      <button
        onClick={onRetry}
        className="w-full py-3 border border-stone-300 rounded-xl text-stone-500 text-sm font-light
                   tracking-widest hover:bg-stone-50 transition-colors duration-200"
      >
        もう一度診断する
      </button>
    </div>
  );
}
