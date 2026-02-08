# Design Document

## Overview

本アプリケーションは、Nostr プロトコルを利用した Angular ベースの静的 Web アプリケーションです。ユーザーは NIP-07 拡張機能を使用してログインし、自分のフォロワーを取得して、各フォロワーの活動状況を可視化します。

### 主要な技術的決定

1. **フレームワーク**: Angular（最新安定版）を使用
2. **状態管理**: RxJS による Reactive プログラミング
3. **通信**: ブラウザ標準の WebSocket API
4. **グラフ描画**: Chart.js または ng2-charts を使用
5. **デプロイ**: GitHub Pages（静的ホスティング）

### アーキテクチャの原則

- コンポーネントとサービスの明確な分離
- Single Responsibility Principle の遵守
- Reactive プログラミングパターンの活用
- メモリリークを防ぐための適切なサブスクリプション管理

## Architecture

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Angular Application                       │ │
│  │                                                      │ │
│  │  ┌──────────────────┐  ┌──────────────────┐       │ │
│  │  │  App Component   │  │  Follower List   │       │ │
│  │  │  (Input Form)    │  │  Component       │       │ │
│  │  └────────┬─────────┘  └────────┬─────────┘       │ │
│  │           │                      │                  │ │
│  │           └──────────┬───────────┘                  │ │
│  │                      │                              │ │
│  │           ┌──────────▼─────────┐                   │ │
│  │           │  Nostr Service     │                   │ │
│  │           │  (WebSocket)       │                   │ │
│  │           └──────────┬─────────┘                   │ │
│  │                      │                              │ │
│  │           ┌──────────▼─────────┐                   │ │
│  │           │  NIP-07 Service    │                   │ │
│  │           │  (window.nostr)    │                   │ │
│  │           └────────────────────┘                   │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ WebSocket
                        │
                ┌───────▼────────┐
                │  wss://yabu.me │
                │  (Nostr Relay) │
                └────────────────┘
```

### レイヤー構成

1. **Presentation Layer**: Angular コンポーネント（UI表示、ユーザー入力）
2. **Business Logic Layer**: サービス（データ取得、変換、集計）
3. **Data Access Layer**: WebSocket 通信、Nostr プロトコル処理

## Components and Interfaces

### コンポーネント構成

#### 1. AppComponent
- **責務**: アプリケーションのルートコンポーネント、全体レイアウト、ログイン状態管理
- **テンプレート**: ヘッダー、ログインボタン/ログアウトボタン、結果表示エリア
- **状態**:
  - `isLoggedIn: boolean`
  - `currentUserPubkey: string`

#### 2. LoginComponent
- **責務**: NIP-07 ログイン処理
- **入力**: なし
- **出力**: `loginSuccess: EventEmitter<string>`
- **状態**: 
  - `nip07Available: boolean`
  - `errorMessage: string`
  - `loading: boolean`

#### 3. FollowerListComponent
- **責務**: フォロワー一覧の表示
- **入力**: `followers: Follower[]`
- **出力**: `followUser: EventEmitter<string>`
- **状態**:
  - `loading: boolean`
  - `sortedFollowers: Follower[]`

#### 4. FollowerCardComponent
- **責務**: 個別フォロワーの情報表示
- **入力**: `follower: Follower`
- **出力**: `follow: EventEmitter<string>`
- **表示内容**:
  - プロフィール画像
  - ユーザー名
  - 最新投稿
  - 投稿数グラフ
  - フォローボタン

#### 5. ActivityChartComponent
- **責務**: 30日間の投稿数折れ線グラフ表示
- **入力**: `activityData: DailyActivity[]`
- **ライブラリ**: Chart.js / ng2-charts

### サービス構成

#### 1. NostrService
- **責務**: Nostr Relay との WebSocket 通信、イベント取得
- **主要メソッド**:
  - `connect(): Observable<void>`
  - `disconnect(): void`
  - `subscribeToEvents(filter: NostrFilter): Observable<NostrEvent>`
  - `publishEvent(event: NostrEvent): Observable<boolean>`
  - `getFollowers(pubkey: string): Observable<string[]>`
  - `getMetadata(pubkey: string): Observable<Metadata>`
  - `getLatestNote(pubkey: string): Observable<Note>`
  - `getActivityData(pubkey: string, days: number): Observable<DailyActivity[]>`

#### 2. Nip07Service
- **責務**: NIP-07 拡張機能との連携、ログイン処理、フォロー処理、フォロー状態管理
- **主要メソッド**:
  - `isAvailable(): boolean`
  - `login(): Observable<string>` - getPublicKey() を呼び出して pubkey を返す
  - `logout(): void`
  - `signEvent(event: UnsignedEvent): Promise<SignedEvent>`
  - `getCurrentUserContactList(): Observable<string[]>`
  - `followUser(targetPubkey: string): Observable<boolean>`
  - `checkFollowingStatus(pubkeys: string[]): Observable<Map<string, boolean>>`

#### 3. DataProcessingService
- **責務**: データの集計、ソート、変換
- **主要メソッド**:
  - `aggregateDailyActivity(notes: Note[]): DailyActivity[]`
  - `sortFollowers(followers: Follower[]): Follower[]`
  - `formatTimestamp(timestamp: number): string`
  - `truncatePubkey(pubkey: string): string`

## Data Models

### TypeScript インターフェース

```typescript
// Nostr イベント基本構造
interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

