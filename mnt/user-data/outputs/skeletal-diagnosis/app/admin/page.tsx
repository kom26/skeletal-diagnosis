// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DiagnosisLog, BodyType } from '@/types';

const TYPE_LABEL: Record<BodyType, string> = {
  straight: 'ストレート',
  wave: 'ウェーブ',
  natural: 'ナチュラル',
};

const TYPE_COLOR: Record<BodyType, string> = {
  straight: 'bg-rose-100 text-rose-700',
  wave: 'bg-sky-100 text-sky-700',
  natural: 'bg-emerald-100 text-emerald-700',
};

interface AdminData {
  logs: DiagnosisLog[];
  pagination: { page: number; limit: number; total: number };
  stats: {
    todayCount: number;
    dailyLimit: number;
    last7Days: Record<string, number>;
  };
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/logs?page=${p}&limit=20`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.status === 401) { setError('認証に失敗しました'); setAuthed(false); return; }
      if (!res.ok) { setError('データの取得に失敗しました'); return; }
      const json = await res.json();
      setData(json);
      setAuthed(true);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  useEffect(() => {
    if (authed) fetchLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!authed) {
    return (
      <main className="min-h-screen bg-stone-900 flex items-center justify-center p-6">
        <div className="bg-stone-800 rounded-2xl p-8 w-full max-w-sm border border-stone-700">
          <h1 className="font-display text-2xl font-light text-stone-100 tracking-widest mb-6 text-center">
            SKELÉ Admin
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="管理者キーを入力"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3
                         text-stone-200 text-sm placeholder-stone-500 outline-none
                         focus:border-amber-600 transition-colors mb-4"
            />
            {error && <p className="text-red-400 text-xs mb-4 text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-stone-50 text-sm
                         tracking-widest rounded-lg transition-colors font-light"
            >
              ログイン
            </button>
          </form>
        </div>
      </main>
    );
  }

  const totalPages = data ? Math.ceil(data.pagination.total / data.pagination.limit) : 1;

  return (
    <main className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-light text-stone-700 tracking-widest">
            SKELÉ Admin
          </h1>
          <button
            onClick={() => { setAuthed(false); setData(null); }}
            className="text-xs text-stone-400 hover:text-stone-600 tracking-wider"
          >
            ログアウト
          </button>
        </div>

        {/* 統計カード */}
        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="本日の診断数"
              value={`${data.stats.todayCount} / ${data.stats.dailyLimit}`}
              highlight={data.stats.todayCount >= data.stats.dailyLimit * 0.8}
            />
            <StatCard label="合計診断数" value={data.pagination.total} />
            {Object.entries(data.stats.last7Days).map(([type, count]) => (
              <StatCard
                key={type}
                label={`${TYPE_LABEL[type as BodyType]} (7日)`}
                value={count}
              />
            ))}
          </div>
        )}

        {/* ログテーブル */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm text-stone-600 font-light tracking-wider">診断ログ</h2>
            <button
              onClick={() => fetchLogs(page)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              更新
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border border-stone-300 border-t-stone-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-xs text-stone-400 tracking-wider">
                    <th className="text-left px-6 py-3 font-normal">日時</th>
                    <th className="text-left px-6 py-3 font-normal">IP</th>
                    <th className="text-left px-6 py-3 font-normal">骨格タイプ</th>
                    <th className="text-left px-6 py-3 font-normal">確信度</th>
                    <th className="text-left px-6 py-3 font-normal">画像</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.logs.map((log) => (
                    <tr key={log.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-3 text-stone-500 font-light text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-3 text-stone-400 font-mono text-xs">
                        {log.ip_address.split('.').slice(0, 2).join('.')}.***
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLOR[log.result_type]}`}>
                          {TYPE_LABEL[log.result_type]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-stone-400 text-xs">
                        {{ high: '高', medium: '中', low: '低' }[log.result_json.confidence]}
                      </td>
                      <td className="px-6 py-3">
                        {log.image_url ? (
                          <span className="text-xs text-emerald-600">✓ 保存済</span>
                        ) : (
                          <span className="text-xs text-stone-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4 border-t border-stone-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-30"
              >
                ← 前へ
              </button>
              <span className="text-xs text-stone-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-30"
              >
                次へ →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
      <p className={`text-xs tracking-wider mb-2 ${highlight ? 'text-amber-600' : 'text-stone-400'}`}>{label}</p>
      <p className={`text-2xl font-light ${highlight ? 'text-amber-700' : 'text-stone-700'}`}>{value}</p>
    </div>
  );
}
