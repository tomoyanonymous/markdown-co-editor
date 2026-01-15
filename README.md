# Markdown Co-Editor

Markdownの共同書籍執筆・編集用プレビューアプリケーション

## 概要

このアプリケーションは、Gitの知識のない編集者がMarkdown原稿に編集履歴を保持したままコメントを付加できるようにするツールです。

### 主な機能

- **2ペインレイアウト**: 左側にMonaco EditorでシンタックスハイライトされたMarkdownソース、右側にHTMLプレビュー
- **コメント機能**: Markdownソースの任意の選択範囲に対してコメントを追加可能
- **JSONベースの簡易データベース**: コメント履歴をローカルJSONファイルで管理し、Gitで履歴管理
- **Pandoc統合**: サーバーサイドでPandocを使用し、BibTeX/pandoc-citeprocによる文献管理をサポート
- **リアルタイムプレビュー**: Markdown編集時に即座にHTMLプレビューを更新

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
3. 名前とコメント内容を入力して「Add Comment」をクリック
4. 追加されたコメントがエディタ上でハイライト表示される

### コメントの管理

- **表示**: コメントパネルで全てのコメントを確認できる
- **解決**: 「Resolve」ボタンで解決済みとしてマーク
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
│   └── index.ts            # Express APIサーバー
├── types/                  # TypeScript型定義
│   └── shared.ts           # 共有型定義
├── data/                   # データファイル
│   ├── *.md                # Markdownファイル
│   ├── *.bib               # BibTeX文献データベース
│   └── comments.json       # コメント履歴（Git管理対象）
├── package.json            # プロジェクト設定
├── tsconfig.json           # TypeScript設定（フロントエンド）
├── tsconfig.server.json    # TypeScript設定（サーバー）
└── vite.config.ts          # Vite設定
```

## API エンドポイント

### コメント関連

- `GET /api/comments` - 全コメント取得
- `GET /api/comments/:filename` - 特定ファイルのコメント取得
- `POST /api/comments` - コメント追加
- `PUT /api/comments/:id` - コメント更新
- `DELETE /api/comments/:id` - コメント削除

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

## 技術スタック

- **フロントエンド**: React, TypeScript, Monaco Editor, Vite
- **バックエンド**: Node.js, Express, TypeScript
- **レンダリング**: Pandoc
- **文献管理**: BibTeX, pandoc-citeproc

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。