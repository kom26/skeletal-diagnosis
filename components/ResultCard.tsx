'use client';

import { useState } from 'react';
import { DiagnosisResult, BodyType } from '@/types';
import MyInvites from '@/components/MyInvites';

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

const ALL_TYPES: BodyType[] = ['straight', 'wave', 'natural'];

const BOLD_KEYWORDS = [
  '骨格ストレート', '骨格ウェーブ', '骨格ナチュラル',
  '上半身', '下半身', '鎖骨', 'バスト', 'ウエスト', 'ヒップ', '太もも', 'お尻', '肩幅',
  '重心', '筋肉', '脂肪', 'フレーム', '骨格',
];

const ARU_ARU: Record<BodyType, { items: string[]; sympathy: string }> = {
  straight: {
    items: [
      '食べてないのに上半身だけ太る気がする…',
      'ウエストがなかなか細くならない',
      'ダイエットすると顔と下半身から痩せて上半身が最後になる',
    ],
    sympathy: '上半身に肉がつきやすいのはストレートの骨格構造が原因。筋肉量が多く上半身にボリュームが集まりやすい構造のため、頑張っても変わりにくいのは"骨格のせい"で合ってます。無理なダイエットより、骨格に合った着こなしで今すぐスッキリ見せるほうが近道です。',
  },
  wave: {
    items: [
      '上半身は細いのに下半身だけ太る気がする…',
      'ダイエットしてもお尻・太ももだけ最後まで残る',
      '立っていると脚が短く・下重心に見えやすい',
    ],
    sympathy: '下半身に脂肪がつきやすいのはウェーブ骨格の重心バランスが原因。骨格の構造上、下半身に重心が集まりやすいため、頑張っても"下半身だけ残る"のはある意味仕方ない部分があります。着こなしで上半身にボリュームを出すことでバランスを整えられます。',
  },
  natural: {
    items: [
      '痩せているのに肩や骨格がしっかり見える…',
      '実は細いのにゴツく見られがち',
      'ダイエットしても骨感が出るだけで華奢に見えない',
    ],
    sympathy: 'がっしり・骨っぽく見えるのはナチュラルのフレーム感から来るもの。骨格のフレーム自体は変えられないため、どれだけ体重を落としても"大きく見える"と感じるのはある意味骨格のせい。でも着こなし次第でスッキリ・こなれた印象に変えられます。',
  },
};

function parseBold(text: string): React.ReactNode {
  const sorted = [...BOLD_KEYWORDS].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        sorted.includes(part)
          ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong>
          : part
      )}
    </>
  );
}

interface Props {
  result: DiagnosisResult;
  onRetry: () => void;
}

