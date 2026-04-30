'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import DiagnosisButton from '@/components/DiagnosisButton';
import { ApiResponse, BodyInfo } from '@/types';

const LACE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Ccircle cx='10' cy='5' r='3' fill='%23FCE7F3' stroke='%23F9A8D4' stroke-width='1'/%3E%3Cline x1='0' y1='5' x2='7' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3Cline x1='13' y1='5' x2='20' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3C/svg%3E")`;

export default function HomePage() {
  const router = useRouter();
  const [imageData, setImageData] = useState<string | null>(null);
  const [bodyInfo, setBodyInfo] = useState<BodyInfo>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [minorBlocked, setMinorBlocked] = useState(false);

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
      router.push('/result');
    } catch {
      setErrorMsg('通信エラーが発生しました。しばらくしてから再度お試しください。');
      setLoading(false);
    }
  };

  return (
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

          {/* elegant divider */}
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
          {/* lace inside card top */}
          <div style={{ position: 'absolute', top: '7px', left: '20px', right: '20px', height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center', opacity: 0.55 }} />

          <ImageUploader onImageReady={setImageData} onBodyInfoChange={setBodyInfo} onMinorBlock={setMinorBlocked} disabled={loading} />

          {errorMsg && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: '#FFF0F5', borderRadius: '12px', border: '1px solid #FCE7F3' }}>
              <p style={{ color: '#BE185D', fontSize: '13px', textAlign: 'center', lineHeight: 1.6 }}>{errorMsg}</p>
            </div>
          )}

          <DiagnosisButton onClick={handleDiagnose} disabled={!imageData || loading || minorBlocked} loading={loading} />

          <p style={{ marginTop: '14px', fontSize: '10px', color: '#a8a29e', textAlign: 'center', lineHeight: 1.8, letterSpacing: '0.02em' }}>
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
    </main>
  );
}
