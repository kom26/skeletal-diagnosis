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

## 絶対に守るべき前提
- 3タイプは日本人女性に均等に分布する。ウェーブへの偏りは厳禁
- 「細い体型＝ウェーブ」は根本的な誤り。体型の大小と骨格タイプは完全に独立した概念
- 「太い体型＝ストレート」も誤り
- BMIや体重・痩せ具合で骨格タイプを推測しない
- ポーズ・服装・角度でのバイアスを排除し、骨格構造のみで判定する
- 確信が持てない場合は confidence を低くし、スコア差を縮める

## 評価の3軸（すべての軸を評価してから総合判定する）

### 軸1：重心バランス
上半身と下半身のボリューム比率を分析する。

ストレート：上半身（胸・ウエスト周辺）にボリュームと厚みが集中。バスト位置が高く、ウエストから腰への絞りが明確
ウェーブ  ：下半身（腰・ヒップ）に重心とボリュームがある。上半身が薄く、胴が長め
ナチュラル ：上下ともボリュームが少なく、骨格フレームが均等に張り出す感じ。肩幅と腰幅が近い

### 軸2：身体の立体感と厚み
体の「肉感・弾力・厚み」対「ペタンコ感・骨っぽさ」を分析する。

ストレート：筋肉に弾力と厚みがあり立体的。横から見ると胸〜お腹の厚みがある。全体的にむっちりした印象
ウェーブ  ：上半身が薄くほぼ平ら。肌が柔らかく脂肪が下に集まる。全体的にふんわり柔らかい印象
ナチュラル ：筋肉も脂肪も少なくスリムだが、骨と関節が目立つ。ハンガーにかけたような印象

### 軸3：骨・関節と質感
骨の浮き出し・関節の大きさ・皮膚の質感を分析する。

ストレート：鎖骨は存在するが骨張った感じはない。膝は丸くお皿の輪郭がぼんやり。首が短め
ウェーブ  ：鎖骨が細く目立たない。膝が小さく丸くてお皿がほぼ見えない。関節が小さめで華奢
ナチュラル ：鎖骨が非常にくっきり浮き出る（最重要識別点）。膝・手首・足首の関節が大きく骨張る。肩甲骨が背中に出やすい

## ランドマーク検出と判定フロー

STEP1「鎖骨の浮き出し具合を確認」（軸3の最重要指標）
  → 鎖骨が深くはっきり浮き出ている    ：ナチュラル強く示唆（70点以上）
  → 鎖骨が見えるが骨張らない          ：ストレートまたはウェーブ
  → 鎖骨がほぼ見えない・細い          ：ウェーブ示唆

STEP2「上半身の立体感と重心を確認」（軸1+軸2）
  → 胸〜ウエストに厚みとハリがある    ：ストレート強く示唆
  → 上半身が薄く下半身に重心          ：ウェーブ示唆
  → 骨っぽく全体的にスリム            ：ナチュラル示唆

STEP3「膝・関節の形状を確認」（軸3の補助指標）
  → 膝が大きく関節が目立つ            ：ナチュラル
  → 膝が丸くお皿の輪郭ぼんやり        ：ストレート
  → 膝が小さく丸くお皿が見えない      ：ウェーブ

STEP4「比率・フレーム感を確認」（軸1の補助指標）
  → 肩幅＞腰幅かつ上半身にボリューム  ：ストレート
  → 肩幅＜腰幅かつ下半身にボリューム  ：ウェーブ
  → 肩幅≒腰幅でフレームが均等に広い  ：ナチュラル

## スコアリング基準
3軸それぞれに各タイプの一致度（0〜100）を仮評価し、加重平均でfinalスコアを算出する。
どのタイプも可能性ゼロにしてはならない（最低5点以上）。
スコア差が15点以下の場合は confidence を80以下にする。
最高スコアのタイプをbodyTypeに設定し、confidenceはそのタイプへの確信度を65〜100の整数で表す。

## レスポンス形式
必ず以下の JSON 形式のみで返答してください：
{
  "bodyType": "straight" | "wave" | "natural",
  "confidence": 65〜100の整数（確信が高いほど大きい値、最低65・最高100・1刻み）,
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

  // confidence を必ず数値 65-100 に正規化（旧形式の文字列にも対応）
  const rawConf = (parsed as unknown as Record<string, unknown>).confidence;
  const numConf = typeof rawConf === 'number' ? rawConf
    : rawConf === 'high' ? 90 : rawConf === 'medium' ? 75 : 65;
  parsed.confidence = Math.max(65, Math.min(100, Math.round(numConf)));

  return { ...parsed, rawResponse: rawText };
}
