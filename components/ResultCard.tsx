'use client';

import { useState } from 'react';
import { DiagnosisResult, BodyType } from '@/types';

const TYPE_META: Record<BodyType, {
  label: string;
  bg: string;
  badgeBg: string;
  titleColor: string;
  accentColor: string;
  tagline: string;
}> = {
  straight: {
    label: '骨格ストレート',
    bg: '#FFF0F5',
    badgeBg: '#FCE7F3',
    titleColor: '#9D174D',
    accentColor: '#EC4899',
    tagline: 'メリハリのある立体的なボディライン',
  },
  wave: {
    label: '骨格ウェーブ',
    bg: '#FDF4FF',
    badgeBg: '#F3E8FF',
    titleColor: '#7E22CE',
    accentColor: '#A855F7',
    tagline: '柔らかく曲線的なフェミニンライン',
  },
  natural: {
    label: '骨格ナチュラル',
    bg: '#FFF1F2',
    badgeBg: '#FFE4E6',
    titleColor: '#9F1239',
    accentColor: '#F43F5E',
    tagline: '骨感のあるスタイリッシュなフレーム',
  },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; filled: number; pct: string }> = {
  high:   { label: '高い',   filled: 3, pct: '90%以上' },
  medium: { label: 'やや高い', filled: 2, pct: '70%程度' },
  low:    { label: '参考値',  filled: 1, pct: '50%程度' },
};

interface Props {
  result: DiagnosisResult;
  onRetry: () => void;
}

export default function ResultCard({ result, onRetry }: Props) {
  const meta = TYPE_META[result.bodyType];
  const conf = CONFIDENCE_CONFIG[result.confidence] ?? CONFIDENCE_CONFIG.medium;
  const [showOthers, setShowOthers] = useState(false);

  const otherTypes = (['straight', 'wave', 'natural'] as BodyType[])
    .filter((t) => t !== result.bodyType)
    .sort((a, b) => (result.scores?.[b] ?? 0) - (result.scores?.[a] ?? 0));

  return (
    <div style={{ width: '100%' }}>

      {/* ── タイプバナー ── */}
      <div style={{ background: meta.bg, borderRadius: '18px', padding: '24px 20px 20px', marginBottom: '20px', border: `1px solid ${meta.accentColor}30` }}>

        {/* ラベル */}
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: meta.accentColor, marginBottom: '8px', marginTop: 0 }}>
          ✦ Diagnosis Result ✦
        </p>

        {/* タイプ名 */}
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: meta.titleColor, letterSpacing: '0.05em', lineHeight: 1.2, margin: '0 0 6px' }}>
          {meta.label}
        </h2>
        <p style={{ fontSize: '13px', color: meta.titleColor, opacity: 0.75, margin: '0 0 18px', fontWeight: 400, letterSpacing: '0.03em' }}>
          {meta.tagline}
        </p>

        {/* 区切り線 */}
        <div style={{ height: '1px', background: `linear-gradient(to right, ${meta.accentColor}60, transparent)`, marginBottom: '16px' }} />

        {/* 信頼度 + メインスコア */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: result.scores ? '14px' : '0' }}>
          <p style={{ fontSize: '11px', color: meta.titleColor, opacity: 0.6, margin: 0, letterSpacing: '0.08em' }}>AI判定の信頼度</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ width: '10px', height: '10px', borderRadius: '50%', background: n <= conf.filled ? meta.accentColor : `${meta.accentColor}30` }} />
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: meta.titleColor }}>{conf.label}</span>
              {result.scores && (
                <span style={{ fontSize: '13px', fontWeight: 700, color: meta.accentColor, marginLeft: '8px' }}>
                  {result.scores[result.bodyType]}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 他のタイプのスコアバー（折りたたみ） */}
        {result.scores && (
          <>
            <button
              onClick={() => setShowOthers((v) => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', color: meta.accentColor, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              他の可能性を見る {showOthers ? '▲' : '▼'}
            </button>
            {showOthers && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {otherTypes.map((t) => {
                  const m = TYPE_META[t];
                  const pct = result.scores?.[t] ?? 0;
                  return (
                    <div key={t}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: m.titleColor, fontWeight: 600 }}>{m.label}</span>
                        <span style={{ fontSize: '11px', color: m.titleColor }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '99px', background: `${m.accentColor}20`, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: m.accentColor, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 説明文 ── */}
      <p style={{ fontSize: '13px', lineHeight: 1.9, color: '#5C4658', margin: '0 0 20px', padding: '0 2px' }}>
        {result.description}
      </p>

      {/* ── 写真から読み取れた特徴 ── */}
      {result.observations && result.observations.length > 0 && (
        <div style={{ background: meta.bg, borderRadius: '14px', padding: '18px 18px', marginBottom: '14px', border: `1px solid ${meta.accentColor}30` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: meta.accentColor, margin: '0 0 6px' }}>
            📸 この写真から読み取れた特徴
          </p>
          <p style={{ fontSize: '11px', color: meta.titleColor, opacity: 0.6, margin: '0 0 14px', letterSpacing: '0.03em' }}>
            AIが実際の写真から確認した骨格的特徴です
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.observations.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.accentColor, flexShrink: 0, marginTop: '6px' }} />
                <span style={{ fontSize: '13px', color: '#5C4658', lineHeight: 1.75 }}>{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 骨格の特徴 ── */}
      <div style={{ background: '#FFF5F8', borderRadius: '14px', padding: '18px 18px', marginBottom: '14px', border: '1px solid #FCE7F3' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: meta.accentColor, margin: '0 0 14px' }}>
          骨格の特徴
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.characteristics.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.accentColor, flexShrink: 0, marginTop: '6px' }} />
              <span style={{ fontSize: '13px', color: '#5C4658', lineHeight: 1.75 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── スタイルアドバイス ── */}
      <div style={{ background: '#FFF5F8', borderRadius: '14px', padding: '18px 18px', marginBottom: '24px', border: '1px solid #FCE7F3' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: meta.accentColor, margin: '0 0 14px' }}>
          スタイルアドバイス
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.styleAdvice.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.accentColor, flexShrink: 0, marginTop: '6px' }} />
              <span style={{ fontSize: '13px', color: '#5C4658', lineHeight: 1.75 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 免責 ── */}
      <p style={{ fontSize: '11px', color: '#F9A8D4', textAlign: 'center', lineHeight: 1.8, margin: '0 0 20px' }}>
        ♡ この診断はAIによる参考情報です ♡<br />
        <span style={{ color: '#FBCFE8' }}>プロのスタイリストによる対面診断が最も正確です</span>
      </p>

      {/* ── もう一度ボタン ── */}
      <button
        onClick={onRetry}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '50px',
          border: '1.5px solid #FCE7F3',
          background: 'white',
          color: '#EC4899',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.15em',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF0F5'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
      >
        ♡ もう一度診断する ♡
      </button>
    </div>
  );
}
