# Markdown Co-Editor

Markdownの共同書籍執筆・編集用プレビューアプリケーション

## 概要

このアプリケーションは、Gitの知識のない編集者がMarkdown原稿に編集履歴を保持したままコメントを付加できるようにするツールです。

### 主な機能

- **2ペインレイアウト**: 左側にMonaco EditorでシンタックスハイライトされたMarkdownソース、右側にHTMLプレビュー
- **コメント機能**: Markdownソースの任意の選択範囲に対してコメントを追加可能
- **マルチユーザー対応**: Cloudflare Accessによる認証で複数ユーザーの共同編集をサポート
- **JSONベースの簡易データベース**: コメント履歴をローカルJSONファイルで管理し、Gitで履歴管理
- **Pandoc統合**: サーバーサイドでPandocを使用し、BibTeX/pandoc-citeprocによる文献管理をサポート
- **リアルタイムプレビュー**: Markdown編集時に即座にHTMLプレビューを更新
- **Docker対応**: docker-composeで簡単にデプロイ可能

## 前提条件

以下のソフトウェアがインストールされている必要があります：

- Node.js (v18以上推奨)
- npm または yarn
- Pandoc (文献管理機能を使う場合は pandoc-citeproc も必要)

### Pandocのインストール

**macOS:**
```bash
brew install pandoc
```

**Ubuntu/Debian:**
```bash
sudo apt-get install pandoc pandoc-citeproc
```

