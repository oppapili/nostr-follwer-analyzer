# Implementation Plan

- [x] 1. Angular プロジェクトのセットアップと基本構造の作成





  - Angular CLI を使用して新規プロジェクトを作成
  - 必要な依存関係（Chart.js, ng2-charts）をインストール
  - GitHub Pages デプロイ用の設定を追加
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 2. データモデルとインターフェースの定義
  - TypeScript インターフェース（NostrEvent, NostrFilter, Metadata, Note, Follower, DailyActivity）を作成
  - WebSocket メッセージ型（NostrMessage, NostrRequest, NostrClose）を定義
  - _Requirements: 11.1_

- [ ] 3. NostrService の実装
- [ ] 3.1 WebSocket 接続管理機能の実装
  - WebSocket 接続・切断メソッドを実装
  - サブスクリプション ID の生成・管理機能を実装
  - RxJS Subject を使用したイベントストリームを実装
  - _Requirements: 2.1, 2.2, 2.5, 11.2, 11.3_

- [ ] 3.2 イベント取得メソッドの実装
  - REQ メッセージの送信機能を実装
  - EOSE の検出と処理を実装
  - getFollowers() メソッドを実装（kind:3 の逆参照）
  - getMetadata() メソッドを実装（kind:0）
  - getLatestNote() メソッドを実装（kind:1、limit:1）
  - getActivityData() メソッドを実装（kind:1、直近30日）
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2_

- [ ] 3.3 イベント送信機能の実装
  - publishEvent() メソッドを実装
  - OK メッセージの処理を実装
  - _Requirements: 2.2, 9.7, 9.8_

- [ ] 3.4 エラーハンドリングの実装
  - WebSocket エラーのキャッチと処理
  - タイムアウト処理の実装
  - _Requirements: 2.6_

- [ ] 4. Nip07Service の実装
- [ ] 4.1 NIP-07 拡張機能の検出とログイン機能
  - isAvailable() メソッドを実装（window.nostr の存在確認）
  - login() メソッドを実装（getPublicKey() の呼び出し）
  - logout() メソッドを実装
  - _Requirements: 1.1, 1.2, 1.4, 1.8_

- [ ] 4.2 フォロー状態管理機能の実装
  - getCurrentUserContactList() メソッドを実装
  - checkFollowingStatus() メソッドを実装
  - _Requirements: 9.1, 9.2_

- [ ] 4.3 フォロー処理機能の実装
  - followUser() メソッドを実装
  - signEvent() を使用したイベント署名処理
  - _Requirements: 9.5, 9.6, 9.7_

- [ ] 5. DataProcessingService の実装
- [ ] 5.1 データ集計機能の実装
  - aggregateDailyActivity() メソッドを実装（日別投稿数の集計）
  - 欠損日のゼロ埋め処理を実装
  - _Requirements: 6.2, 6.3, 6.5_

- [ ] 5.2 ソート機能の実装
  - sortFollowers() メソッドを実装（ユーザー名またはpubkeyでソート）
  - 大文字小文字を区別しないソート処理
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 5.3 ユーティリティ関数の実装
  - formatTimestamp() メソッドを実装（UNIX timestamp → 人が読める形式）
  - truncatePubkey() メソッドを実装（pubkey の省略表示）
  - _Requirements: 5.3, 4.4_

- [ ] 6. LoginComponent の実装
- [ ] 6.1 ログインUIの作成
  - NIP-07 拡張機能の有無に応じた表示切り替え
  - ログインボタンの実装
  - エラーメッセージ表示エリアの実装
  - _Requirements: 1.2, 1.3_

- [ ] 6.2 ログイン処理の実装
  - Nip07Service.login() の呼び出し
  - ログイン成功時の loginSuccess イベント発火
  - エラーハンドリング
  - _Requirements: 1.4, 1.5, 1.7_

- [ ] 7. AppComponent の実装
- [ ] 7.1 ログイン状態管理の実装
  - isLoggedIn フラグの管理
  - currentUserPubkey の保持
  - ログアウト処理の実装
  - _Requirements: 1.5, 1.6, 1.8_

- [ ] 7.2 フォロワー取得処理の統合
  - LoginComponent からの loginSuccess イベントを受信
  - NostrService.getFollowers() の呼び出し
  - ローディング状態の管理
  - _Requirements: 3.1, 3.2, 3.3, 7.1_

- [ ] 7.3 フォロー処理の統合
  - FollowerListComponent からの followUser イベントを受信
  - Nip07Service.followUser() の呼び出し
  - 成功メッセージの表示
  - _Requirements: 9.5, 9.6, 9.7, 9.8, 9.9_

