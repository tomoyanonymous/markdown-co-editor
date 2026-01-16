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
- **編集**: 「Edit」ボタンでコメントの内容を編集できる（編集履歴も記録される）
- **返信**: 「Reply」ボタンでコメントに対して返信を追加できる（スレッド形式で表示）
- **解決**: 「Resolve」ボタンで解決済みとしてマーク（解決者の情報も記録される）
- **削除**: 「Delete」ボタンでコメントを削除
- **フィルター**: "Show resolved"チェックボックスで解決済みコメントの表示/非表示を切り替え

### コメント引用の使用

1. `data/references.bib`にBibTeX形式で文献情報を追加
2. Markdownファイル内で `[@citation-key]` の形式で引用
3. Pandocが自動的に文献リストを生成

### Gitによる同期

コメントの変更をGitリポジトリに自動的に同期できます：

1. **環境変数の設定**（`.env`ファイルまたは環境変数として設定）：
   ```bash
   GIT_REPO_URL=https://github.com/username/repository.git
   GIT_USERNAME=your-github-username
   GIT_ACCESS_TOKEN=your-github-personal-access-token
   ```

2. **同期の実行**：
   - ヘッダーの「Sync」ボタンをクリック
   - コメントの変更が自動的にコミットされ、リモートリポジトリにプッシュされる
   - 同期が成功すると、成功メッセージが表示される

3. **自動プル機能**：
   - サーバーは定期的にリモートリポジトリから変更をプルします
   - デフォルトでは5分間隔で自動プルが実行されます
   - `GIT_PULL_INTERVAL`環境変数でプル間隔をミリ秒単位で設定可能（例：`300000`で5分）
   - 他のユーザーが行った変更を自動的に取り込むことができます

4. **注意点**：
   - 環境変数が設定されていない場合は、エラーメッセージが表示される
   - 変更がない場合は「No changes to sync」と表示される
   - GitHubのPersonal Access Tokenは`repo`スコープが必要
   - **セキュリティ注意**: 
     - Gitの認証情報はプロセスリストに一時的に表示される可能性があるため、本番環境では適切なアクセス制御を実施してください
     - 本番環境では、Sync APIエンドポイントにレート制限を実装することを推奨します

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
  - `inReplyTo`フィールドを含めることで、既存のコメントへの返信として追加可能
- `PUT /api/comments/:id` - コメント更新（要認証）
  - `text`フィールドを変更することでコメントの編集が可能
  - `resolved`フィールドで解決/未解決を切り替え可能
- `DELETE /api/comments/:id` - コメント削除（要認証）

### Git同期関連

- `POST /api/sync` - コメントの変更をGitリポジトリに同期（要認証）
  - 環境変数`GIT_REPO_URL`、`GIT_USERNAME`、`GIT_ACCESS_TOKEN`が必要

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

`data/comments.json`ファイルをGitリポジトリで管理することで、コメントの履歴を追跡できます。

### 手動での同期

```bash
git add data/comments.json
git commit -m "Add review comments"
git push
```

チームメンバーは以下でコメントを同期できます：

```bash
git pull
```

### 自動同期機能

環境変数を設定することで、UIから直接Gitリポジトリに同期できます：

1. `.env`ファイルに以下を設定：
   ```bash
   GIT_REPO_URL=https://github.com/username/repository.git
   GIT_USERNAME=your-github-username
   GIT_ACCESS_TOKEN=your-github-personal-access-token
   ```

2. アプリケーションを再起動

3. ヘッダーの「Sync」ボタンをクリックして同期

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

# 本番環境（Cloudflare Access有効）の場合は以下のコメントを外して設定
# CF_ACCESS_ENABLED=true
# CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com
# CF_ACCESS_AUD=your-application-aud-tag
```

**重要**: `.env`ファイルに設定した環境変数は`docker-compose.yml`を通じてコンテナに渡されます。`CF_ACCESS_ENABLED=true`に設定する場合は、必ず`CF_ACCESS_TEAM_DOMAIN`と`CF_ACCESS_AUD`も設定してください。

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

**セキュリティノート:**
現在の実装は、Cloudflare Accessが提供するヘッダーを信頼する方式です。より高度なセキュリティが必要な場合は、JWTトークンをCloudflareの公開鍵で検証する実装を追加することを推奨します。詳細は[Cloudflare公式ドキュメント](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)を参照してください。

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