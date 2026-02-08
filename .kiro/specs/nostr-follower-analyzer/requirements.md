# Requirements Document

## Introduction

このアプリケーションは、Nostr プロトコルを利用した静的 Web アプリケーションです。ユーザーは NIP-07 拡張機能（Alby, nos2x など）を使用してログインし、自分のフォロワーを取得して、各フォロワーの活動状況（最新投稿、直近30日間の投稿数推移）を可視化します。既存の Nostr Relay（wss://yabu.me）をクライアントとして利用し、GitHub Pages 上で動作する完全な静的アプリケーションとして実装されます。

## Requirements

### Requirement 1: NIP-07 ログイン機能

**User Story:** As a ユーザー, I want NIP-07 拡張機能を使用してログインしたい, so that 自分のフォロワー情報を取得できる

#### Acceptance Criteria

1. WHEN ユーザーがアプリケーションを開く THEN システム SHALL NIP-07 拡張機能（window.nostr）の存在を確認する
2. IF NIP-07 拡張機能が存在しない THEN システム SHALL 「Nostr 拡張機能（Alby, nos2x など）をインストールしてください」というメッセージを表示する
3. IF NIP-07 拡張機能が存在する THEN システム SHALL 「ログイン」ボタンを表示する
4. WHEN ユーザーが「ログイン」ボタンをクリックする THEN システム SHALL window.nostr.getPublicKey() を呼び出す
5. WHEN pubkey が取得される THEN システム SHALL ログイン状態を保持し、フォロワー取得処理を開始する
6. WHEN ログインが成功する THEN システム SHALL ユーザーの pubkey（省略表示）とログアウトボタンを表示する
7. IF getPublicKey() がエラーを返す THEN システム SHALL 「ログインに失敗しました」というエラーメッセージを表示する
8. WHEN ユーザーが「ログアウト」ボタンをクリックする THEN システム SHALL ログイン状態をクリアし、初期画面に戻る

### Requirement 2: Nostr Relay との WebSocket 通信

**User Story:** As a システム, I want wss://yabu.me に WebSocket 接続してイベントを取得したい, so that Nostr プロトコルに準拠したデータ取得ができる

#### Acceptance Criteria

1. WHEN データ取得処理が開始される THEN システム SHALL wss://yabu.me への WebSocket 接続を確立する
2. WHEN WebSocket 接続が確立される THEN システム SHALL NIP-01 に準拠した REQ メッセージを送信する
3. WHEN Relay からイベントが返される THEN システム SHALL イベントデータを解析し、適切な形式で保持する
4. WHEN Relay から EOSE（End of Stored Events）メッセージを受信する THEN システム SHALL そのサブスクリプションの完了を認識する
5. WHEN コンポーネントが破棄される THEN システム SHALL すべての WebSocket サブスクリプションをクリーンアップし、接続を閉じる
6. IF WebSocket 接続エラーが発生した THEN システム SHALL ユーザーに理解可能なエラーメッセージを表示する

### Requirement 3: フォロワーリスト取得機能

**User Story:** As a システム, I want ログインユーザーのフォロワーを取得したい, so that フォロワー一覧を表示できる

#### Acceptance Criteria

1. WHEN ユーザーがログインする THEN システム SHALL ログインユーザーの pubkey を使用して kind:3（Contact List）イベントを Relay に問い合わせる
2. WHEN kind:3 イベントを検索する THEN システム SHALL ログインユーザーの pubkey を tags の p タグに含むイベントを検索する
3. WHEN フォロワーの kind:3 イベントが取得される THEN システム SHALL 各イベントの author（pubkey）をフォロワーとして抽出する
4. WHEN フォロワーリストが完成する THEN システム SHALL フォロワーの pubkey 一覧を保持する
5. IF フォロワーが見つからない THEN システム SHALL 「フォロワーが見つかりませんでした」というメッセージを表示する

### Requirement 4: フォロワーのメタデータ取得

**User Story:** As a ユーザー, I want 各フォロワーのユーザー情報を表示したい, so that フォロワーが誰なのか識別できる

#### Acceptance Criteria

1. WHEN フォロワーリストが取得される THEN システム SHALL 各フォロワーの kind:0（Metadata）イベントを取得する
2. WHEN kind:0 イベントが取得される THEN システム SHALL content フィールドを JSON として解析する
3. WHEN メタデータが解析される THEN システム SHALL name、display_name、picture フィールドを抽出する
4. IF メタデータが存在しない THEN システム SHALL pubkey の省略表示（最初と最後の数文字）を使用する
5. IF picture が存在する THEN システム SHALL プロフィール画像として表示する

### Requirement 5: フォロワーの最新投稿取得

**User Story:** As a ユーザー, I want 各フォロワーの最新投稿を確認したい, so that フォロワーの最近の活動を把握できる

#### Acceptance Criteria

1. WHEN フォロワーリストが取得される THEN システム SHALL 各フォロワーの kind:1（Text Note）イベントを最新1件取得する
2. WHEN kind:1 イベントが取得される THEN システム SHALL content と created_at を抽出する
3. WHEN 投稿日時を表示する THEN システム SHALL UNIX timestamp を人が読める形式（例: 2026年2月8日 14:30）に変換する
4. IF 最新投稿が存在しない THEN システム SHALL 「投稿がありません」と表示する

### Requirement 6: 直近30日間の投稿数集計と可視化

**User Story:** As a ユーザー, I want 各フォロワーの直近30日間の投稿数推移を折れ線グラフで確認したい, so that フォロワーの活動傾向を把握できる

#### Acceptance Criteria

