// lib/analyze.ts
// ============================================================
// Claude Vision API による骨格診断ロジック
// Google Cloud Vision より Claude の方が
// ファッション・身体的特徴の推論に優れているため採用
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { DiagnosisResult, BodyType } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `あなたはプロのファッションスタイリストであり、骨格診断の専門家です。
提供された画像から、日本の骨格診断理論に基づき「ストレート・ウェーブ・ナチュラル」の3タイプを判定してください。

## 判定基準
### ストレート (Straight)
- 骨格がしっかりしており、筋肉に立体感がある
- 胸の厚みがあり、ボディラインがメリハリ型
- 太ると上半身（特に胸・お腹）に脂肪がつきやすい
- 首が短めで、鎖骨がわかりにくいことが多い

### ウェーブ (Wave)
- 骨格が細く、筋肉よりも脂肪がつきやすい柔らかい体型
- 上半身が薄く、下半身（腰・太もも）に肉がつきやすい
- 肋骨のラインがわかりにくく、ウエストが長め
- 膝が小さく丸みを帯びている

### ナチュラル (Natural)
- 骨格が大きく、関節が目立つ
- 肩幅が広く、フレームがしっかりしている
- 筋肉・脂肪がつきにくい体型
- 鎖骨や膝がはっきりと出ており、手足が長め

## 重要な注意事項
- 医療診断ではなく、あくまでファッションスタイリングの参考として判定する
- 画像が不鮮明または分析が難しい場合は正直に伝える
- 特定の人物を批判したり、ネガティブな表現は使わない

## レスポンス形式
必ず以下の JSON 形式のみで返答してください：
{
  "bodyType": "straight" | "wave" | "natural",
  "confidence": "high" | "medium" | "low",
  "description": "このタイプの特徴を2〜3文で説明",
  "characteristics": ["特徴1", "特徴2", "特徴3"],
  "styleAdvice": ["スタイルアドバイス1", "スタイルアドバイス2", "スタイルアドバイス3"]
}`;

/**
 * 画像（base64）を Claude Vision で分析し骨格タイプを返す
 * @param imageBase64 base64エンコードされた画像データ（data:image/... プレフィックスなし）
 * @param mimeType 画像の MIME タイプ
 */
export async function analyzeBodyType(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<DiagnosisResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
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

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON を抽出してパース
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI からの有効なレスポンスが得られませんでした');
  }

  const parsed = JSON.parse(jsonMatch[0]) as DiagnosisResult;

  // 最低限のバリデーション
  const validTypes: BodyType[] = ['straight', 'wave', 'natural'];
  if (!validTypes.includes(parsed.bodyType)) {
    throw new Error(`不明な骨格タイプ: ${parsed.bodyType}`);
  }

  return { ...parsed, rawResponse: rawText };
}