export default function ResultCard({ result, onRetry }: Props) {
  const meta = TYPE_META[result.bodyType];
  const aruAru = ARU_ARU[result.bodyType];
  const [showTips, setShowTips] = useState(false);
  const hasTips = (result.confidence === 'medium' || result.confidence === 'low')
    && result.confidenceTips && result.confidenceTips.length > 0;

  const CONF_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };
  const confidenceLabel = CONF_LABEL[result.confidence as string] ?? '中';

  const sortedTypes = [...ALL_TYPES].sort(
    (a, b) => (result.scores?.[b] ?? 0) - (result.scores?.[a] ?? 0)
  );

  return (
    <div style={{ width: '100%' }}>

      {/* ── Section 1: 骨格タイプ ── */}
      <div style={{ background: meta.bg, borderRadius: '18px', padding: '24px 20px 20px', marginBottom: '16px', border: `1px solid ${meta.accentColor}30` }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: meta.accentColor, marginBottom: '8px', marginTop: 0 }}>
          ✦ Diagnosis Result ✦
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: meta.titleColor, letterSpacing: '0.05em', lineHeight: 1.2, margin: '0 0 6px' }}>
          {meta.label}
        </h2>
        <p style={{ fontSize: '13px', color: meta.titleColor, opacity: 0.75, margin: '0 0 18px', fontWeight: 400, letterSpacing: '0.03em' }}>
          {meta.tagline}
        </p>

        <div style={{ height: '1px', background: `linear-gradient(to right, ${meta.accentColor}60, transparent)`, marginBottom: '16px' }} />

        {/* 信頼度 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', color: meta.titleColor, opacity: 0.6, letterSpacing: '0.08em' }}>この画像からの信頼度</span>
              <span style={{ fontSize: '10px', color: meta.titleColor, opacity: 0.4, display: 'block', marginTop: '1px' }}>服装・角度・体型の見えやすさで評価</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em',
                color: meta.accentColor,
                background: `${meta.accentColor}18`,
                padding: '4px 14px',
                borderRadius: '99px',
                border: `1px solid ${meta.accentColor}40`,
              }}>{confidenceLabel}</span>
              {hasTips && (
                <button
                  onClick={() => setShowTips(!showTips)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: showTips ? '#F59E0B' : '#FEF3C7',
                    border: '1.5px solid #F59E0B',
                    color: showTips ? '#fff' : '#B45309',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >?</button>
              )}
            </div>
          </div>

          {hasTips && showTips && (
            <div style={{ marginTop: '12px', background: '#FFFBEB', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #FDE68A' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#B45309', letterSpacing: '0.08em' }}>
                📷 精度を上げるには
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.confidenceTips!.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.75 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* スコアバー */}
        {result.scores && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedTypes.map((t) => {
              const m = TYPE_META[t];
              const pct = result.scores?.[t] ?? 0;
              const isTop = t === result.bodyType;
              return (
                <div key={t}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: m.titleColor, fontWeight: isTop ? 700 : 500, opacity: isTop ? 1 : 0.65 }}>{m.label}</span>
                    <span style={{ fontSize: '11px', color: m.titleColor, fontWeight: isTop ? 700 : 400, opacity: isTop ? 1 : 0.65 }}>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '99px', background: `${m.accentColor}20`, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: isTop ? m.accentColor : `${m.accentColor}60`,
                      borderRadius: '99px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: この写真から読み取れた特徴 ── */}
      {result.observations && result.observations.length > 0 && (
        <div style={{ background: meta.bg, borderRadius: '14px', padding: '18px 18px', marginBottom: '16px', border: `1px solid ${meta.accentColor}30` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: meta.accentColor, margin: '0 0 3px' }}>
            📸 この写真から読み取れた特徴
          </p>
          <p style={{ fontSize: '11px', color: meta.titleColor, opacity: 0.55, margin: '0 0 14px', letterSpacing: '0.03em' }}>
            AIが実際の写真から確認した骨格的特徴です
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.observations.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.accentColor, flexShrink: 0, marginTop: '7px' }} />
                <span style={{ fontSize: '13px', color: '#5C4658', lineHeight: 1.75 }}>{parseBold(o)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 3: 骨格の特徴 ── */}
      <div style={{ background: '#FFF5F8', borderRadius: '14px', padding: '18px 18px', marginBottom: '16px', border: '1px solid #FCE7F3' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: meta.accentColor, margin: '0 0 14px' }}>
          ✦ 骨格の特徴
        </p>

        <p style={{ fontSize: '13px', lineHeight: 1.9, color: '#5C4658', margin: '0 0 14px', padding: 0 }}>
          {parseBold(result.description)}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {result.characteristics.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.accentColor, flexShrink: 0, marginTop: '7px' }} />
              <span style={{ fontSize: '13px', color: '#5C4658', lineHeight: 1.75 }}>{parseBold(c)}</span>
            </div>
          ))}
        </div>

        <div style={{ height: '1px', background: '#FCE7F3', marginBottom: '16px' }} />

        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', color: meta.accentColor, margin: '0 0 10px' }}>
          💬 あるある
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
          {aruAru.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{
                background: meta.accentColor,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '99px',
                flexShrink: 0,
                letterSpacing: '0.03em',
                lineHeight: 1.6,
              }}>わかる</span>
              <span style={{ fontSize: '12px', color: meta.titleColor, lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ background: `${meta.accentColor}0D`, borderRadius: '10px', padding: '12px 14px', border: `1px solid ${meta.accentColor}28` }}>
          <span style={{ fontSize: '12px', color: '#5C4658', lineHeight: 1.85 }}>{parseBold(aruAru.sympathy)}</span>
        </div>
      </div>

      {/* ── Section 4: スタイルアドバイス ── */}
      <div style={{ background: '#FFF5F8', borderRadius: '14px', padding: '18px 18px', marginBottom: '16px', border: '1px solid #FCE7F3' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: meta.accentColor, margin: '0 0 14px' }}>
          ✨ スタイルアドバイス
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.styleAdvice.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.accentColor, flexShrink: 0, marginTop: '7px' }} />
              <span style={{ fontSize: '13px', color: '#5C4658', lineHeight: 1.75 }}>{parseBold(s)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 5: あなたの招待 ── */}
      <MyInvites />

      {/* 免責 */}
      <p style={{ fontSize: '11px', color: '#F9A8D4', textAlign: 'center', lineHeight: 1.8, margin: '24px 0 20px' }}>
        ♡ この診断はAIによる参考情報です ♡<br />
        <span style={{ color: '#FBCFE8' }}>プロのスタイリストによる対面診断が最も正確です</span>
      </p>

      {/* もう一度ボタン */}
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

      {/* ── 信頼度が中・低の場合：精度を上げるコツ ── */}
      {hasTips && (
        <div style={{ marginTop: '16px', background: '#FFFBEB', borderRadius: '14px', padding: '18px 18px', border: '1.5px solid #FDE68A' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: '#B45309', margin: '0 0 4px' }}>
            📷 次回の診断精度を上げるには
          </p>
          <p style={{ fontSize: '11px', color: '#92400E', opacity: 0.7, margin: '0 0 14px', letterSpacing: '0.03em' }}>
            今回の写真でこれらが確認しにくかったため、信頼度が下がりました
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.confidenceTips!.map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.8 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
