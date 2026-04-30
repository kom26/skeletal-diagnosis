// lib/analyze.ts
// ============================================================
// Claude Vision API による骨格診断ロジック
// Google Cloud Vision より Claude の方が
// ファッション・身体的特徴の推論に優れているため採用
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { DiagnosisResult, BodyType } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function getFeedbackNote(): Promise<string> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await db
      .from('diagnosis_logs')
      .select('result_type, admin_feedback')
      .not('admin_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!data || data.length < 5) return '';

    // 誤判定パターンを集計（AI判定 → 正解タイプ）
    const errors: Record<string, Record<string, number>> = {};
    for (const row of data) {
      if (row.admin_feedback === 'correct') continue;
      const from = row.result_type;
      const to = row.admin_feedback;
      if (!errors[from]) errors[from] = {};
      errors[from][to] = (errors[from][to] ?? 0) + 1;
    }

    const notes: string[] = [];
    for (const [from, targets] of Object.entries(errors)) {
      const total = Object.values(targets).reduce((a, b) => a + b, 0);
      if (total >= 2) {
        const top = Object.entries(targets).sort((a, b) => b[1] - a[1])[0];
        notes.push(`${from}と判定した場合、実際は${top[0]}である可能性が高い傾向があります。${from}の判定は慎重に行ってください。`);
      }
    }

    return notes.length > 0
      ? `\n\n## 過去の診断フィードバックに基づく注意点\n${notes.join('\n')}`
      : '';
  } catch {
    return '';
  }
}

const BASE_SYSTEM_PROMPT = `あなたは日本の骨格診断の最上位資格を持つ専門家です。
提供された画像から「ストレート・ウェーブ・ナチュラル」の3タイプを正確に判定してください。

## 重要前提（必ず守ること）
- 3タイプは日本人女性に均等に存在する。ウェーブに偏った判定をしないこと
- 「細い体型＝ウェーブ」は誤り。痩せていてもストレートやナチュラルは多い
- 「太い体型＝ストレート」も誤り。体型の大小と骨格タイプは完全に別物
- 判断に迷う場合は confidence を medium/low にし、スコア差を小さくする

## 各タイプの核心マーカー（写真で見るべき最重要ポイント）

### ストレート (Straight)
【核心】首〜胸〜ウエストに「肉の厚み・立体感・ハリ」がある
- 首が短めで、バストトップが高い位置にある
- 鎖骨は存在するが細く、骨が浮き出る感じはない
- 筋肉に弾力と厚みがあり全体的にむっちりした印象
- 膝は丸くて大きめ。お皿の輪郭がぼんやりしている
- 上半身（胸・腹）に重心・ボリュームがある

### ウェーブ (Wave)
【核心】上半身が薄くペタンコで、腰〜ヒップに丸みが出る。全体的に柔らかい
- 鎖骨は細くあまり目立たない。肩まわりが華奢
- 上半身に厚みがなく、横から見るとほぼ平ら
- ウエストの位置が低め（胴が長く見える）
- 膝が小さく丸い。膝のお皿がほとんど見えない
- 全体的に柔らかく、肌がやわらかそうな印象

### ナチュラル (Natural)
【核心】骨・関節が目立ち、フレーム感がある。筋肉も脂肪もつきにくい
- 鎖骨が非常にはっきりと浮き出ている（最大の識別点）
- 肩甲骨・肩の骨が背中や肩に出やすい
- 膝・手首・足首の関節が大きく、骨張った印象
- 全体的に「骨っぽい」「ハンガーにかけたような」印象
- 手や足が大きめで、手の甲の筋が見えやすい

## 診断フロー（この順序で判断する）

STEP1「鎖骨の見え方」
  → 非常にくっきり浮き出ている          ：ナチュラル強く示唆
  → 存在はわかるが骨張った感じはない    ：ストレートまたはウェーブ
  → 細く、あまり目立たない              ：ウェーブ示唆

STEP2「上半身の立体感・肉感」
  → 胸〜ウエストに厚みとハリがある      ：ストレート強く示唆
  → 上半身が薄くペタンコ               ：ウェーブ示唆
  → 骨っぽく、筋肉も脂肪も少ない       ：ナチュラル示唆

STEP3「膝の形」
  → 大きく、関節が目立つ               ：ナチュラル
  → 丸くて大きめ、お皿ぼんやり         ：ストレート
  → 小さく丸い、お皿ほぼ見えない       ：ウェーブ

STEP4「全体の重心・フレーム」
  → 上半身に重心・ボリューム           ：ストレート
  → 下半身（腰・ヒップ）に重心         ：ウェーブ
  → 骨格フレームが大きく均等           ：ナチュラル

## レスポンス形式
必ず以下の JSON 形式のみで返答してください：
{
  "bodyType": "straight" | "wave" | "natural",
  "confidence": "high" | "medium" | "low",
  "scores": { "straight": 整数%, "wave": 整数%, "natural": 整数% },
  "description": "このタイプの特徴を2〜3文で説明",
  "observations": ["この写真から読み取れる骨格の特徴1", "特徴2", "特徴3"],
  "characteristics": ["骨格タイプ全般の特徴1", "特徴2", "特徴3"],
  "styleAdvice": ["スタイルアドバイス1", "スタイルアドバイス2", "スタイルアドバイス3"]
}

scoresは3タイプの可能性を合計100になるよう整数で返してください。bodyTypeは最も高いスコアのタイプと一致させてください。
observationsは上記STEPで実際に確認した内容を具体的に記述してください。写真を見た人が「たしかに！」と共感できる内容にしてください。`;

/**
 * 画像（base64）を Claude Vision で分析し骨格タイプを返す
 * @param imageBase64 base64エンコードされた画像データ（data:image/... プレフィックスなし）
 * @param mimeType 画像の MIME タイプ
 */
export async function analyzeBodyType(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<DiagnosisResult> {
  const feedbackNote = await getFeedbackNote();
  const systemPrompt = BASE_SYSTEM_PROMPT + feedbackNote;

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'この画像の人物の骨格タイプを診断し、指定された JSON 形式で返してください。',
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    // Anthropic SDK エラーの詳細をログに出す
    const e = err as { status?: number; message?: string; error?: unknown };
    console.error('[Analyze] Anthropic API error — status:', e.status, '| message:', e.message, '| body:', JSON.stringify(e.error));
    throw err;
  }

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON を抽出してパース
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Claude がテキストで拒否した場合（コンテンツポリシー等）
    console.error('[Analyze] No JSON in response — stop_reason:', response.stop_reason, '| raw:', rawText.slice(0, 300));
    throw new Error(`NO_JSON:${response.stop_reason}:${rawText.slice(0, 100)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as DiagnosisResult;

  // 最低限のバリデーション
  const validTypes: BodyType[] = ['straight', 'wave', 'natural'];
  if (!validTypes.includes(parsed.bodyType)) {
    throw new Error(`不明な骨格タイプ: ${parsed.bodyType}`);
  }

  return { ...parsed, rawResponse: rawText };
}
