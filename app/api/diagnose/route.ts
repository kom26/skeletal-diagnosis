// app/api/diagnose/route.ts
// ============================================================
// 骨格診断 API エンドポイント
// - API キーは完全にサーバーサイドに隔離
// - レート制限チェック → AI 分析 → DB 保存 の順で処理
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, incrementCounters } from '@/lib/rateLimit';
import { analyzeBodyType } from '@/lib/analyze';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/types';

export const maxDuration = 30;

// 許可する画像 MIME タイプ
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED_TYPES)[number];

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. IP アドレスの取得 ──────────────────────────────────
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  // ── 2. レート制限チェック ─────────────────────────────────
  const rateCheck = await checkRateLimit(ipAddress);
  if (!rateCheck.allowed) {
    const message =
      rateCheck.reason === 'DAILY_LIMIT'
        ? '本日の診断回数が上限に達しました。明日またお試しください。'
        : '短時間に多くのリクエストが行われました。しばらく時間を置いてから再度お試しください。';

    return NextResponse.json(
      { success: false, error: message, code: rateCheck.reason },
      { status: 429 }
    );
  }

  // ── 3. リクエストボディのパース ───────────────────────────
  let imageBase64: string;
  let mimeType: AllowedMime;

  try {
    const body = await req.json();
    const { image } = body; // "data:image/jpeg;base64,xxxx..."

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: '画像データが見つかりません', code: 'INVALID_IMAGE' },
        { status: 400 }
      );
    }

    // data URL を分解
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { success: false, error: '画像フォーマットが正しくありません', code: 'INVALID_IMAGE' },
        { status: 400 }
      );
    }

    mimeType = matches[1] as AllowedMime;
    imageBase64 = matches[2];

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'JPEG・PNG・WebP のみ対応しています', code: 'INVALID_IMAGE' },
        { status: 400 }
      );
    }

    // base64 サイズチェック（約 3MB 以下 = 4MB × 0.75）
    if (imageBase64.length > 4_000_000) {
      return NextResponse.json(
        { success: false, error: '画像サイズが大きすぎます。3MB 以下にしてください', code: 'INVALID_IMAGE' },
        { status: 413 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'リクエストの解析に失敗しました', code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }

  // ── 4. AI 診断 ────────────────────────────────────────────
  let result;
  try {
    result = await analyzeBodyType(imageBase64, mimeType);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    console.error('[Diagnose] AI analysis error — status:', e.status, '| message:', e.message);

    // API キー未設定 / 認証エラー
    if (e.status === 401) {
      return NextResponse.json(
        { success: false, error: 'API キーが設定されていません。管理者に連絡してください。', code: 'AI_ERROR' },
        { status: 500 }
      );
    }
    // レート制限
    if (e.status === 429) {
      return NextResponse.json(
        { success: false, error: 'AI サービスが混み合っています。少し時間を置いてから再度お試しください。', code: 'AI_ERROR' },
        { status: 503 }
      );
    }
    // コンテンツポリシー拒否（Claude がテキスト拒否）
    if (e.message?.startsWith('NO_JSON:')) {
      return NextResponse.json(
        { success: false, error: '画像を分析できませんでした。全身が映った写真をお試しください。', code: 'AI_ERROR' },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'AI 分析中にエラーが発生しました。しばらくしてから再度お試しください。', code: 'AI_ERROR' },
      { status: 500 }
    );
  }

  // ── 5. Supabase Storage に画像を保存（任意）────────────────
  let imageUrl: string | null = null;
  try {
    const db = supabaseAdmin();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${mimeType.split('/')[1]}`;
    const buffer = Buffer.from(imageBase64, 'base64');

    const { data: uploadData } = await db.storage
      .from('diagnosis-images')
      .upload(fileName, buffer, { contentType: mimeType, upsert: false });

    imageUrl = uploadData?.path ?? null;
  } catch (err) {
    // 画像保存失敗は診断結果に影響させない（ログだけ記録）
    console.error('[Diagnose] Storage upload error:', err);
  }

  // ── 6. 診断ログを DB に保存 ───────────────────────────────
  try {
    const db = supabaseAdmin();
    await db.from('diagnosis_logs').insert({
      ip_address: ipAddress,
      image_url: imageUrl,
      result_type: result.bodyType,
      result_json: result,
    });
  } catch (err) {
    console.error('[Diagnose] DB insert error:', err);
    // ログ保存失敗は致命的エラーとしない
  }

  // ── 7. カウンターをインクリメント ────────────────────────
  await incrementCounters(ipAddress);

  // ── 8. レスポンス返却 ─────────────────────────────────────
  return NextResponse.json({ success: true, data: result });
}