1. WHEN フォロワーリストが取得される THEN システム SHALL 各フォロワーの直近30日間の kind:1 イベントを取得する
2. WHEN 投稿イベントが取得される THEN システム SHALL created_at を日単位で集計する
3. WHEN 日別投稿数が集計される THEN システム SHALL 30日分のデータを折れ線グラフとして描画する
4. WHEN グラフを描画する THEN システム SHALL X軸に日付、Y軸に投稿数を表示する
5. IF 30日間に投稿がない日がある THEN システム SHALL その日の投稿数を0として表示する

### Requirement 7: UI表示とローディング状態管理

**User Story:** As a ユーザー, I want データ取得中の状態を視覚的に確認したい, so that 処理が進行中であることを理解できる

#### Acceptance Criteria

1. WHEN データ取得処理が開始される THEN システム SHALL ローディングインジケーターを表示する
2. WHEN すべてのデータ取得が完了する THEN システム SHALL ローディングインジケーターを非表示にし、結果を表示する
3. WHEN フォロワー一覧を表示する THEN システム SHALL カードまたはテーブル形式で各フォロワーの情報を表示する
4. WHEN フォロワー一覧を表示する THEN システム SHALL 各フォロワーのメタデータ、最新投稿、直近30日間の投稿数折れ線グラフを同一画面に表示する
5. WHEN エラーが発生する THEN システム SHALL ユーザーが理解できる日本語のエラーメッセージを表示する

### Requirement 8: フォロワーリストのソート機能

**User Story:** As a ユーザー, I want フォロワーリストが一定の順序で表示されることを期待する, so that 毎回同じ順序で確認できる

#### Acceptance Criteria

1. WHEN フォロワーリストを表示する THEN システム SHALL データの取得順ではなく、一定のルールでソートする
2. WHEN フォロワーをソートする THEN システム SHALL ユーザー名（name または display_name）のアルファベット順でソートする
3. IF ユーザー名が存在しない THEN システム SHALL pubkey の16進数値でソートする
4. WHEN ソート処理を実行する THEN システム SHALL 大文字小文字を区別せずにソートする

### Requirement 9: フォロー状態表示とフォロー機能

**User Story:** As a ユーザー, I want フォロワー一覧で自分が既にフォローしているユーザーを識別したい, so that フォロー状態を把握し、必要に応じてフォローできる

#### Acceptance Criteria

1. WHEN ユーザーがログインする THEN システム SHALL ログインユーザーの kind:3（Contact List）イベントを取得する
2. WHEN 現在のフォローリストを取得する THEN システム SHALL 各フォロワーが既にフォロー済みかどうかを判定する
3. WHEN フォロワーカードを表示する THEN システム SHALL フォロー済みの場合は「フォロー中」ボタンを表示し、未フォローの場合は「フォロー」ボタンを表示する
4. WHEN 「フォロー中」ボタンが表示される THEN システム SHALL ボタンを無効化または視覚的に区別する
5. WHEN ユーザーが「フォロー」ボタンをクリックする THEN システム SHALL 現在のフォローリストに新しいフォロー対象の pubkey を追加する
6. WHEN 新しいフォローリストを作成する THEN システム SHALL NIP-07 の signEvent を使用してイベントに署名する
7. WHEN イベントに署名される THEN システム SHALL 署名済みイベントを Relay に送信する
8. WHEN フォロー処理が成功する THEN システム SHALL 「フォローしました」という成功メッセージを表示する
9. WHEN フォロー処理が成功する THEN システム SHALL 「フォロー」ボタンを「フォロー中」に変更し、無効化する
10. IF フォロー処理中にエラーが発生した THEN システム SHALL ユーザーに理解可能なエラーメッセージを表示する

### Requirement 10: GitHub Pages 対応

**User Story:** As a 開発者, I want アプリケーションを GitHub Pages にデプロイしたい, so that サーバーレスで公開できる

#### Acceptance Criteria

1. WHEN アプリケーションをビルドする THEN システム SHALL 静的ファイルのみを出力する
2. WHEN GitHub Pages にデプロイする THEN システム SHALL ベースパスを考慮したルーティング設定を使用する
3. WHEN アプリケーションが実行される THEN システム SHALL サーバーサイド処理を一切使用しない
4. WHEN アプリケーションが実行される THEN システム SHALL すべての処理をブラウザ上で完結させる

### Requirement 11: Angular アーキテクチャ

**User Story:** As a 開発者, I want 保守性の高いコード構造を実装したい, so that 将来的な拡張や修正が容易になる

#### Acceptance Criteria

1. WHEN アプリケーションを設計する THEN システム SHALL コンポーネントとサービスを明確に分離する
2. WHEN WebSocket 通信を実装する THEN システム SHALL すべての通信ロジックを専用サービスに集約する
3. WHEN 非同期処理を実装する THEN システム SHALL RxJS を使用したストリーム管理を行う
4. WHEN サブスクリプションを管理する THEN システム SHALL Subscription ID を適切に生成・管理する
5. WHEN コンポーネントが破棄される THEN システム SHALL すべての RxJS サブスクリプションを解除する

### Requirement 12: 非機能要件（実装禁止事項）

**User Story:** As a 開発者, I want アプリケーションのスコープを明確にしたい, so that 不要な機能を実装しない

#### Acceptance Criteria

1. WHEN アプリケーションを実装する THEN システム SHALL Relay の実装を行わない
2. WHEN アプリケーションを実装する THEN システム SHALL データベースへの保存機能を実装しない
3. WHEN アプリケーションを実装する THEN システム SHALL 投稿・鍵管理機能を実装しない
4. WHEN アプリケーションを実装する THEN システム SHALL 独自のログイン機能（パスワード認証等）を実装しない
5. WHEN アプリケーションを実装する THEN システム SHALL バックエンド API を実装しない
6. WHEN アプリケーションを実装する THEN システム SHALL pubkey の手動入力機能を実装しない
