-- ============================================================
-- 骨格診断AI - Supabase スキーマ定義
-- Supabase の SQL Editor に貼り付けて実行してください
-- ============================================================

-- 診断ログテーブル
CREATE TABLE diagnosis_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address  TEXT NOT NULL,
  image_url   TEXT,                        -- Supabase Storage のパス
  result_type TEXT NOT NULL,               -- 'straight' | 'wave' | 'natural'
  result_json     JSONB NOT NULL,              -- AI の詳細レスポンス
  model_used      TEXT DEFAULT 'claude-sonnet-4-6',
  admin_feedback  TEXT                         -- 'correct' | 'straight' | 'wave' | 'natural'
);

-- 日次カウントテーブル（コスト制御の要）
CREATE TABLE daily_counts (
  date        DATE DEFAULT CURRENT_DATE PRIMARY KEY,
  count       INT  DEFAULT 0 NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IP別の直近リクエスト記録（連投防止用）
CREATE TABLE ip_rate_limits (
  ip_address    TEXT PRIMARY KEY,
  request_count INT DEFAULT 1 NOT NULL,
  window_start  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security) 設定
-- ============================================================

-- diagnosis_logs: サービスロール（サーバーサイド）からのみ書き込み可
ALTER TABLE diagnosis_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON diagnosis_logs
  FOR ALL USING (auth.role() = 'service_role');

-- daily_counts: サービスロールのみ
ALTER TABLE daily_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON daily_counts
  FOR ALL USING (auth.role() = 'service_role');

-- ip_rate_limits: サービスロールのみ
ALTER TABLE ip_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON ip_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Supabase Storage バケット作成
-- ============================================================
-- Supabase Dashboard > Storage > New Bucket で手動作成:
--   バケット名: diagnosis-images
--   Public: OFF（非公開）
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================================
-- 日次カウントのアトミックな加算用 RPC 関数
-- ============================================================
CREATE OR REPLACE FUNCTION increment_daily_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  new_count INT;
BEGIN
  INSERT INTO daily_counts (date, count)
  VALUES (today, 1)
  ON CONFLICT (date)
  DO UPDATE SET
    count      = daily_counts.count + 1,
    updated_at = NOW()
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;

-- 今日の診断数を取得する関数
CREATE OR REPLACE FUNCTION get_daily_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result INT;
BEGIN
  SELECT count INTO result
  FROM daily_counts
  WHERE date = CURRENT_DATE;

  RETURN COALESCE(result, 0);
END;
$$;
