'use client';

import { useState } from 'react';
import { DiagnosisLog, DiagnosisErrorLog } from '@/types';

type LogWithImage = DiagnosisLog & { signed_url: string | null };

const TYPE_LABELS: Record<string, string> = {
  straight: '骨格ストレート',
  wave:     '骨格ウェーブ',
  natural:  '骨格ナチュラル',
  error:    'AI エラー',
};

const TYPE_COLOR: Record<string, string> = {
  straight: '#EC4899',
  wave:     '#A855F7',
  natural:  '#F43F5E',
  error:    '#9CA3AF',
};

const TYPE_BG: Record<string, string> = {
  straight: 'rgba(236,72,153,0.08)',
  wave:     'rgba(168,85,247,0.08)',
  natural:  'rgba(244,63,94,0.08)',
  error:    'rgba(156,163,175,0.12)',
};

function isErrorLog(log: LogWithImage): boolean {
  return log.result_type === 'error';
}

function getErrorDetail(log: LogWithImage): DiagnosisErrorLog | null {
  if (!isErrorLog(log) || !log.result_json) return null;
  const j = log.result_json as DiagnosisErrorLog;
  return j.code ? j : null;
}

function StatusBadge({ log }: { log: LogWithImage }) {
  if (isErrorLog(log)) {
    return (
      <span style={{ background: 'rgba(156,163,175,0.7)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>
        AI エラー
      </span>
    );
  }
  if (!log.admin_feedback) {
    return (
      <span style={{ background: 'rgba(0,0,0,0.55)', color: '#d4d4d4', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>
        未判定
      </span>
    );
  }
  if (log.admin_feedback === 'correct') {
    return (
      <span style={{ background: 'rgba(22,163,74,0.85)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>
        ✓ 正解
      </span>
    );
  }
  return (
    <span style={{ background: 'rgba(234,88,12,0.85)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>
      → {TYPE_LABELS[log.admin_feedback] ?? log.admin_feedback}
    </span>
  );
}

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [logs, setLogs] = useState<LogWithImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LogWithImage | null>(null);

  const fetchLogs = async (k: string) => {
    const res = await fetch('/api/admin/logs', { headers: { 'x-admin-key': k } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.logs as LogWithImage[];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = await fetchLogs(key);
    if (!data) { setError('認証に失敗しました'); setLoading(false); return; }
    setLogs(data);
    setAdminKey(key);
    setAuthed(true);
    setLoading(false);
  };

  const handleFeedback = async (id: string, feedback: string) => {
    await fetch('/api/admin/logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ id, admin_feedback: feedback }),
    });
    const updated = (prev: LogWithImage[]) =>
      prev.map((l) => l.id === id ? { ...l, admin_feedback: feedback } : l);
    setLogs(updated);
    setSelected((prev) => prev?.id === id ? { ...prev, admin_feedback: feedback } : prev);
  };

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e7e5e4', padding: '32px 28px', width: '100%', maxWidth: '360px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#1c1917', marginBottom: '24px', textAlign: 'center', letterSpacing: '0.1em' }}>Admin</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="管理者キー"
              style={{ border: '1px solid #d6d3d1', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '12px', background: '#1c1917', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const pending    = logs.filter((l) => !isErrorLog(l) && !l.admin_feedback).length;
  const errorCount = logs.filter(isErrorLog).length;

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f4', padding: '24px 16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1c1917', margin: 0 }}>診断ログ</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {errorCount > 0 && (
              <span style={{ fontSize: '12px', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '99px' }}>
                エラー {errorCount}件
              </span>
            )}
            <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '99px' }}>
              未判定 {pending}件
            </span>
            <span style={{ fontSize: '12px', color: '#a8a29e' }}>{logs.length}件</span>
          </div>
        </div>

        {/* 3カラムグリッド */}
        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#a8a29e', padding: '60px 0' }}>ログがありません</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {logs.map((log) => {
              const accentColor = TYPE_COLOR[log.result_type] ?? '#a8a29e';
              const isErr = isErrorLog(log);
              const isReviewed = !isErr && !!log.admin_feedback;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelected(log)}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: isErr ? '#f3f4f6' : '#e7e5e4',
                    aspectRatio: '3 / 4',
                    border: isReviewed ? '2px solid transparent' : `2px solid ${accentColor}60`,
                    boxShadow: selected?.id === log.id ? `0 0 0 3px ${accentColor}` : 'none',
                  }}
                >
                  {log.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={log.signed_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isErr ? 'grayscale(40%)' : 'none' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e', fontSize: '11px' }}>
                      No image
                    </div>
                  )}

                  {/* エラー時はバツ印オーバーレイ */}
                  {isErr && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)' }}>
                      <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>×</span>
                    </div>
                  )}

                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.72))', padding: '20px 8px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '0.03em', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      {TYPE_LABELS[log.result_type] ?? log.result_type}
                    </span>
                    <StatusBadge log={log} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 詳細モーダル ── */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#a8a29e' }}>{new Date(selected.created_at).toLocaleString('ja-JP')}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#a8a29e', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* 画像 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              {selected.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.signed_url}
                  alt="診断画像"
                  style={{ width: '75%', height: 'auto', display: 'block', borderRadius: '14px', border: '1px solid #e7e5e4', filter: isErrorLog(selected) ? 'grayscale(30%)' : 'none' }}
                />
              ) : (
                <div style={{ width: '75%', aspectRatio: '3/4', background: '#f5f5f4', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e', fontSize: '12px' }}>
                  No image
                </div>
              )}
            </div>

            {isErrorLog(selected) ? (
              /* ── エラーログの詳細 ── */
              <>
                <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #fecaca' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px', letterSpacing: '0.05em' }}>AI診断結果</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>AI エラー</p>
                  {getErrorDetail(selected) && (
                    <p style={{ fontSize: '11px', color: '#ef4444', margin: '0 0 4px' }}>
                      コード: {getErrorDetail(selected)!.code}
                    </p>
                  )}
                  {getErrorDetail(selected) && (
                    <p style={{ fontSize: '11px', color: '#78716c', margin: 0 }}>
                      {getErrorDetail(selected)!.error}
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '6px', marginBottom: 0 }}>
                    IP: {selected.ip_address}
                  </p>
                </div>

                {/* エラー画像への手動判定 */}
                <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '10px', letterSpacing: '0.05em' }}>目視で骨格タイプを判定</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['straight', 'wave', 'natural'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleFeedback(selected.id, t)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '10px',
                        background: selected.admin_feedback === t ? TYPE_COLOR[t] : TYPE_BG[t],
                        color: selected.admin_feedback === t ? '#fff' : TYPE_COLOR[t],
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: `1.5px solid ${TYPE_COLOR[t]}40`,
                      } as React.CSSProperties}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* ── 通常ログの詳細 ── */
              <>
                <div style={{ background: '#fafaf9', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #e7e5e4' }}>
                  <p style={{ fontSize: '12px', color: '#a8a29e', margin: '0 0 6px', letterSpacing: '0.05em' }}>AI判定</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: (TYPE_COLOR as Record<string, string>)[selected.result_type] ?? '#1c1917', margin: '0 0 4px' }}>
                    {(TYPE_LABELS as Record<string, string>)[selected.result_type] ?? selected.result_type}
                  </p>
                  {selected.result_json && 'confidence' in selected.result_json && (() => {
                    const rj = selected.result_json as import('@/types').DiagnosisResult;
                    const rawC = rj.confidence as unknown;
                    const confLabel = typeof rawC === 'number' ? `${rawC}%`
                      : rawC === 'high' ? '高' : rawC === 'medium' ? '中' : '低';
                    return (
                      <p style={{ fontSize: '12px', color: '#78716c', margin: 0 }}>
                        確信度: {confLabel}
                        　IP: {selected.ip_address}
                      </p>
                    );
                  })()}
                </div>

                <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '10px', letterSpacing: '0.05em' }}>目視判定</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => handleFeedback(selected.id, 'correct')}
                    style={{
                      padding: '12px', borderRadius: '10px', border: 'none',
                      background: selected.admin_feedback === 'correct' ? '#16a34a' : '#f0fdf4',
                      color: selected.admin_feedback === 'correct' ? '#fff' : '#16a34a',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                    }}
                  >
                    ✓ 正解（{(TYPE_LABELS as Record<string, string>)[selected.result_type]}）
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {(['straight', 'wave', 'natural'] as const).filter((t) => t !== selected.result_type).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleFeedback(selected.id, t)}
                        style={{
                          padding: '10px 6px', borderRadius: '10px',
                          background: selected.admin_feedback === t ? TYPE_COLOR[t] : TYPE_BG[t],
                          color: selected.admin_feedback === t ? '#fff' : TYPE_COLOR[t],
                          fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${TYPE_COLOR[t]}40`,
                        } as React.CSSProperties}
                      >
                        → {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
