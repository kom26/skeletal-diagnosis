# SKELÉ — AI骨格診断 MVP

写真1枚からAIが骨格タイプ（ストレート・ウェーブ・ナチュラル）を診断するWebアプリのMVPです。

---

## フォルダ構成

```
skeletal-diagnosis/
├── app/
│   ├── layout.tsx            # ルートレイアウト（フォント設定）
│   ├── globals.css           # グローバルスタイル
│   ├── page.tsx              # メインページ（アップロード＋診断UI）
│   ├── result/
│   │   └── page.tsx          # 診断結果表示ページ
│   ├── admin/
│   │   └── page.tsx          # 管理者ダッシュボード
│   └── api/
│       ├── diagnose/
│       │   └── route.ts      # ★ 診断APIエンドポイント（APIキー隔離）
│       └── admin/
│           └── logs/
│               └── route.ts  # 管理者用ログ取得API
├── components/
│   ├── ImageUploader.tsx     # 画像アップロード＋クロップ＋ブラウザ側圧縮
│   ├── DiagnosisButton.tsx   # 診断実行ボタン
│   └── ResultCard.tsx        # 診断結果表示カード
├── lib/
│   ├── supabase.ts           # Supabaseクライアント（client/admin）
│   ├── rateLimit.ts          # ★ レート制限ロジック（コスト制御の要）
│   └── analyze.ts            # Claude Vision API による画像分析
├── types/
│   └── index.ts              # TypeScript 型定義
├── supabase-schema.sql       # DBスキーマ（Supabaseで実行）
├── .env.local.example        # 環境変数テンプレート
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 必要な環境変数

| 変数名 | 説明 | 取得先 |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー（公開可） | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（**秘密**） | 同上 |
| `ANTHROPIC_API_KEY` | Claude API キー（**秘密**） | console.anthropic.com |
| `DAILY_LIMIT` | 1日の診断上限回数（デフォルト: `100`） | 自分で設定 |
| `IP_HOURLY_LIMIT` | 同一IP・1時間の上限（デフォルト: `5`） | 自分で設定 |
| `ADMIN_SECRET_KEY` | 管理画面のパスワード（**秘密**） | 自分で設定 |

> ⚠️ `NEXT_PUBLIC_` で始まらない変数は**フロントエンドに絶対に露出しません**。
> APIキーはすべて Route Handler（サーバーサイド）のみで使用します。

---

## デプロイ手順（Vercel × Supabase）

### ステップ1: Supabase のセットアップ

1. [supabase.com](https://supabase.com) にアクセスし、無料アカウントを作成
2. **New Project** をクリックしてプロジェクトを作成
3. **SQL Editor** を開き、`supabase-schema.sql` の内容をすべてコピーして実行
4. **Storage > New Bucket** から以下の設定でバケットを作成:
   - バケット名: `diagnosis-images`
   - Public: **OFF**（非公開）
   - File size limit: `5242880`（5MB）
5. **Settings > API** から以下の値をメモ:
   - Project URL
   - `anon` public key
   - `service_role` secret key（**絶対に公開しないこと**）

### ステップ2: Anthropic API キーの取得

1. [console.anthropic.com](https://console.anthropic.com) にアクセス
2. API Keys メニューから新しいキーを作成
3. キーをコピーしてメモ（画面を閉じると再表示できません）
4. **使用量に上限を設定することを強く推奨**: Settings > Limits から月次予算を設定

### ステップ3: ローカルでの動作確認

```bash
# リポジトリをクローン（または ZIP を解凍）
git clone <your-repo-url>
cd skeletal-diagnosis

# 依存パッケージをインストール
npm install

# 環境変数ファイルを作成
cp .env.local.example .env.local
# .env.local を開き、各値を入力する

# 開発サーバーを起動
npm run dev
# → http://localhost:3000 で確認
```

### ステップ4: GitHub にプッシュ

```bash
git init
git add .
git commit -m "Initial commit"

# GitHub で新しいリポジトリを作成し、以下を実行
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

### ステップ5: Vercel へのデプロイ

1. [vercel.com](https://vercel.com) にアクセスし、GitHub アカウントでログイン
2. **Add New Project** から先ほどのリポジトリを選択
3. **Environment Variables** セクションで以下をすべて入力:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY     = eyJ...
   ANTHROPIC_API_KEY             = sk-ant-...
   DAILY_LIMIT                   = 100
   IP_HOURLY_LIMIT               = 5
   ADMIN_SECRET_KEY              = (強力なランダム文字列)
   ```
4. **Deploy** をクリック（2〜3分でデプロイ完了）
5. 表示された URL（例: `https://your-app.vercel.app`）でアクセス確認

### ステップ6: 管理画面へのアクセス

- URL: `https://your-app.vercel.app/admin`
- `ADMIN_SECRET_KEY` に設定した値を入力してログイン

---

## コスト管理

### Anthropic API の料金目安

| モデル | 入力 | 出力 |
|--------|------|------|
| Claude Sonnet 4 | $3 / 1M tokens | $15 / 1M tokens |

1回の診断あたり、入力（画像＋テキスト）で約 1,500〜3,000 tokens が目安。
**1日100回の制限 = 1日あたり最大 $1〜2 程度（画像サイズによる）**

### コスト制御の仕組み

1. **日次上限** (`DAILY_LIMIT`): Supabase の `daily_counts` テーブルで管理。
   上限に達すると API を呼び出さずにエラーを返す。

2. **IP 制限** (`IP_HOURLY_LIMIT`): `ip_rate_limits` テーブルで1時間ウィンドウを管理。
   連投・スクレイピングを防止。

3. **画像圧縮**: ブラウザ側で送信前に 1024px × JPEG 82% に圧縮。
   APIへの送信トークン数を最小化。

4. **Anthropic コンソールの予算アラート**: 月次上限をコンソールで設定することを強く推奨。

---

## AI分析について（Google Cloud Vision との比較）

このMVPでは **Anthropic Claude Sonnet** を画像分析に採用しています。

| 比較項目 | Claude Vision | Google Cloud Vision |
|----------|--------------|---------------------|
| 骨格診断の精度 | ◎ 高い（推論・文脈理解） | △ 低い（ラベル検出のみ） |
| 日本語の説明文生成 | ◎ 得意 | × 別途 LLM が必要 |
| コスト | 1回 $0.01〜0.02 | 1回 $0.0015〜0.003 |
| セットアップの簡単さ | ◎ API キーのみ | △ GCP プロジェクト設定が必要 |

骨格診断は「特徴の言語的推論」が必要なため、Vision API 単体では不十分です。
Claude Vision は画像を見て判断し、日本語で結果まで返せるため、このユースケースに最適です。

---

## 今後の拡張案

- [ ] Stripe 連携による有料プラン（月10回まで無料など）
- [ ] ユーザー認証（Supabase Auth）でアカウントごとの履歴管理
- [ ] 診断結果のSNSシェア機能（OGP画像生成）
- [ ] プロンプトのチューニングによる精度向上
- [ ] 管理画面での画像プレビュー表示
