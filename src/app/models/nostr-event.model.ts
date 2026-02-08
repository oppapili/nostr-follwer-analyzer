/**
 * Nostr イベント基本構造
 * NIP-01 に準拠したイベントの型定義
 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * 署名前のイベント
 */
export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

/**
 * Nostr フィルター
 * REQ メッセージで使用するフィルター条件
 */
export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#p'?: string[];
  '#e'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}
