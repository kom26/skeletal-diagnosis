'use client';

import { useState, useEffect } from 'react';
import { MONITOR_MODE, getSession, saveSession, MAX_DIAGNOSES } from '@/lib/monitor';

const LACE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Ccircle cx='10' cy='5' r='3' fill='%23FCE7F3' stroke='%23F9A8D4' stroke-width='1'/%3E%3Cline x1='0' y1='5' x2='7' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3Cline x1='13' y1='5' x2='20' y2='5' stroke='%23F9A8D4' stroke-width='0.8'/%3E%3C/svg%3E")`;

interface Props { children: React.ReactNode; }

export default function MonitorGate({ children }: Props) {
  const [status, setStatus] = useState<'checking' | 'gate' | 'ok'>('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!MONITOR_MODE) { setStatus('ok'); return; }

    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      const session = getSession();
      // 同じトークンで既にセッション確立済みなら再検証不要（2回目アクセス対応）
      if (session && session.code === token.toUpperCase().trim()) {
        setStatus('ok');
        return;
      }
      // 別のトークン or 未セッション → 検証
      validate(token, true);
      return;
    }

    if (getSession()) { setStatus('ok'); return; }

    setStatus('gate');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = async (input: string, fromUrl = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/monitor/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input.toUpperCase().trim() }),
      });
      const json = await res.json();
      if (!json.valid) {
        setError(json.error ?? '無効なコードです');
        setStatus('gate');
        return;
      }
      saveSession({ codeId: json.codeId, code: input.toUpperCase().trim(), childInvites: json.childInvites });
      if (fromUrl && window.history.replaceState) {
        const u = new URL(window.location.href);
        u.searchParams.delete('token');
        window.history.replaceState({}, '', u.toString());
      }
      setStatus('ok');
    } catch {
      setError('通信エラーが発生しました');
      setStatus('gate');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF0F5 0%, #FDF6F9 55%, #FFF7FA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid #FCE7F3', borderTop: '2px solid #EC4899', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
    </main>
  );

  if (status === 'ok') return <>{children}</>;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFF0F5 0%, #FDF6F9 55%, #FFF7FA 100%)' }}>
      <div style={{ height: '10px', backgroundImage: LACE_SVG, backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }} />

      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '52px', fontWeight: 400, letterSpacing: '0.15em', color: '#9D174D', margin: '0 0 12px' }}>SKELÉ</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, #F9A8D4)' }} />
            <span style={{ color: '#F9A8D4', fontSize: '14px' }}>♡</span>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, transparent, #F9A8D4)' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#BE185D', letterSpacing: '0.2em' }}>MONITOR PREVIEW</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', border: '1.5px solid #FCE7F3', padding: '28px 24px', boxShadow: '0 2px 20px rgba(236,72,153,0.07)' }}>
          <p style={{ fontSize: '13px', color: '#9D174D', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>モニター招待コード</p>
          <p style={{ fontSize: '11px', color: '#a8a29e', lineHeight: 1.7, marginBottom: '6px' }}>
            招待コードをお持ちの方のみご利用いただけます。<br />URLから直接アクセスの方はコード入力不要です。
          </p>
          <div style={{ background: '#FFF0F5', borderRadius: '8px', padding: '8px 12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#EC4899', fontSize: '12px' }}>♡</span>
            <p style={{ margin: 0, fontSize: '11px', color: '#BE185D', lineHeight: 1.6 }}>
              1コードにつき<strong>{MAX_DIAGNOSES}回</strong>まで診断できます
            </p>
          </div>

          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && !loading && code.trim() && validate(code)}
            placeholder="XXXXXX"
            maxLength={6}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '14px 16px', fontSize: '20px', fontWeight: 700,
              letterSpacing: '0.3em', textAlign: 'center',
              border: '1.5px solid #FCE7F3', borderRadius: '12px',
              outline: 'none', color: '#9D174D', background: '#FFF0F5',
              marginBottom: '10px',
            }}
          />

          {error && (
            <p style={{ fontSize: '12px', color: '#BE185D', textAlign: 'center', marginBottom: '10px', lineHeight: 1.6 }}>{error}</p>
          )}

          <button
            onClick={() => validate(code)}
            disabled={loading || code.trim().length === 0}
            style={{
              width: '100%', padding: '14px',
              background: code.trim().length === 0 ? '#FCE7F3' : 'linear-gradient(135deg, #F9A8D4, #EC4899)',
              color: code.trim().length === 0 ? '#F9A8D4' : '#fff',
              border: 'none', borderRadius: '50px',
              fontSize: '13px', fontWeight: 600, letterSpacing: '0.15em',
              cursor: code.trim().length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: code.trim().length === 0 ? 'none' : '0 4px 18px rgba(190,24,93,0.25)',
            }}
          >
            {loading ? '確認中...' : '入場する ♡'}
          </button>
        </div>
      </div>
    </main>
  );
}
