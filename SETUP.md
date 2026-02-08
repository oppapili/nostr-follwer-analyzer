# セットアップガイド

## 前提条件

- Node.js (v18 以上)
- npm (v9 以上)
- Angular CLI (v17 以上)

## インストール手順

### 1. 依存関係のインストール

#### Linux/Mac の場合:
```bash
chmod +x install.sh
./install.sh
```

#### Windows の場合:
```cmd
install.bat
```

または、直接 npm コマンドを実行:
```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm start
```

ブラウザで `http://localhost:4200/` を開いてください。

### 3. プロダクションビルド

```bash
npm run build
```

ビルド成果物は `dist/nostr-follower-analyzer/browser/` に出力されます。

## GitHub Pages へのデプロイ

### 初回デプロイ

1. GitHub リポジトリを作成
2. リポジトリ名を `nostr-follower-analyzer` に設定（または package.json の deploy スクリプトを修正）
3. 以下のコマンドを実行:

```bash
npm run deploy
```

### デプロイ後の設定

1. GitHub リポジトリの Settings > Pages に移動
2. Source を `gh-pages` ブランチに設定
3. 数分後、`https://<username>.github.io/nostr-follower-analyzer/` でアクセス可能になります

## プロジェクト構造

```
nostr-follower-analyzer/
├── src/
│   ├── app/
│   │   ├── app.component.ts        # ルートコンポーネント
│   │   ├── app.component.html
│   │   ├── app.component.css
│   │   ├── app.module.ts           # アプリケーションモジュール
│   │   └── app-routing.module.ts  # ルーティング設定
│   ├── assets/                     # 静的ファイル
│   ├── environments/               # 環境設定
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html                  # メインHTML
│   ├── main.ts                     # エントリーポイント
│   ├── styles.css                  # グローバルスタイル
│   └── 404.html                    # GitHub Pages SPA対応
├── angular.json                    # Angular設定
├── package.json                    # 依存関係
├── tsconfig.json                   # TypeScript設定
└── karma.conf.js                   # テスト設定
```

## 次のステップ

プロジェクトのセットアップが完了しました。次は以下のタスクを実装してください:

1. データモデルとインターフェースの定義
2. NostrService の実装
3. Nip07Service の実装
4. コンポーネントの実装

詳細は `.kiro/specs/nostr-follower-analyzer/tasks.md` を参照してください。

## トラブルシューティング

### WSL環境でのインストールエラー

WSL環境で `npm install` がエラーになる場合は、WSL内で直接実行してください:

```bash
# WSLターミナルを開く
cd /home/oppapili/Programming/nostr-follower-organizer
npm install
```

### ポート4200が使用中

別のポートで起動する場合:

```bash
ng serve --port 4201
```

### ビルドエラー

キャッシュをクリアして再ビルド:

```bash
rm -rf node_modules .angular
npm install
npm run build
```
