import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, incrementCounters } from '@/lib/rateLimit';
import { analyzeBodyType } from '@/lib/analyze';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiResponse, DiagnosisResult, BodyInfo } from '@/types';

export const maxDuration = 30;

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
  let bodyInfo: BodyInfo | undefined;

  try {
    const body = await req.json();
    const { image, bodyInfo: bi } = body;
    bodyInfo = bi ?? undefined;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: '画像データが見つかりません', code: 'INVALID_IMAGE' },
        { status: 400 }
      );
    }

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

  // ── 4. AI 診断（失敗してもログ記録は続行）────────────────
  let result: DiagnosisResult | null = null;
  let aiErrorMessage = '';
  let aiErrorCode = '';

  try {
    result = await analyzeBodyType(imageBase64, mimeType, bodyInfo);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    console.error('[Diagnose] AI analysis error — status:', e.status, '| message:', e.message);

    if (e.status === 401) {
      aiErrorMessage = 'API キーが設定されていません。管理者に連絡してください。';
      aiErrorCode = 'AUTH_ERROR';
    } else if (e.status === 429) {
      aiErrorMessage = 'AI サービスが混み合っています。少し時間を置いてから再度お試しください。';
      aiErrorCode = 'RATE_LIMIT';
    } else if (e.message?.startsWith('NO_JSON:')) {
      aiErrorMessage = '画像を分析できませんでした。以下をお試しください。\n・全身が映った正面の写真\n・体のラインがわかる服装（過度な露出は除く）\n・明るく鮮明な写真';
      aiErrorCode = 'CONTENT_POLICY';
    } else {
      aiErrorMessage = 'AI 分析中にエラーが発生しました。しばらくしてから再度お試しください。';
      aiErrorCode = 'AI_ERROR';
    }
  }

  // ── 5. 画像を Storage に保存（成功・失敗どちらも試みる）──
  let imageUrl: string | null = null;
  try {
    const db = supabaseAdmin();
    const ext = mimeType.split('/')[1];
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(imageBase64, 'base64');

    const { data: uploadData } = await db.storage
      .from('diagnosis-images')
      .upload(fileName, buffer, { contentType: mimeType, upsert: false });

    imageUrl = uploadData?.path ?? null;
  } catch (err) {
    console.error('[Diagnose] Storage upload error:', err);
  }

  // ── 6. 診断ログを DB に保存（成功・失敗どちらも記録）────
  try {
    const db = supabaseAdmin();
    await db.from('diagnosis_logs').insert({
      ip_address: ipAddress,
      image_url: imageUrl,
      result_type: result ? result.bodyType : 'error',
      result_json: result ?? { error: aiErrorMessage, code: aiErrorCode },
      body_info: (bodyInfo && Object.keys(bodyInfo).length > 0) ? bodyInfo : null,
    });
  } catch (err) {
    console.error('[Diagnose] DB insert error:', err);
  }

  // ── 7. カウンターをインクリメント（失敗もカウント）───────
  await incrementCounters(ipAddress);

  // ── 8. レスポンス返却 ─────────────────────────────────────
  if (!result) {
    return NextResponse.json(
      { success: false, error: aiErrorMessage, code: 'AI_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}