// フィルター
interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#p'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

// メタデータ (kind:0)
interface Metadata {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
}

// ノート (kind:1)
interface Note {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
}

// フォロワー情報
interface Follower {
  pubkey: string;
  metadata?: Metadata;
  latestNote?: Note;
  activityData: DailyActivity[];
  isFollowing: boolean;
}

// 日別活動データ
interface DailyActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

// WebSocket メッセージ
type NostrMessage = 
  | ['EVENT', string, NostrEvent]
  | ['EOSE', string]
  | ['OK', string, boolean, string]
  | ['NOTICE', string];

// REQ メッセージ
type NostrRequest = ['REQ', string, ...NostrFilter[]];

// CLOSE メッセージ
type NostrClose = ['CLOSE', string];
```

## Error Handling

### エラー分類と処理方針

#### 1. WebSocket 接続エラー
- **発生タイミング**: Relay への接続失敗
- **処理**: 
  - ユーザーに「Relay に接続できませんでした」と表示
  - 再接続ボタンを提供
  - コンソールに詳細ログを出力

#### 2. データ取得エラー
- **発生タイミング**: イベント取得のタイムアウト、不正なレスポンス
- **処理**:
  - 該当フォロワーのデータを「取得失敗」として表示
  - 他のフォロワーの処理は継続

#### 3. NIP-07 エラー
- **発生タイミング**: 拡張機能未インストール、ログイン失敗、署名拒否
- **処理**:
  - 拡張機能未インストール: インストールガイドを表示
  - ログイン失敗: 「ログインに失敗しました」と表示
  - 署名拒否: 「署名がキャンセルされました」と表示

#### 4. バリデーションエラー
- **発生タイミング**: データ形式の不整合
- **処理**:
  - エラーメッセージをコンソールに出力
  - ユーザーには「データの取得に失敗しました」と表示

### エラーハンドリング実装パターン

```typescript
// RxJS エラーハンドリング
this.nostrService.getFollowers(pubkey).pipe(
  catchError(error => {
    this.errorMessage = 'フォロワーの取得に失敗しました';
    console.error('Error fetching followers:', error);
    return of([]);
  }),
  finalize(() => this.loading = false)
).subscribe(followers => {
  this.followers = followers;
});
```

## Testing Strategy

### テスト方針

#### 1. Unit Tests (Jasmine + Karma)
- **対象**: サービス、パイプ、ユーティリティ関数
- **カバレッジ目標**: 80%以上
- **重点テスト項目**:
  - NostrService の WebSocket 通信ロジック
  - DataProcessingService のデータ集計ロジック
  - バリデーション関数

#### 2. Component Tests
- **対象**: 各コンポーネント
- **テスト内容**:
  - 入力値の変化に対する UI の反応
  - イベントエミッターの発火
  - 条件分岐による表示切り替え

#### 3. Integration Tests
- **対象**: コンポーネントとサービスの連携
- **テスト内容**:
  - pubkey 入力からフォロワー表示までのフロー
  - フォローボタンクリックから状態更新までのフロー

#### 4. E2E Tests (Cypress または Playwright)
- **対象**: ユーザーシナリオ全体
- **テスト内容**:
  - pubkey 入力 → フォロワー一覧表示
  - フォローボタンクリック → 成功メッセージ表示

### モックとスタブ

```typescript
// NostrService のモック
class MockNostrService {
  getFollowers(pubkey: string): Observable<string[]> {
    return of(['pubkey1', 'pubkey2']);
  }
  
