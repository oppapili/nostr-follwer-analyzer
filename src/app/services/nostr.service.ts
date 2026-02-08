import { Injectable } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { filter, map, takeUntil, timeout } from 'rxjs/operators';
import { 
  NostrEvent, 
  NostrFilter, 
  UnsignedEvent 
} from '../models/nostr-event.model';
import { 
  NostrMessage, 
  NostrRequest, 
  NostrClose 
} from '../models/websocket-message.model';
import { Metadata } from '../models/metadata.model';
import { Note } from '../models/note.model';
import { DailyActivity } from '../models/daily-activity.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NostrService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<NostrMessage>();
  private subscriptions = new Map<string, Subject<NostrEvent>>();
  private subscriptionCounter = 0;
  private readonly RELAY_URL = environment.relayUrl || 'wss://yabu.me';
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor() {}

  /**
   * WebSocket 接続を確立する
   */
  connect(): Observable<void> {
    return new Observable(observer => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        observer.next();
        observer.complete();
        return;
      }

      try {
        this.ws = new WebSocket(this.RELAY_URL);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            observer.error(new Error('接続タイムアウト'));
          }
        }, this.CONNECTION_TIMEOUT);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected to', this.RELAY_URL);
          observer.next();
          observer.complete();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: NostrMessage = JSON.parse(event.data);
            this.messageSubject.next(message);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          observer.error(new Error('WebSocket 接続エラー'));
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
          // Clean up all subscriptions
          this.subscriptions.forEach(sub => sub.complete());
          this.subscriptions.clear();
        };
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * WebSocket 接続を切断する
   */
  disconnect(): void {
    if (this.ws) {
      // Close all subscriptions first
      this.subscriptions.forEach((subject, subId) => {
        this.closeSubscription(subId);
      });
      
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * サブスクリプション ID を生成する
   */
  private generateSubscriptionId(): string {
    this.subscriptionCounter++;
    return `sub_${Date.now()}_${this.subscriptionCounter}`;
  }

  /**
   * REQ メッセージを送信してイベントを購読する
   */
  private subscribeToEvents(filters: NostrFilter[]): Observable<NostrEvent> {
    const subId = this.generateSubscriptionId();
    const subject = new Subject<NostrEvent>();
    this.subscriptions.set(subId, subject);

    return new Observable(observer => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        observer.error(new Error('WebSocket が接続されていません'));
        return;
      }

      const request: NostrRequest = ['REQ', subId, ...filters];
      this.ws.send(JSON.stringify(request));

      const subscription = subject.subscribe({
        next: (event) => observer.next(event),
        error: (error) => observer.error(error),
        complete: () => observer.complete()
      });

      return () => {
        subscription.unsubscribe();
        this.closeSubscription(subId);
      };
    });
  }

  /**
   * サブスクリプションを閉じる
   */
  private closeSubscription(subId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const closeMsg: NostrClose = ['CLOSE', subId];
      this.ws.send(JSON.stringify(closeMsg));
    }
    
    const subject = this.subscriptions.get(subId);
    if (subject) {
      subject.complete();
      this.subscriptions.delete(subId);
    }
  }

  /**
   * 受信したメッセージを処理する
   */
  private handleMessage(message: NostrMessage): void {
    const [type, ...rest] = message;

    switch (type) {
      case 'EVENT':
        const [subId, event] = rest as [string, NostrEvent];
        const subject = this.subscriptions.get(subId);
        if (subject) {
          subject.next(event);
        }
        break;

      case 'EOSE':
        const [eoseSubId] = rest as [string];
        const eoseSubject = this.subscriptions.get(eoseSubId);
        if (eoseSubject) {
          eoseSubject.complete();
          this.subscriptions.delete(eoseSubId);
        }
        break;

      case 'NOTICE':
        const [notice] = rest as [string];
        console.warn('Relay notice:', notice);
        break;

      case 'OK':
        // Handled separately in publishEvent
        break;
    }
  }

  /**
   * フォロワーを取得する (kind:3 の逆参照)
   * ログインユーザーの pubkey を tags の p タグに含む kind:3 イベントを検索
   */
  getFollowers(userPubkey: string): Observable<string[]> {
    return new Observable(observer => {
      this.connect().subscribe({
        next: () => {
          const filter: NostrFilter = {
            kinds: [3],
            '#p': [userPubkey]
          };

          const followers = new Set<string>();

          this.subscribeToEvents([filter])
            .pipe(timeout(this.REQUEST_TIMEOUT))
            .subscribe({
              next: (event) => {
                // イベントの author がフォロワー
                followers.add(event.pubkey);
              },
              error: (error) => {
                if (error.name === 'TimeoutError') {
                  observer.error(new Error('フォロワー取得がタイムアウトしました'));
                } else {
                  observer.error(error);
                }
              },
              complete: () => {
                observer.next(Array.from(followers));
                observer.complete();
              }
            });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * メタデータを取得する (kind:0)
   */
  getMetadata(pubkey: string): Observable<Metadata | null> {
    return new Observable(observer => {
      this.connect().subscribe({
        next: () => {
          const filter: NostrFilter = {
            kinds: [0],
            authors: [pubkey],
            limit: 1
          };

          let metadata: Metadata | null = null;

          this.subscribeToEvents([filter])
            .pipe(timeout(this.REQUEST_TIMEOUT))
            .subscribe({
              next: (event) => {
                try {
                  metadata = JSON.parse(event.content) as Metadata;
                } catch (error) {
                  console.error('Failed to parse metadata:', error);
                }
              },
              error: (error) => {
                if (error.name === 'TimeoutError') {
                  observer.next(null);
                  observer.complete();
                } else {
                  observer.error(error);
                }
              },
              complete: () => {
                observer.next(metadata);
                observer.complete();
              }
            });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * 最新投稿を取得する (kind:1, limit:1)
   */
  getLatestNote(pubkey: string): Observable<Note | null> {
    return new Observable(observer => {
      this.connect().subscribe({
        next: () => {
          const filter: NostrFilter = {
            kinds: [1],
            authors: [pubkey],
            limit: 1
          };

          let latestNote: Note | null = null;

          this.subscribeToEvents([filter])
            .pipe(timeout(this.REQUEST_TIMEOUT))
            .subscribe({
              next: (event) => {
                latestNote = {
                  id: event.id,
                  pubkey: event.pubkey,
                  content: event.content,
                  created_at: event.created_at
                };
              },
              error: (error) => {
                if (error.name === 'TimeoutError') {
                  observer.next(null);
                  observer.complete();
                } else {
                  observer.error(error);
                }
              },
              complete: () => {
                observer.next(latestNote);
                observer.complete();
              }
            });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * 直近 N 日間の投稿データを取得する (kind:1)
   */
  getActivityData(pubkey: string, days: number = 30): Observable<Note[]> {
    return new Observable(observer => {
      this.connect().subscribe({
        next: () => {
          const now = Math.floor(Date.now() / 1000);
          const since = now - (days * 24 * 60 * 60);

          const filter: NostrFilter = {
            kinds: [1],
            authors: [pubkey],
            since: since
          };

          const notes: Note[] = [];

          this.subscribeToEvents([filter])
            .pipe(timeout(this.REQUEST_TIMEOUT))
            .subscribe({
              next: (event) => {
                notes.push({
                  id: event.id,
                  pubkey: event.pubkey,
                  content: event.content,
                  created_at: event.created_at
                });
              },
              error: (error) => {
                if (error.name === 'TimeoutError') {
                  observer.next(notes);
                  observer.complete();
                } else {
                  observer.error(error);
                }
              },
              complete: () => {
                observer.next(notes);
                observer.complete();
              }
            });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * イベントを Relay に送信する
   */
  publishEvent(event: NostrEvent): Observable<boolean> {
    return new Observable(observer => {
      this.connect().subscribe({
        next: () => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            observer.error(new Error('WebSocket が接続されていません'));
            return;
          }

          const eventMessage = ['EVENT', event];
          this.ws.send(JSON.stringify(eventMessage));

          // OK メッセージを待つ
          const okSubscription = this.messageSubject
            .pipe(
              filter((msg): msg is ['OK', string, boolean, string] => 
                msg[0] === 'OK' && msg[1] === event.id
              ),
              timeout(this.REQUEST_TIMEOUT)
            )
            .subscribe({
              next: (okMsg) => {
                const [, , success, message] = okMsg;
                if (success) {
                  observer.next(true);
                  observer.complete();
                } else {
                  observer.error(new Error(`イベント送信失敗: ${message}`));
                }
                okSubscription.unsubscribe();
              },
              error: (error) => {
                if (error.name === 'TimeoutError') {
                  observer.error(new Error('イベント送信がタイムアウトしました'));
                } else {
                  observer.error(error);
                }
                okSubscription.unsubscribe();
              }
            });
        },
        error: (error) => observer.error(error)
      });
    });
  }
}