**Windows:**
[Pandoc公式サイト](https://pandoc.org/installing.html)からインストーラーをダウンロード

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. データディレクトリの準備

`data/`ディレクトリには以下のファイルが配置されます：

- `*.md` - Markdownソースファイル
- `*.bib` - BibTeX形式の文献データベース
- `comments.json` - コメント履歴（自動生成）

サンプルファイルが既に含まれているので、すぐに試すことができます。

### 3. アプリケーションの起動

開発モード（サーバーとクライアントを同時起動）：

```bash
npm run dev
```

これにより以下が起動します：
- フロントエンド開発サーバー: http://localhost:3000
- バックエンドAPIサーバー: http://localhost:3001

ブラウザで http://localhost:3000 にアクセスしてください。

## 使い方

### Markdownファイルの閲覧

1. ヘッダーのドロップダウンから閲覧したいMarkdownファイルを選択
2. 左ペインにMarkdownソース、右ペインにHTMLプレビューが表示される

### コメントの追加

1. 左ペイン（エディタ）でコメントを付けたいテキスト範囲を選択
2. 右側のコメントパネルにフォームが表示される
3. コメント内容を入力して「Add Comment」をクリック（ユーザー名は認証情報から自動設定）
4. 追加されたコメントがエディタ上でハイライト表示される

### コメントの管理

- **表示**: コメントパネルで全てのコメントとその作成者を確認できる
- **解決**: 「Resolve」ボタンで解決済みとしてマーク（解決者の情報も記録される）
- **削除**: 「Delete」ボタンでコメントを削除
- **フィルター**: "Show resolved"チェックボックスで解決済みコメントの表示/非表示を切り替え

### 文献引用の使用

1. `data/references.bib`にBibTeX形式で文献情報を追加
2. Markdownファイル内で `[@citation-key]` の形式で引用
3. Pandocが自動的に文献リストを生成

## プロジェクト構成

```
markdown-co-editor/
├── src/                    # フロントエンドソースコード
│   ├── components/         # Reactコンポーネント
│   │   ├── Editor.tsx      # Monaco Editorラッパー
│   │   ├── Preview.tsx     # HTMLプレビュー
│   │   └── CommentPanel.tsx # コメント管理UI
│   ├── App.tsx             # メインアプリケーション
│   └── main.tsx            # エントリーポイント
├── server/                 # バックエンドサーバー
│   ├── index.ts            # Express APIサーバー
│   └── auth.ts             # Cloudflare Access認証ミドルウェア
├── types/                  # TypeScript型定義
│   └── shared.ts           # 共有型定義
├── data/                   # データファイル
│   ├── *.md                # Markdownファイル
│   ├── *.bib               # BibTeX文献データベース
│   └── comments.json       # コメント履歴（Git管理対象）
├── package.json            # プロジェクト設定
├── tsconfig.json           # TypeScript設定（フロントエンド）
├── tsconfig.server.json    # TypeScript設定（サーバー）
├── vite.config.ts          # Vite設定
├── Dockerfile              # Dockerイメージビルド定義
├── docker-compose.yml      # Docker Composeデプロイ設定
└── .env.example            # 環境変数のテンプレート
```

## API エンドポイント

### 認証関連

- `GET /api/user` - 現在のユーザー情報取得（要認証）

### コメント関連

- `GET /api/comments` - 全コメント取得
- `GET /api/comments/:filename` - 特定ファイルのコメント取得
- `POST /api/comments` - コメント追加（要認証）
- `PUT /api/comments/:id` - コメント更新（要認証）
- `DELETE /api/comments/:id` - コメント削除（要認証）

### ファイル関連

- `GET /api/files` - 利用可能なMarkdownファイル一覧
- `GET /api/markdown/:filename` - Markdownファイル内容取得
- `POST /api/render` - Markdownをレンダリング（Pandoc使用）

## 開発

### ビルド

```bash
# フロントエンドとバックエンドの両方をビルド
npm run build
```

### 本番環境での起動

```bash
npm start
```

### カスタマイズ

- **ポート変更**: `vite.config.ts`と`server/index.ts`でポート番号を変更
- **スタイリング**: `src/components/*.css`でUIスタイルをカスタマイズ
- **Pandocオプション**: `server/index.ts`のレンダリング処理でPandocコマンドをカスタマイズ

## Gitでの履歴管理

`data/comments.json`ファイルをGitリポジトリで管理することで、コメントの履歴を追跡できます：

```bash
git add data/comments.json
git commit -m "Add review comments"
git push
```

チームメンバーは以下でコメントを同期できます：

```bash
git pull
```

## Dockerでのデプロイ

### 前提条件

- Docker
- Docker Compose

### 1. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集して環境変数を設定：

```bash
# 開発環境（Cloudflare Access無効）
NODE_ENV=production
PORT=3001
CF_ACCESS_ENABLED=false
DEV_USER_EMAIL=your@example.com
DEV_USER_NAME=Your Name

# 本番環境（Cloudflare Access有効）の場合
# CF_ACCESS_ENABLED=true
# CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com
# CF_ACCESS_AUD=your-application-aud-tag
```

### 2. Docker Composeで起動

```bash
docker-compose up -d
```

アプリケーションは http://localhost:3001 で起動します。

### 3. ログの確認

```bash
docker-compose logs -f
```

### 4. 停止

```bash
docker-compose down
```

### データの永続化

`data/`ディレクトリはホストマシンとコンテナ間でマウントされているため、Markdownファイルとコメント履歴は永続化されます。

## Cloudflare Accessによる認証

### Cloudflare Accessの設定

1. **Cloudflare Accessアプリケーションの作成**
   - Cloudflareダッシュボードで新しいアプリケーションを作成
   - アプリケーションドメインを設定（例: `markdown-editor.yourteam.com`）
   - アクセスポリシーを設定（例: 特定のメールドメインのみ許可）

2. **環境変数の設定**
   
   `.env`ファイルに以下を追加：
   
   ```bash
   CF_ACCESS_ENABLED=true
   CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com
   CF_ACCESS_AUD=your-application-aud-tag
   ```

3. **アプリケーションの再起動**
   
   ```bash
   docker-compose restart
   ```

### 認証の動作

- Cloudflare Accessが有効な場合、全てのリクエストでCloudflareが提供する認証ヘッダーを検証
- ユーザー情報（メールアドレス、名前）は自動的に取得され、コメントに関連付けられる
- 開発環境では`CF_ACCESS_ENABLED=false`に設定することで認証をバイパス可能

## 技術スタック

- **フロントエンド**: React, TypeScript, Monaco Editor, Vite
- **バックエンド**: Node.js, Express, TypeScript
- **認証**: Cloudflare Access
- **レンダリング**: Pandoc
- **文献管理**: BibTeX, pandoc-citeproc
- **デプロイ**: Docker, Docker Compose

## セキュリティに関する注意

このアプリケーションは、Cloudflare Accessによる認証を使用することで安全な共同編集環境を提供します。

### 本番環境でのセキュリティ対策

- **Cloudflare Access**: 必ずCloudflare Accessを有効にして認証を実装
- **HTTPS**: Cloudflare経由で必ずHTTPSを使用
- **レート制限**: 必要に応じてAPIエンドポイントにレート制限を実装
- **入力検証**: ファイル名とパスの検証を適切に実施
- **定期的なバックアップ**: `data/`ディレクトリを定期的にバックアップ

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。