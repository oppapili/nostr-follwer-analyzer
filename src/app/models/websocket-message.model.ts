import { NostrEvent, NostrFilter } from './nostr-event.model';

/**
 * WebSocket メッセージ型
 * Nostr Relay との通信で使用するメッセージ形式
 */

/**
 * Relay から受信するメッセージ
 */
export type NostrMessage = 
  | ['EVENT', string, NostrEvent]  // イベント受信
  | ['EOSE', string]                // End of Stored Events
  | ['OK', string, boolean, string] // イベント送信結果
  | ['NOTICE', string];             // 通知メッセージ

/**
 * REQ メッセージ (イベント購読リクエスト)
 */
export type NostrRequest = ['REQ', string, ...NostrFilter[]];

/**
 * CLOSE メッセージ (購読終了)
 */
export type NostrClose = ['CLOSE', string];

/**
 * EVENT メッセージ (イベント送信)
 */
export type NostrEventMessage = ['EVENT', NostrEvent];
