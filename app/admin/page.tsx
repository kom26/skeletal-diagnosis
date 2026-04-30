'use client';

import { useState, useEffect } from 'react';
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
  straight: 'rgba(236,72,153,0.10)',
  wave:     'rgba(168,85,247,0.10)',
  natural:  'rgba(244,63,94,0.10)',
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
    return <span style={{ background: 'rgba(156,163,175,0.7)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>AI エラー</span>;
  }
  if (!log.admin_feedback) {
    return <span style={{ background: 'rgba(0,0,0,0.55)', color: '#d4d4d4', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>未判定</span>;
  }
  if (log.admin_feedback === 'correct') {
    return <span style={{ background: 'rgba(22,163,74,0.85)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>✓ 正解</span>;
  }
  return <span style={{ background: 'rgba(234,88,12,0.85)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '99px' }}>→ {TYPE_LABELS[log.admin_feedback] ?? log.admin_feedback}</span>;
}

export default function AdminPage() {
  const [key, setKey]           = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [logs, setLogs]         = useState<LogWithImage[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState<LogWithImage | null>(null);
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

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
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, admin_feedback: feedback } : l));
    setSelected((prev) => prev?.id === id ? { ...prev, admin_feedback: feedback } : prev);
  };

  const handleDelete = async (ids: string[]) => {
    if (!window.confirm(`${ids.length}件のログを削除しますか？\nStorage の画像も削除されます。この操作は取り消せません。`)) return;
    setDeleting(true);
    try {
      await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ ids }),
      });
      setLogs((prev) => prev.filter((l) => !ids.includes(l.id)));
      setSelectedIds(new Set());
      setSelected(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
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
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#1c1917', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', letterSpacing: '0.1em', cursor: 'pointer' }}>
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
    <main style={{ minHeight: '100vh', background: '#f5f5f4', padding: '16px 16px 80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1c1917', margin: 0 }}>診断ログ</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {errorCount > 0 && <span style={{ fontSize: '12px', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '99px' }}>エラー {errorCount}件</span>}
            <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '99px' }}>未判定 {pending}件</span>
            <span style={{ fontSize: '12px', color: '#a8a29e' }}>{logs.length}件</span>
            <button
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '99px', border: '1px solid #d6d3d1', background: selectMode ? '#1c1917' : '#fff', color: selectMode ? '#fff' : '#1c1917', cursor: 'pointer', fontWeight: 500 }}
            >
              {selectMode ? 'キャンセル' : '選択'}
            </button>
          </div>
        </div>

        {/* 選択削除バー */}
        {selectMode && selectedIds.size > 0 && (
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#1c1917', color: '#fff', padding: '10px 16px', borderRadius: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px' }}>{selectedIds.size}件を選択中</span>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              disabled={deleting}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
            >
              {deleting ? '削除中...' : '削除'}
            </button>
          </div>
        )}

        {/* グリッド */}
        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#a8a29e', padding: '60px 0' }}>ログがありません</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {logs.map((log) => {
              const accentColor = TYPE_COLOR[log.result_type] ?? '#a8a29e';
              const isErr = isErrorLog(log);
              const isReviewed = !isErr && !!log.admin_feedback;
              const isChecked = selectedIds.has(log.id);
              return (
                <div
                  key={log.id}
                  onClick={() => selectMode ? toggleSelect(log.id) : setSelected(log)}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: isErr ? '#f3f4f6' : '#e7e5e4',
                    aspectRatio: '3 / 4',
                    border: isChecked ? '2.5px solid #2563eb' : isReviewed ? '2px solid transparent' : `2px solid ${accentColor}60`,
                    boxShadow: isChecked ? '0 0 0 2px #93c5fd' : selected?.id === log.id ? `0 0 0 3px ${accentColor}` : 'none',
                  }}
                >
                  {log.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={log.signed_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isErr ? 'grayscale(40%)' : 'none' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e', fontSize: '11px' }}>No image</div>
                  )}

                  {isErr && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)' }}>
                      <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>×</span>
                    </div>
                  )}

                  {/* 選択チェック */}
                  {selectMode && (
                    <div style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: isChecked ? '#2563eb' : 'rgba(255,255,255,0.85)', border: isChecked ? 'none' : '1.5px solid #d6d3d1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isChecked && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                    </div>
                  )}

                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.72))', padding: '20px 8px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '0.03em', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{TYPE_LABELS[log.result_type] ?? log.result_type}</span>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto', padding: '20px 20px 40px' }}
          >
            {/* モーダルヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#a8a29e' }}>{new Date(selected.created_at).toLocaleString('ja-JP')}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleDelete([selected.id])}
                  disabled={deleting}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  🗑 削除
                </button>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#a8a29e', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>×</button>
              </div>
            </div>

            {/* 画像 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              {selected.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.signed_url} alt="診断画像" style={{ width: '65%', height: 'auto', display: 'block', borderRadius: '14px', border: '1px solid #e7e5e4', filter: isErrorLog(selected) ? 'grayscale(30%)' : 'none' }} />
              ) : (
                <div style={{ width: '65%', aspectRatio: '3/4', background: '#f5f5f4', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e', fontSize: '12px' }}>No image</div>
              )}
            </div>

            {/* 参考情報 */}
            {selected.body_info && Object.keys(selected.body_info).length > 0 && (() => {
              const bi = selected.body_info!;
              const items = [
                bi.age    != null ? `${bi.age}歳`    : null,
                bi.height != null ? `${bi.height}cm` : null,
                bi.weight != null ? `${bi.weight}kg` : null,
                bi.cup              ? `カップ${bi.cup}` : null,
              ].filter(Boolean);
              return (
                <div style={{ background: '#fdf4ff', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', border: '1px solid #e9d5ff', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 600, letterSpacing: '0.05em', marginRight: '2px' }}>参考情報</span>
                  {items.map((item) => (
                    <span key={item} style={{ fontSize: '12px', color: '#6d28d9', background: '#ede9fe', borderRadius: '6px', padding: '2px 8px' }}>{item}</span>
                  ))}
                </div>
              );
            })()}

            {isErrorLog(selected) ? (
              /* ── エラーログ ── */
              <>
                <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px', letterSpacing: '0.05em' }}>AI診断結果</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>AI エラー</p>
                  {getErrorDetail(selected) && <p style={{ fontSize: '11px', color: '#ef4444', margin: '0 0 4px' }}>コード: {getErrorDetail(selected)!.code}</p>}
                  {getErrorDetail(selected) && <p style={{ fontSize: '11px', color: '#78716c', margin: 0 }}>{getErrorDetail(selected)!.error}</p>}
                  <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '6px', marginBottom: 0 }}>IP: {selected.ip_address}</p>
                </div>

                <p style={{ fontSize: '11px', color: '#78716c', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>目視で骨格タイプを判定</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(['straight', 'wave', 'natural'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleFeedback(selected.id, t)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: selected.admin_feedback === t ? TYPE_COLOR[t] : TYPE_BG[t],
                        color: selected.admin_feedback === t ? '#fff' : TYPE_COLOR[t],
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `2px solid ${selected.admin_feedback === t ? TYPE_COLOR[t] : TYPE_COLOR[t] + '40'}`,
                        textAlign: 'left',
                        letterSpacing: '0.03em',
                      } as React.CSSProperties}
                    >
                      {selected.admin_feedback === t ? '✓ ' : ''}{TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* ── 通常ログ ── */
              <>
                <div style={{ background: '#fafaf9', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #e7e5e4' }}>
                  <p style={{ fontSize: '11px', color: '#a8a29e', margin: '0 0 4px', letterSpacing: '0.05em' }}>AI 判定</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: (TYPE_COLOR as Record<string, string>)[selected.result_type] ?? '#1c1917', margin: '0 0 6px' }}>
                    {(TYPE_LABELS as Record<string, string>)[selected.result_type] ?? selected.result_type}
                  </p>
                  {selected.result_json && 'confidence' in selected.result_json && (() => {
                    const rj = selected.result_json as import('@/types').DiagnosisResult;
                    const rawC = rj.confidence as unknown;
                    const confLabel = rawC === 'high' ? '高' : rawC === 'medium' ? '中' : '低';
                    return <p style={{ fontSize: '12px', color: '#78716c', margin: 0 }}>画像信頼度: {confLabel}　IP: {selected.ip_address}</p>;
                  })()}
                </div>

                <p style={{ fontSize: '11px', color: '#78716c', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>目視で正誤を判定してください</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* 正解ボタン */}
                  <button
                    onClick={() => handleFeedback(selected.id, 'correct')}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: selected.admin_feedback === 'correct' ? 'none' : '2px solid #bbf7d0',
                      background: selected.admin_feedback === 'correct' ? '#16a34a' : '#f0fdf4',
                      color: selected.admin_feedback === 'correct' ? '#fff' : '#16a34a',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      letterSpacing: '0.05em',
                    } as React.CSSProperties}
                  >
                    ✓ 正解（{(TYPE_LABELS as Record<string, string>)[selected.result_type]}）
                  </button>

                  {/* 誤判定ボタン */}
                  {(['straight', 'wave', 'natural'] as const).filter((t) => t !== selected.result_type).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleFeedback(selected.id, t)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: selected.admin_feedback === t ? TYPE_COLOR[t] : TYPE_BG[t],
                        color: selected.admin_feedback === t ? '#fff' : TYPE_COLOR[t],
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `2px solid ${selected.admin_feedback === t ? TYPE_COLOR[t] : TYPE_COLOR[t] + '50'}`,
                        textAlign: 'left',
                        letterSpacing: '0.03em',
                      } as React.CSSProperties}
                    >
                      {selected.admin_feedback === t ? '✓ ' : '× '}実際は {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
