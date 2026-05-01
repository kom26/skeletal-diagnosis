'use client';

import { useState, useEffect } from 'react';
import { getSession, getGeneratedInvites, saveGeneratedInvites, GeneratedInviteItem } from '@/lib/monitor';

interface StatusMap { [id: string]: { usedCount: number; maxUses: number; isActive: boolean } }

export default function MyInvites() {
  const session = getSession();
  const [invites, setInvites] = useState(getGeneratedInvites);
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [choosing, setChoosing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reissuing, setReissuing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 発行済みの場合は使用状況を取得
  useEffect(() => {
    if (!invites) return;
    const ids = invites.items.map(i => i.id).join(',');
    fetch(`/api/monitor/status?ids=${ids}`)
      .then(r => r.json())
      .then(({ items }) => {
        const map: StatusMap = {};
        for (const item of items) map[item.id] = { usedCount: item.used_count, maxUses: item.max_uses, isActive: item.is_active };
        setStatusMap(map);
      })
      .catch(() => {});
  }, [invites]);

  if (!session || session.childInvites === 0) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleGenerate = async (type: 'invite' | 'url') => {
    const label = type === 'invite' ? '招待コード' : '先着URL';
    const other = type === 'invite' ? '先着URL' : '招待コード';
    if (!window.confirm(`${label}を発行しますか？\n${other}への変更はできません。`)) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/monitor/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentCodeId: session.codeId, type }),
      });
      const json = await res.json();
      if (json.error) { alert(json.error); return; }
      // alreadyGenerated=true の場合は既存コードをlocalStorageに復元して表示
      const generated = { type: json.type as 'invite' | 'url', items: json.items, generatedAt: Date.now() };
      saveGeneratedInvites(generated);
      setInvites(generated);
      setChoosing(false);
    } catch {
      alert('発行に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleReissue = async (item: GeneratedInviteItem) => {
    if (!window.confirm('このコードを再発行しますか？\n現在のコードは無効になります。')) return;
    setReissuing(item.id);
    try {
      const res = await fetch('/api/monitor/reissue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId: item.id }),
      });
      const json = await res.json();
      if (json.error) { alert(json.error); return; }
      const updated = { ...invites!, items: invites!.items.map(i => i.id === item.id ? json.item : i) };
      saveGeneratedInvites(updated);
      setInvites(updated);
      setStatusMap(prev => { const next = { ...prev }; delete next[item.id]; return next; });
    } catch {
      alert('再発行に失敗しました');
    } finally {
      setReissuing(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const childLabel = (n: number) => n === 0 ? '招待なし' : `${n}人招待付き`;

  return (
    <div style={{ background: '#FFF5F8', borderRadius: '20px', padding: '20px', border: '1.5px solid #FCE7F3', marginTop: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: '#EC4899', margin: '0 0 4px' }}>
        ✦ あなたの招待
      </p>
      <p style={{ fontSize: '12px', color: '#9D174D', margin: '0 0 16px', lineHeight: 1.6 }}>
        {session.childInvites}人を招待できます
      </p>

      {/* 未発行 → 選択UI */}
      {!invites && (
        <>
          {!choosing ? (
            <button
              onClick={() => setChoosing(true)}
              style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #F9A8D4, #EC4899)', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer', boxShadow: '0 4px 14px rgba(236,72,153,0.25)' }}
            >
              招待を発行する
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '11px', color: '#a8a29e', textAlign: 'center', margin: '0 0 4px' }}>どちらで発行しますか？</p>
              <button
                onClick={() => handleGenerate('invite')}
                disabled={generating}
                style={{ padding: '14px 16px', borderRadius: '14px', background: '#FFF0F5', border: '1.5px solid #F9A8D4', cursor: 'pointer', textAlign: 'left' }}
              >
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#BE185D' }}>招待コード</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#a8a29e' }}>{session.childInvites}枚発行 — 1人ずつコードを渡して招待</p>
              </button>
              <button
                onClick={() => handleGenerate('url')}
                disabled={generating}
                style={{ padding: '14px 16px', borderRadius: '14px', background: '#FFF0F5', border: '1.5px solid #F9A8D4', cursor: 'pointer', textAlign: 'left' }}
              >
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#BE185D' }}>先着URL</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#a8a29e' }}>先着{session.childInvites}名まで — URLをシェアして招待</p>
              </button>
              <button onClick={() => setChoosing(false)} style={{ background: 'none', border: 'none', color: '#a8a29e', fontSize: '11px', cursor: 'pointer', padding: '4px' }}>
                キャンセル
              </button>
            </div>
          )}
        </>
      )}

      {/* 発行済み → 一覧 */}
      {invites && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {invites.items.map((item) => {
            const st = statusMap[item.id];
            const isUsed = st ? st.usedCount >= st.maxUses : false;
            const isInactive = st ? !st.isActive : false;
            const copyKey = item.id;
            const copyText = invites.type === 'invite'
              ? item.code
              : `${origin}/?token=${item.code}`;

            return (
              <div key={item.id} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #FCE7F3', opacity: isInactive ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {invites.type === 'invite' ? (
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.2em', color: '#9D174D', fontFamily: 'monospace' }}>{item.code}</p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '11px', color: '#9D174D', wordBreak: 'break-all', fontWeight: 600 }}>{origin}/?token={item.code}</p>
                    )}
                    <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#a8a29e' }}>
                      {childLabel(item.childInvites)}
                      {st && invites.type === 'url' && <span>　{st.usedCount}/{st.maxUses}名使用</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {/* 使用状況バッジ */}
                    {isInactive ? (
                      <span style={{ fontSize: '10px', background: '#f5f5f4', color: '#a8a29e', padding: '3px 8px', borderRadius: '99px' }}>無効</span>
                    ) : isUsed ? (
                      <span style={{ fontSize: '10px', background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '99px' }}>✓ 使用済み</span>
                    ) : (
                      <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '99px' }}>⏳ 未使用</span>
                    )}
                    {/* コピーボタン */}
                    {!isInactive && (
                      <button
                        onClick={() => copyToClipboard(copyText, copyKey)}
                        style={{ fontSize: '11px', padding: '4px 10px', background: copied === copyKey ? '#f0fdf4' : '#FFF0F5', color: copied === copyKey ? '#16a34a' : '#EC4899', border: `1px solid ${copied === copyKey ? '#bbf7d0' : '#FCE7F3'}`, borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {copied === copyKey ? '✓ コピー済み' : 'コピー'}
                      </button>
                    )}
                    {/* 再発行ボタン（未使用・有効のみ） */}
                    {!isUsed && !isInactive && (
                      <button
                        onClick={() => handleReissue(item)}
                        disabled={reissuing === item.id}
                        style={{ fontSize: '10px', padding: '4px 8px', background: 'none', color: '#a8a29e', border: '1px solid #e7e5e4', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {reissuing === item.id ? '...' : '再発行'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