- [ ] 8. FollowerListComponent の実装
- [ ] 8.1 フォロワー一覧表示の実装
  - Follower[] を入力として受け取る
  - ソート済みフォロワーの表示
  - ローディング状態の表示
  - _Requirements: 7.2, 7.3, 7.4_

- [ ] 8.2 フォロー状態の表示
  - 各フォロワーの isFollowing フラグに基づいた表示切り替え
  - followUser イベントの発火
  - _Requirements: 9.3, 9.4_

- [ ] 9. FollowerCardComponent の実装
- [ ] 9.1 フォロワー情報の表示
  - プロフィール画像の表示
  - ユーザー名の表示（name, display_name, または pubkey 省略表示）
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ] 9.2 最新投稿の表示
  - 投稿内容（content）の表示
  - 投稿日時の表示（人が読める形式）
  - 投稿がない場合のメッセージ表示
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9.3 フォローボタンの実装
  - isFollowing に基づいたボタン表示の切り替え
  - follow イベントの発火
  - ボタンの無効化処理
  - _Requirements: 9.3, 9.4, 9.9_

- [ ] 10. ActivityChartComponent の実装
- [ ] 10.1 Chart.js の統合
  - ng2-charts の設定
  - 折れ線グラフの基本設定
  - _Requirements: 6.3, 6.4_

- [ ] 10.2 グラフデータの描画
  - DailyActivity[] を Chart.js のデータ形式に変換
  - X軸（日付）、Y軸（投稿数）の設定
  - グラフのスタイル設定
  - _Requirements: 6.3, 6.4_

- [ ] 11. エラーハンドリングとユーザーフィードバックの実装
- [ ] 11.1 エラーメッセージコンポーネントの作成
  - エラーメッセージ表示用の共通コンポーネント
  - 日本語のエラーメッセージ定義
  - _Requirements: 7.5_

- [ ] 11.2 各種エラーハンドリングの統合
  - WebSocket 接続エラーの処理
  - データ取得エラーの処理
  - NIP-07 エラーの処理
  - _Requirements: 2.6, 1.7, 9.10_

- [ ] 12. スタイリングとアクセシビリティの実装
- [ ] 12.1 CSS スタイルの作成
  - レスポンシブデザインの実装
  - カード/テーブルレイアウトの実装
  - ローディングインジケーターのスタイル
  - _Requirements: 7.3_

- [ ] 12.2 アクセシビリティ対応
  - ARIA ラベルの追加
  - キーボード操作のサポート
  - コントラスト比の確保
  - _Requirements: 11.1_

- [ ] 13. パフォーマンス最適化
- [ ] 13.1 メモリリーク対策
  - takeUntil パターンの実装
  - ngOnDestroy での Subscription 解除
  - _Requirements: 2.5, 11.5_

- [ ] 13.2 並列リクエストの制限
  - mergeMap を使用した同時リクエスト数の制限
  - プログレスバーの実装
  - _Requirements: 11.2_

- [ ] 14. テストの作成
- [ ] 14.1 NostrService のユニットテスト
  - WebSocket 通信のモック
  - 各メソッドのテストケース作成
  - _Requirements: 11.1_

- [ ] 14.2 Nip07Service のユニットテスト
  - window.nostr のモック
  - ログイン・フォロー処理のテスト
  - _Requirements: 11.1_

- [ ] 14.3 DataProcessingService のユニットテスト
  - データ集計ロジックのテスト
  - ソート機能のテスト
  - _Requirements: 11.1_

- [ ] 14.4 コンポーネントのテスト
  - 各コンポーネントの入出力テスト
  - イベントエミッターのテスト
  - _Requirements: 11.1_

- [ ] 15. GitHub Pages デプロイ設定
- [ ] 15.1 ビルド設定の調整
  - angular.json の baseHref 設定
  - production ビルドの最適化設定
  - _Requirements: 10.1, 10.2_

- [ ] 15.2 デプロイスクリプトの作成
  - 404.html の生成スクリプト
  - gh-pages へのデプロイコマンド
  - _Requirements: 10.2_

- [ ] 16. 統合テストとE2Eテスト
- [ ] 16.1 E2E テストの作成
  - ログインからフォロワー表示までのフロー
  - フォローボタンクリックのフロー
  - _Requirements: 11.1_

- [ ] 16.2 統合テストの実行
  - 全体フローの動作確認
  - エラーケースの確認
  - _Requirements: 11.1_
