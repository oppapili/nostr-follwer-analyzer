import { Injectable } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { NostrEvent, UnsignedEvent, NostrFilter } from '../models/nostr-event.model';
import { NostrService } from './nostr.service';

/**
 * NIP-07 拡張機能のインターフェース定義
 * window.nostr オブジェクトの型定義
 */
interface Nip07Extension {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<NostrEvent>;
  getRelays?(): Promise<{ [url: string]: { read: boolean; write: boolean } }>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

/**
 * window オブジェクトの拡張
 */
declare global {
  interface Window {
    nostr?: Nip07Extension;
  }
}

@Injectable({
  providedIn: 'root'
})
export class Nip07Service {
  private currentUserPubkey$ = new BehaviorSubject<string | null>(null);
  
  constructor(private nostrService: NostrService) {}

  /**
   * NIP-07 拡張機能が利用可能かチェックする
   * Requirements: 1.1
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.nostr !== 'undefined';
  }

  /**
   * NIP-07 拡張機能を使用してログインする
   * window.nostr.getPublicKey() を呼び出して pubkey を取得
   * Requirements: 1.2, 1.4
   */
  login(): Observable<string> {
    if (!this.isAvailable()) {
      return throwError(() => new Error('NIP-07 拡張機能が見つかりません。Alby や nos2x などの拡張機能をインストールしてください。'));
    }

    return new Observable(observer => {
      window.nostr!.getPublicKey()
        .then(pubkey => {
          this.currentUserPubkey$.next(pubkey);
          observer.next(pubkey);
          observer.complete();
        })
        .catch(error => {
          console.error('Login failed:', error);
          observer.error(new Error('ログインに失敗しました。拡張機能の設定を確認してください。'));
        });
    });
  }

  /**
   * ログアウトする
   * ログイン状態をクリアする
   * Requirements: 1.8
   */
  logout(): void {
    this.currentUserPubkey$.next(null);
  }

  /**
   * 現在ログイン中のユーザーの pubkey を取得する
   */
  getCurrentUserPubkey(): string | null {
    return this.currentUserPubkey$.value;
  }

  /**
   * 現在ログイン中のユーザーの pubkey を Observable として取得する
   */
  getCurrentUserPubkey$(): Observable<string | null> {
    return this.currentUserPubkey$.asObservable();
  }

  /**
   * 現在のユーザーのコンタクトリスト (kind:3) を取得する
   * Requirements: 9.1
   */
  getCurrentUserContactList(): Observable<string[]> {
    const currentPubkey = this.getCurrentUserPubkey();
    
    if (!currentPubkey) {
      return throwError(() => new Error('ログインしていません'));
    }

    return new Observable(observer => {
      this.nostrService.connect().subscribe({
        next: () => {
          const filter: NostrFilter = {
            kinds: [3],
            authors: [currentPubkey],
            limit: 1
          };

          this.nostrService['subscribeToEvents']([filter]).subscribe({
            next: (event) => {
              // kind:3 イベントの tags から p タグを抽出
              const followingPubkeys = event.tags
                .filter(tag => tag[0] === 'p' && tag[1])
                .map(tag => tag[1]);
              
              observer.next(followingPubkeys);
            },
            error: (error) => {
              console.error('Failed to get contact list:', error);
              observer.error(error);
            },
            complete: () => {
              // イベントが見つからない場合は空配列を返す
              if (!observer.closed) {
                observer.next([]);
                observer.complete();
              }
            }
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * 指定された pubkey のリストに対してフォロー状態をチェックする
   * Requirements: 9.2
   */
  checkFollowingStatus(pubkeys: string[]): Observable<Map<string, boolean>> {
    return new Observable(observer => {
      this.getCurrentUserContactList().subscribe({
        next: (followingList) => {
          const followingSet = new Set(followingList);
          const statusMap = new Map<string, boolean>();
          
          pubkeys.forEach(pubkey => {
            statusMap.set(pubkey, followingSet.has(pubkey));
          });
          
          observer.next(statusMap);
          observer.complete();
        },
        error: (error) => {
          console.error('Failed to check following status:', error);
          // エラーの場合は全て false として返す
          const statusMap = new Map<string, boolean>();
          pubkeys.forEach(pubkey => statusMap.set(pubkey, false));
          observer.next(statusMap);
          observer.complete();
        }
      });
    });
  }

  /**
   * NIP-07 拡張機能を使用してイベントに署名する
   * Requirements: 9.6
   */
  signEvent(event: UnsignedEvent): Observable<NostrEvent> {
    if (!this.isAvailable()) {
      return throwError(() => new Error('NIP-07 拡張機能が見つかりません'));
    }

    return from(window.nostr!.signEvent(event));
  }

  /**
   * 指定されたユーザーをフォローする
   * 現在のコンタクトリストに新しい pubkey を追加して kind:3 イベントを作成・署名・送信
   * Requirements: 9.5, 9.6, 9.7
   */
  followUser(targetPubkey: string): Observable<boolean> {
    const currentPubkey = this.getCurrentUserPubkey();
    
    if (!currentPubkey) {
      return throwError(() => new Error('ログインしていません'));
    }

    if (!this.isAvailable()) {
      return throwError(() => new Error('NIP-07 拡張機能が見つかりません'));
    }

    return new Observable(observer => {
      // 現在のコンタクトリストを取得
      this.getCurrentUserContactList().subscribe({
        next: (currentFollowing) => {
          // 既にフォロー済みかチェック
          if (currentFollowing.includes(targetPubkey)) {
            observer.next(true);
            observer.complete();
            return;
          }

          // 新しいコンタクトリストを作成
          const newFollowing = [...currentFollowing, targetPubkey];
          
          // kind:3 イベントを作成
          const unsignedEvent: UnsignedEvent = {
            pubkey: currentPubkey,
            created_at: Math.floor(Date.now() / 1000),
            kind: 3,
            tags: newFollowing.map(pubkey => ['p', pubkey]),
            content: '' // kind:3 の content は通常空文字列またはリレー情報のJSON
          };

          // イベントに署名
          this.signEvent(unsignedEvent).subscribe({
            next: (signedEvent) => {
              // 署名済みイベントを Relay に送信
              this.nostrService.publishEvent(signedEvent).subscribe({
                next: (success) => {
                  if (success) {
                    console.log('Successfully followed user:', targetPubkey);
                  }
                  observer.next(success);
                  observer.complete();
                },
                error: (error) => {
                  console.error('Failed to publish follow event:', error);
                  observer.error(new Error('フォロー処理に失敗しました'));
                }
              });
            },
            error: (error) => {
              console.error('Failed to sign event:', error);
              observer.error(new Error('イベントの署名に失敗しました。署名がキャンセルされた可能性があります。'));
            }
          });
        },
        error: (error) => {
          console.error('Failed to get current contact list:', error);
          observer.error(new Error('現在のフォローリストの取得に失敗しました'));
        }
      });
    });
  }
}
