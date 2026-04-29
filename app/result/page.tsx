'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ResultCard from '@/components/ResultCard';
import { DiagnosisResult } from '@/types';

const LACE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Ccircle cx='10' cy='5' r='3' fill='%23FCE7F3' stroke='%23F9A8D4' stroke-width='1'/%3E%3Cline x1='0' y1='5' x2='7' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3Cline x1='13' y1='5' x2='20' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3C/svg%3E")`;

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('diagnosisResult');
    if (!stored) { router.replace('/'); return; }
    try {
      setResult(JSON.parse(stored));
      setPreviewImage(sessionStorage.getItem('previewImage'));
    } catch {
      router.replace('/');
    }
  }, [router]);

  const handleRetry = () => {
    sessionStorage.removeItem('diagnosisResult');
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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '46px', fontWeight: 400, letterSpacing: '0.15em', color: '#9D174D', lineHeight: 1, margin: 0, marginBottom: '10px' }}>
            SKELÉ
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, #F9A8D4)' }} />
            <span style={{ color: '#F9A8D4', fontSize: '14px' }}>♡</span>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, transparent, #F9A8D4)' }} />
          </div>
          <p style={{ color: '#BE185D', fontSize: '11px', letterSpacing: '0.25em' }}>DIAGNOSIS RESULT</p>
        </header>

        {/* preview image */}
        {previewImage && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="診断画像"
              style={{
                width: '75%',
                height: 'auto',
                display: 'block',
                borderRadius: '20px',
                border: '2px solid #FCE7F3',
                boxShadow: '0 4px 20px rgba(236,72,153,0.10)',
              }}
            />
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
