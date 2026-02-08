# NostrFollowerAnalyzer

Nostr プロトコルを利用した静的 Web アプリケーションです。ユーザーは NIP-07 拡張機能（Alby, nos2x など）を使用してログインし、自分のフォロワーを取得して、各フォロワーの活動状況（最新投稿、直近30日間の投稿数推移）を可視化します。

## 開発サーバー

開発サーバーを起動するには以下を実行してください:

```bash
npm start
```

ブラウザで `http://localhost:4200/` を開いてください。

## ビルド

プロダクションビルドを実行するには:

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに出力されます。

## GitHub Pages へのデプロイ

```bash
npm run deploy
```

## テスト

ユニットテストを実行するには:

```bash
npm test
```

## 技術スタック

- Angular 17
- Chart.js / ng2-charts
- RxJS
- TypeScript
- Nostr Protocol (NIP-01, NIP-07)

## 機能

- NIP-07 拡張機能を使用したログイン
- フォロワーリストの取得と表示
- 各フォロワーのメタデータ表示
- 最新投稿の表示
- 直近30日間の投稿数推移グラフ
- フォロー状態の表示とフォロー機能