  getMetadata(pubkey: string): Observable<Metadata> {
    return of({ name: 'Test User', picture: 'https://example.com/pic.jpg' });
  }
}

// WebSocket のモック
class MockWebSocket {
  send = jasmine.createSpy('send');
  close = jasmine.createSpy('close');
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
}
```

## Data Flow

### 1. ログインとフォロワー取得フロー

```
User opens application
  │
  ▼
Check if NIP-07 is available
  │
  ├─► No: Show "Install Nostr extension" message
  │
  └─► Yes: Show "Login" button
      │
      ▼
  User clicks "Login" button
      │
      ▼
  Nip07Service.login()
      │
      ▼
  window.nostr.getPublicKey()
      │
      ├─► Error: Show error message
      │
      └─► Success: currentUserPubkey
          │
          ▼
      Set isLoggedIn = true
          │
          ▼
      NostrService.getFollowers(currentUserPubkey)
          │
          ├─► WebSocket: REQ ["REQ", "sub1", {"kinds": [3], "#p": [currentUserPubkey]}]
          │
          ├─◄ WebSocket: ["EVENT", "sub1", {...}] (multiple)
          │
          ├─◄ WebSocket: ["EOSE", "sub1"]
          │
          ▼
      Extract author pubkeys → followerPubkeys[]
          │
          ▼
      Get current user's contact list (kind:3)
          │
          ▼
      Create followingMap: Map<pubkey, boolean>
          │
          ▼
      For each followerPubkey:
        ├─► getMetadata(followerPubkey)
        ├─► getLatestNote(followerPubkey)
        ├─► getActivityData(followerPubkey, 30)
        └─► Set isFollowing from followingMap
          │
          ▼
      Combine data → Follower[]
          │
          ▼
      DataProcessingService.sortFollowers()
          │
          ▼
      FollowerListComponent (display with follow status)
```

### 2. フォロー状態確認とフォロー処理フロー

```
User clicks "Follow" button (if not already following)
  │
  ▼
FollowerCardComponent
  │ (follow event)
  ▼
FollowerListComponent
  │ (followUser event)
  ▼
AppComponent
  │
  ▼
NostrService.getContactList(currentUserPubkey)
  │
  ▼
Add targetPubkey to contact list
  │
  ▼
Create new kind:3 event
  │
  ▼
Nip07Service.signEvent(event)
  │
  ▼
NostrService.publishEvent(signedEvent)
  │
  ▼
Update follower.isFollowing = true
  │
  ▼
Update UI: "フォロー中" (disabled button)
```

### 3. 投稿数集計フロー

```
NostrService.getActivityData(pubkey, 30)
  │
  ▼
Calculate date range (today - 30 days)
  │
  ▼
WebSocket: REQ with filter
  {
    "kinds": [1],
    "authors": [pubkey],
    "since": timestamp_30_days_ago
  }
  │
  ▼
Receive all kind:1 events
  │
  ▼
DataProcessingService.aggregateDailyActivity()
  │
  ├─► Group by date (YYYY-MM-DD)
  ├─► Count events per day
  └─► Fill missing dates with count: 0
  │
  ▼
Return DailyActivity[]
  │
  ▼
