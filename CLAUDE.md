# SKELÉ — 開発・デプロイ運用ルール

## 開発フロー（必ず守ること）

1. **修正を実装する**
2. **開発環境で動作確認**
   ```bash
   npm run dev
   ```
   → `http://localhost:3000` で実際に操作して確認
3. **ユーザーに確認を取る** ← ここで「問題ない」と言われるまで待つ
4. **本番にデプロイ（git push）**
   ```bash
   git add <files>
   git commit -m "..."
   git push origin main
   ```

> push すると Vercel が自動デプロイする。確認前に push しないこと。

---

## Git / Vercel アカウント情報

| 項目 | 値 |
|------|-----|
| GitHub リポジトリ | `https://github.com/kom26/skeletal-diagnosis` |
| GitHub ユーザー | `kom26` |
| git remote URL | `https://kom26@github.com/kom26/skeletal-diagnosis.git` |
| Vercel プロジェクト | `skeletal-diagnosis`（kom26 アカウント） |
| デプロイブランチ | `main` |

> 複数の Vercel プロジェクトを持っている場合、**必ず `kom26` アカウントの `skeletal-diagnosis` プロジェクト**であることを確認してからデプロイ操作を行うこと。

---

## APIコスト管理（必ず守ること）

外部APIの呼び出し回数や費用が増加する可能性のある修正は、**実装前にユーザーに確認を取ること**。

対象となる変更の例：
- Anthropic API への新規コール、または1リクエストあたりのコール数増加
- 既存のAPIレスポンスに大幅なトークン追加（プロンプト拡張など）
- 楽天・Google などの外部APIを新たに追加・呼び出す処理
- 診断フロー以外のタイミングでAPIを呼び出す処理

同一コール内でのレスポンスフィールド追加（トークン微増）は確認不要だが、その旨をコメントで伝えること。

---

## 技術スタック

- Next.js 16 App Router (Turbopack)
- Anthropic Claude claude-sonnet-4-6 Vision API（骨格診断）
- Supabase（DB: `diagnosis_logs` テーブル、Storage: 診断画像）
- Vercel（ホスティング）

## 環境変数（`.env.local`）

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_KEY=
```
