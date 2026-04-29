// lib/rateLimit.ts
// ============================================================
// コスト制御ガードレール
// すべての制限チェックはサーバーサイド (Route Handler) で実行
// ============================================================

import { supabaseAdmin } from './supabase';

const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || '100');
const IP_HOURLY_LIMIT = parseInt(process.env.IP_HOURLY_LIMIT || '5');

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'DAILY_LIMIT' | 'RATE_LIMIT';
  dailyCount?: number;
  ipCount?: number;
}

/**
 * すべてのレート制限チェックを一括実行する
 * @param ipAddress リクエスト元 IP アドレス
 */
export async function checkRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const db = supabaseAdmin();

  // ① システム全体の日次上限チェック
  const { data: dailyData, error: dailyErr } = await db
    .rpc('get_daily_count');

  if (dailyErr) {
    console.error('[RateLimit] daily count error:', dailyErr);
    // DB エラー時は安全側に倒してブロック
    return { allowed: false, reason: 'DAILY_LIMIT' };
  }

  const dailyCount = dailyData as number ?? 0;
  if (dailyCount >= DAILY_LIMIT) {
    return { allowed: false, reason: 'DAILY_LIMIT', dailyCount };
  }

  // ② IP ごとの時間ウィンドウ上限チェック
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: ipData, error: ipErr } = await db
    .from('ip_rate_limits')
    .select('request_count, window_start')
    .eq('ip_address', ipAddress)
    .single();

  if (ipErr && ipErr.code !== 'PGRST116') {
    // PGRST116 = not found（初回アクセス）以外のエラー
    console.error('[RateLimit] ip check error:', ipErr);
  }

  let ipCount = 0;
  if (ipData) {
    // ウィンドウが1時間以内なら既存カウントを使用
    if (new Date(ipData.window_start) > new Date(oneHourAgo)) {
      ipCount = ipData.request_count;
    }
    // ウィンドウが古い場合は 0 扱い（リセット）
  }

  if (ipCount >= IP_HOURLY_LIMIT) {
    return { allowed: false, reason: 'RATE_LIMIT', dailyCount, ipCount };
  }

  return { allowed: true, dailyCount, ipCount };
}

/**
 * 診断成功後にカウンターをインクリメントする
 */
export async function incrementCounters(ipAddress: string): Promise<void> {
  const db = supabaseAdmin();

  // 日次カウントを原子的にインクリメント
  await db.rpc('increment_daily_count');

  // IP カウントを upsert
  const { data: ipData } = await db
    .from('ip_rate_limits')
    .select('request_count, window_start')
    .eq('ip_address', ipAddress)
    .single();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const isWindowValid = ipData && new Date(ipData.window_start) > new Date(oneHourAgo);

  await db.from('ip_rate_limits').upsert({
    ip_address: ipAddress,
    request_count: isWindowValid ? (ipData!.request_count + 1) : 1,
    window_start: isWindowValid ? ipData!.window_start : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
