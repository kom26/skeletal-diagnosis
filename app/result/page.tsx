'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ResultCard from '@/components/ResultCard';
import MyInvites from '@/components/MyInvites';
import { DiagnosisResult, BodyType } from '@/types';

const BASE_DEV: Record<BodyType, number> = {
  straight: 10,   // +: 上半身寄り
  wave:    -12,   // −: 下半身寄り
  natural:   0,   // 中心
};

const RULER_TICKS = [-40, -30, -20, -10, 0, 10, 20, 30, 40];

function computeDeviation(result: DiagnosisResult): number {
  const base = BASE_DEV[result.bodyType];
  const dir  = Math.sign(base);
  const confAdj = result.confidence === 'high' ? dir * 2
                : result.confidence === 'low'  ? dir * -3
                : 0;
  // scores の値からブレを決定論的に生成（−3〜+3）
  const hash = ((result.scores.straight * 7 + result.scores.wave * 11 + result.scores.natural * 3) % 7) - 3;
  return base + confAdj + hash;
}

const LACE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Ccircle cx='10' cy='5' r='3' fill='%23FCE7F3' stroke='%23F9A8D4' stroke-width='1'/%3E%3Cline x1='0' y1='5' x2='7' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3Cline x1='13' y1='5' x2='20' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3C/svg%3E")`;

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [animDev, setAnimDev] = useState(0);
  const rafRef      = useRef<number | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lineRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('diagnosisResult');
    if (!stored) { router.replace('/'); return; }
    try {
      const parsed = JSON.parse(stored) as DiagnosisResult;
      setResult(parsed);
      setPreviewImage(localStorage.getItem('previewImage'));
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!result || !previewImage) return;
    const finalDev = computeDeviation(result);
    const targetY  = Math.max(5, Math.min(95, 50 - finalDev));

    // elastic-out easing (easeOutElastic)
    const ease = (p: number) => {
      if (p === 0 || p === 1) return p;
      const c = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c) + 1;
    };

    let lastDev = 0;
    const t = setTimeout(() => {
      const startTime = performance.now();
      const duration  = 1100;
      const frame = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const currentY = 50 + (targetY - 50) * ease(progress);
        const topStr = `${currentY}%`;
        if (indicatorRef.current) indicatorRef.current.style.top = topStr;
        if (lineRef.current)      lineRef.current.style.top      = topStr;
        const d = Math.round(50 - currentY);
        if (d !== lastDev) { lastDev = d; setAnimDev(d); }
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          setAnimDev(finalDev);
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    }, 350);

    return () => {
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [result, previewImage]);

  const handleRetry = () => {
    localStorage.removeItem('diagnosisResult');
    localStorage.removeItem('previewImage');
    router.push('/');
  };

  if (!result) {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF0F5 0%, #FDF6F9 55%, #FFF7FA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid #FCE7F3', borderTop: '2px solid #EC4899', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: '#F9A8D4', fontSize: '12px', letterSpacing: '0.1em' }}>診断中…</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF0F5 0%, #FDF6F9 55%, #FFF7FA 100%)' }}>

      <div style={{ height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }} />

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 20px 64px' }}>

        {/* header */}
        <header style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            onClick={() => {
              if (window.confirm('入力内容が破棄されます。TOPに戻りますか？')) router.push('/');
            }}
            style={{ fontFamily: 'var(--font-display)', fontSize: '46px', fontWeight: 400, letterSpacing: '0.15em', color: '#9D174D', lineHeight: 1, margin: 0, marginBottom: '10px', cursor: 'pointer' }}
          >
            SKELÉ
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, #F9A8D4)' }} />
            <span style={{ color: '#F9A8D4', fontSize: '14px' }}>♡</span>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, transparent, #F9A8D4)' }} />
          </div>
          <p style={{ color: '#BE185D', fontSize: '11px', letterSpacing: '0.25em' }}>DIAGNOSIS RESULT</p>
        </header>

        {/* preview image + 重心インジケーター */}
        {previewImage && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'relative', width: '62%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt="診断画像" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '20px', border: '2px solid #FCE7F3', boxShadow: '0 4px 20px rgba(236,72,153,0.10)' }} />

              {/* 水平ライン（均一・画像全幅） */}
              <div ref={lineRef} style={{
                position: 'absolute', top: '50%', left: 0, right: 0,
                height: '1.5px', pointerEvents: 'none',
                background: 'rgba(236,72,153,0.55)',
                transform: 'translateY(-50%)',
              }} />

              {/* 目盛り（左側） */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '-28px', width: '28px', pointerEvents: 'none' }}>
                {/* 縦線（右端 = 画像左端） */}
                <div style={{ position: 'absolute', right: 0, top: '4%', bottom: '4%', width: '1.5px', background: 'linear-gradient(to bottom, transparent, #F9A8D4 12%, #F9A8D4 88%, transparent)' }} />
                {/* 目盛り（右端から左へ伸びる） */}
                {RULER_TICKS.map(v => {
                  const isCenter = v === 0;
                  return (
                    <div key={v} style={{ position: 'absolute', top: `${50 - v}%`, right: '1px', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
                      <div style={{ width: isCenter ? '10px' : '6px', height: isCenter ? '2px' : '1.5px', background: isCenter ? '#EC4899' : '#F9A8D4', borderRadius: '1px', flexShrink: 0 }} />
                      {isCenter && <span style={{ fontSize: '9px', color: '#EC4899', marginRight: '3px', fontWeight: 700, lineHeight: 1 }}>0</span>}
                    </div>
                  );
                })}
              </div>

              {/* ◀ インジケーター（右側） */}
              <div ref={indicatorRef} style={{
                position: 'absolute', top: '50%', right: '-60px',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', gap: '3px',
                pointerEvents: 'none',
              }}>
                <span style={{ color: '#EC4899', fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>◀</span>
                <div>
                  <div style={{ fontSize: '8px', color: '#BE185D', whiteSpace: 'nowrap', lineHeight: 1.4, letterSpacing: '0.03em' }}>重心の高さ</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#BE185D', whiteSpace: 'nowrap', lineHeight: 1.1, textAlign: 'center' }}>
                    {`${animDev > 0 ? '+' : ''}${animDev}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* result card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1.5px solid #FCE7F3',
          padding: '32px 20px 24px',
          boxShadow: '0 2px 20px rgba(236,72,153,0.07), 0 0 0 5px rgba(252,231,243,0.5)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: '7px', left: '20px', right: '20px', height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center', opacity: 0.55 }} />
          <div style={{ paddingTop: '8px' }}>
            <ResultCard result={result} onRetry={handleRetry} />
          </div>
        </div>

        <MyInvites />

        <footer style={{ marginTop: '36px', textAlign: 'center' }}>
          <p style={{ color: '#FBCFE8', fontSize: '11px', letterSpacing: '0.15em' }}>
            ✦ © 2025 SKELÉ — AI骨格診断 ✦
          </p>
        </footer>
      </div>

      <div style={{ height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }} />
    </main>
  );
}
