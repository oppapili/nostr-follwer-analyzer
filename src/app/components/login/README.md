# LoginComponent

## Overview
LoginComponent は NIP-07 拡張機能を使用したログイン機能を提供するコンポーネントです。

## Files
- `login.component.ts` - コンポーネントロジック
- `login.component.html` - テンプレート
- `login.component.css` - スタイル

## Features

### Task 6.1: ログインUIの作成
✅ **NIP-07 拡張機能の有無に応じた表示切り替え**
- `nip07Available` フラグで拡張機能の有無を判定
- 利用可能な場合: ログインボタンを表示
- 利用不可の場合: インストールガイドを表示

✅ **ログインボタンの実装**
- ログイン中は「ログイン中...」と表示
- ローディング中はボタンを無効化

✅ **エラーメッセージ表示エリアの実装**
- エラー発生時に赤い背景でメッセージを表示
- エラーメッセージは `errorMessage` プロパティで管理

### Task 6.2: ログイン処理の実装
✅ **Nip07Service.login() の呼び出し**
- `onLogin()` メソッドで `nip07Service.login()` を呼び出し

✅ **ログイン成功時の loginSuccess イベント発火**
- `@Output() loginSuccess = new EventEmitter<string>()`
- ログイン成功時に pubkey を emit

✅ **エラーハンドリング**
- RxJS の error ハンドラーでエラーをキャッチ
- エラーメッセージを `errorMessage` に設定
- コンソールにエラーログを出力

## Requirements Coverage

### Requirement 1.1
✅ NIP-07 拡張機能（window.nostr）の存在を確認
- `ngOnInit()` で `nip07Service.isAvailable()` を呼び出し

### Requirement 1.2
✅ 拡張機能の有無に応じた表示切り替え
- `*ngIf="nip07Available"` でログインボタン表示
- `*ngIf="!nip07Available"` でインストールガイド表示

### Requirement 1.3
✅ インストールメッセージとエラーメッセージの表示
- 拡張機能未インストール時のメッセージ
- エラー発生時のメッセージ表示エリア

### Requirement 1.4
✅ window.nostr.getPublicKey() の呼び出し
- `nip07Service.login()` 経由で実行

### Requirement 1.5
✅ ログイン成功時の loginSuccess イベント発火
- `this.loginSuccess.emit(pubkey)`

### Requirement 1.7
✅ エラーハンドリング
- エラーメッセージの表示
- コンソールへのログ出力

## Usage

```typescript
// app.component.html
<app-login (loginSuccess)="onLoginSuccess($event)"></app-login>

// app.component.ts
onLoginSuccess(pubkey: string): void {
  console.log('User logged in:', pubkey);
  // フォロワー取得処理などを開始
}
```

## Styling
- レスポンシブデザイン対応
- モバイル表示時はボタンが全幅に
- アクセシビリティを考慮したカラーコントラスト
- ホバー・アクティブ状態のフィードバック

## Dependencies
- `Nip07Service` - NIP-07 拡張機能との連携
- Angular Core (`Component`, `EventEmitter`, `OnInit`, `Output`)
