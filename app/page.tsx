'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import DiagnosisButton from '@/components/DiagnosisButton';
import MonitorGate from '@/components/MonitorGate';
import { ApiResponse, BodyInfo } from '@/types';
import { getSession, getDiagnosisCount, incrementDiagnosisCount, MAX_DIAGNOSES } from '@/lib/monitor';

const LACE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Ccircle cx='10' cy='5' r='3' fill='%23FCE7F3' stroke='%23F9A8D4' stroke-width='1'/%3E%3Cline x1='0' y1='5' x2='7' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3Cline x1='13' y1='5' x2='20' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3C/svg%3E")`;

const LOADING_STEPS = [
  { label: '画像をアップロード中...', sub: 'しばらくお待ちください' },
  { label: '骨格の特徴を読み取っています...', sub: '鎖骨・膝・重心バランスを解析中' },
  { label: '骨格タイプを判定しています...', sub: 'ストレート・ウェーブ・ナチュラルを比較中' },
  { label: '診断結果を生成中...', sub: 'もうすぐ完了します' },
];

const STEP_DURATIONS = [3000, 7000, 8000, Infinity];

export default function HomePage() {
  const router = useRouter();
  const [imageData, setImageData] = useState<string | null>(null);
  const [bodyInfo, setBodyInfo] = useState<BodyInfo>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [minorBlocked, setMinorBlocked] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [diagCount, setDiagCount] = useState(() => {
    const s = getSession();
    return s ? getDiagnosisCount(s.codeId) : 0;
  });

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    let step = 0;
    const advance = () => {
      step++;
      if (step < LOADING_STEPS.length - 1) {
        setLoadingStep(step);
        timer = setTimeout(advance, STEP_DURATIONS[step]);
      } else {
        setLoadingStep(LOADING_STEPS.length - 1);
      }
    };
    let timer = setTimeout(advance, STEP_DURATIONS[0]);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleDiagnose = async () => {
    if (!imageData) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, bodyInfo }),
      });
      const json: ApiResponse = await res.json();
      if (!json.success || !json.data) {
        setErrorMsg(json.error || '診断に失敗しました');
        setLoading(false);
        return;
      }
      localStorage.setItem('diagnosisResult', JSON.stringify(json.data));
      // 診断回数インクリメント（初回のみコード消費 = 先着URLは1人1枠）
      const session = getSession();
      if (session) {
        const prevCount = getDiagnosisCount(session.codeId);
        incrementDiagnosisCount(session.codeId);
        setDiagCount(prevCount + 1);
        if (prevCount === 0) {
          fetch('/api/monitor/consume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codeId: session.codeId }),
          }).catch(() => {});
        }
      }
      router.push('/result');
    } catch {
      setErrorMsg('通信エラーが発生しました。しばらくしてから再度お試しください。');
      setLoading(false);
    }
  };

  return (
    <MonitorGate>
    <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF0F5 0%, #FDF6F9 55%, #FFF7FA 100%)' }}>

      {/* pearl lace strip */}
      <div style={{ height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }} />

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px 20px 64px' }}>

        {/* header */}
        <header style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="twinkle" style={{ color: '#F9A8D4', fontSize: '12px' }}>✦</span>
            <span className="twinkle-delay" style={{ color: '#EC4899', fontSize: '15px' }}>♡</span>
            <span className="twinkle-delay2" style={{ color: '#F9A8D4', fontSize: '12px' }}>✦</span>
          </div>

          <h1
            onClick={() => {
              if (!imageData) return;
              if (window.confirm('ファイル選択後は入力内容が破棄されます。TOPに戻りますか？')) window.location.href = '/';
            }}
            style={{ fontFamily: 'var(--font-display)', fontSize: '58px', fontWeight: 400, letterSpacing: '0.15em', color: '#9D174D', lineHeight: 1, margin: 0, marginBottom: '10px', cursor: imageData ? 'pointer' : 'default' }}
          >
            SKELÉ
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '48px', height: '1px', background: 'linear-gradient(to right, transparent, #F9A8D4)' }} />
            <span style={{ color: '#F9A8D4', fontSize: '14px', lineHeight: 1 }}>♡</span>
            <div style={{ width: '48px', height: '1px', background: 'linear-gradient(to left, transparent, #F9A8D4)' }} />
          </div>

          <p style={{ color: '#BE185D', fontSize: '13px', fontWeight: 300, lineHeight: 1.9, letterSpacing: '0.06em' }}>
            写真1枚から、あなたの骨格タイプを<br />AIが診断します
          </p>
        </header>

        {/* main card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1.5px solid #FCE7F3',
          padding: '32px 20px 24px',
          boxShadow: '0 2px 20px rgba(236,72,153,0.07), 0 0 0 5px rgba(252,231,243,0.5)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: '7px', left: '20px', right: '20px', height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center', opacity: 0.55 }} />

          <ImageUploader onImageReady={setImageData} onBodyInfoChange={setBodyInfo} onMinorBlock={setMinorBlocked} disabled={loading} />

          {errorMsg && (
            <div style={{ marginTop: '14px', padding: '16px', background: '#FFF0F5', borderRadius: '14px', border: '1.5px solid #F9A8D4' }}>
              <p style={{ color: '#BE185D', fontSize: '13px', fontWeight: 700, marginBottom: errorMsg.includes('\n') ? '10px' : 0, lineHeight: 1.6 }}>
                {errorMsg.split('\n')[0]}
              </p>
              {errorMsg.includes('\n') && (
                <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {errorMsg.split('\n').slice(1).map((line, i) => (
                    <li key={i} style={{ fontSize: '12px', color: '#9D174D', lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ color: '#F9A8D4', flexShrink: 0 }}>•</span>{line.replace(/^・/, '')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DiagnosisButton onClick={handleDiagnose} disabled={!imageData || loading || minorBlocked || diagCount >= MAX_DIAGNOSES} loading={loading} />

          {/* 診断残り回数 */}
          {(() => {
            const remaining = MAX_DIAGNOSES - diagCount;
            if (remaining <= 0) {
              return (
                <p style={{ marginTop: '10px', fontSize: '12px', color: '#BE185D', textAlign: 'center', fontWeight: 600 }}>
                  このコードの診断回数を使い切りました
                </p>
              );
            }
            return (
              <p style={{ marginTop: '10px', fontSize: '11px', color: '#F9A8D4', textAlign: 'center', letterSpacing: '0.05em' }}>
                このコードでの診断残り <strong style={{ color: '#EC4899' }}>{remaining}</strong> 回
              </p>
            );
          })()}

          <p style={{ marginTop: '8px', fontSize: '10px', color: '#a8a29e', textAlign: 'center', lineHeight: 1.8, letterSpacing: '0.02em' }}>
            アップロードされた画像はAI骨格診断の分析にのみ使用され、<br />第三者に提供されることはありません。
          </p>
        </div>

        <footer style={{ marginTop: '36px', textAlign: 'center' }}>
          <p style={{ color: '#FBCFE8', fontSize: '11px', letterSpacing: '0.15em' }}>
            ✦ © 2025 SKELÉ — AI骨格診断 ✦
          </p>
        </footer>
      </div>

      <div style={{ height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }} />

      {/* ── 診断中オーバーレイ ── */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(160deg, #FFF0F5 0%, #FDF6F9 55%, #FFF7FA 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, letterSpacing: '0.15em', color: '#9D174D', marginBottom: '32px' }}>SKELÉ</p>

          {/* スピナー */}
          <div style={{ position: 'relative', width: '64px', height: '64px', marginBottom: '32px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #FCE7F3' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#EC4899', animation: 'spin 1s linear infinite' }} />
            <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: '#F9A8D4', animation: 'spin 1.6s linear infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F9A8D4', fontSize: '18px' }}>♡</div>
          </div>

          {/* ステップメッセージ */}
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#BE185D', letterSpacing: '0.03em', textAlign: 'center', marginBottom: '8px', transition: 'opacity 0.4s' }}>
            {LOADING_STEPS[loadingStep].label}
          </p>
          <p style={{ fontSize: '12px', color: '#F9A8D4', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '36px' }}>
            {LOADING_STEPS[loadingStep].sub}
          </p>

          {/* ステップインジケーター */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {LOADING_STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === loadingStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '99px',
                background: i <= loadingStep ? '#EC4899' : '#FCE7F3',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>

          <p style={{ marginTop: '40px', fontSize: '11px', color: '#FBCFE8', letterSpacing: '0.08em' }}>
            通常20〜30秒かかります
          </p>
        </div>
      )}
    </main>
    </MonitorGate>
  );
}