ActivityChartComponent (render chart)
```

## Performance Considerations

### 1. WebSocket 接続管理
- **課題**: 複数のサブスクリプションによる接続負荷
- **対策**:
  - 単一の WebSocket 接続を共有
  - サブスクリプション ID を一意に管理
  - 不要なサブスクリプションは即座に CLOSE

### 2. 大量フォロワーの処理
- **課題**: フォロワーが数百人いる場合の処理時間
- **対策**:
  - 並列リクエストの制限（同時5件まで）
  - RxJS の `mergeMap` と `concatMap` を適切に使用
  - プログレスバーで進捗を表示

### 3. グラフ描画のパフォーマンス
- **課題**: 多数のフォロワーのグラフを同時描画
- **対策**:
  - 仮想スクロール（CDK Virtual Scroll）の導入
  - 画面外のグラフは遅延描画

### 4. メモリリーク防止
- **課題**: RxJS サブスクリプションの解除漏れ
- **対策**:
  - `takeUntil` パターンの使用
  - `async` パイプの活用
  - `ngOnDestroy` での明示的な解除

```typescript
export class FollowerListComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.nostrService.getFollowers(this.pubkey)
      .pipe(takeUntil(this.destroy$))
      .subscribe(followers => {
        this.followers = followers;
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## GitHub Pages Deployment

### ビルド設定

#### angular.json の設定

```json
{
  "projects": {
    "nostr-follower-analyzer": {
      "architect": {
        "build": {
          "options": {
            "outputPath": "dist/nostr-follower-analyzer",
            "baseHref": "/nostr-follower-analyzer/"
          }
        }
      }
    }
  }
}
```

### デプロイ手順

1. **ビルド実行**
   ```bash
   ng build --configuration production --base-href /nostr-follower-analyzer/
   ```

2. **404.html の作成**
   - GitHub Pages の SPA 対応のため、`dist/` に `404.html` を配置
   - `index.html` と同じ内容をコピー

3. **gh-pages ブランチへのデプロイ**
   ```bash
   npx angular-cli-ghpages --dir=dist/nostr-follower-analyzer
   ```

### ルーティング設定

```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', component: AppComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

### 環境変数管理

```typescript
// environment.ts
export const environment = {
  production: false,
  relayUrl: 'wss://yabu.me'
};

// environment.prod.ts
export const environment = {
  production: true,
  relayUrl: 'wss://yabu.me'
};
```

## Security Considerations

### 1. XSS 対策
- Angular のデフォルトのサニタイゼーションを活用
- ユーザー投稿内容は `DomSanitizer` で検証
- `innerHTML` の使用を避け、テキストバインディングを使用

### 2. WebSocket セキュリティ
- WSS（暗号化された WebSocket）のみを使用
- 信頼できる Relay のみに接続

### 3. NIP-07 セキュリティ
- 署名リクエストは明示的なユーザーアクションでのみ実行
- 秘密鍵は一切扱わない（拡張機能に委譲）

## Accessibility

### WCAG 2.1 準拠

1. **キーボード操作**: すべての機能をキーボードで操作可能
2. **スクリーンリーダー対応**: ARIA ラベルの適切な使用
3. **コントラスト比**: テキストと背景のコントラスト比 4.5:1 以上
4. **フォーカス表示**: フォーカス状態を視覚的に明示

```html
<!-- アクセシビリティ対応の例 -->
<button 
  (click)="followUser(follower.pubkey)"
  [attr.aria-label]="'フォロー ' + (follower.metadata?.name || follower.pubkey)"
  [disabled]="follower.isFollowing">
  {{ follower.isFollowing ? 'フォロー中' : 'フォロー' }}
</button>
```

## Internationalization (Future Enhancement)

現在は日本語のみですが、将来的に多言語対応する場合：

- Angular の i18n 機能を使用
- `@angular/localize` パッケージの導入
- メッセージファイルの分離（ja.json, en.json）

## Monitoring and Logging

### クライアントサイドロギング

```typescript
export class LoggerService {
  log(message: string, data?: any) {
    if (!environment.production) {
      console.log(`[LOG] ${message}`, data);
    }
  }
  
  error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
    // 本番環境では外部サービス（Sentry等）に送信
  }
}
```

### パフォーマンス計測

```typescript
// WebSocket 接続時間の計測
const startTime = performance.now();
this.ws.onopen = () => {
  const duration = performance.now() - startTime;
  this.logger.log(`WebSocket connected in ${duration}ms`);
};
```
