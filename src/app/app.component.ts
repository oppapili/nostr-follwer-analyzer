import { Component } from '@angular/core';
import { Nip07Service } from './services/nip07.service';
import { NostrService } from './services/nostr.service';
import { DataProcessingService } from './services/data-processing.service';
import { Follower } from './models/follower.model';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Nostr Follower Analyzer';
  
  // ログイン状態管理
  // Requirements: 1.5, 1.6
  isLoggedIn = false;
  currentUserPubkey = '';

  // フォロワーデータ
  followers: Follower[] = [];
  
  // ローディング状態
  // Requirements: 7.1
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private nip07Service: Nip07Service,
    private nostrService: NostrService,
    private dataProcessingService: DataProcessingService
  ) {}

  /**
   * LoginComponent からの loginSuccess イベントを受信
   * Requirements: 3.1, 3.2, 3.3, 7.1
   */
  onLoginSuccess(pubkey: string): void {
    this.isLoggedIn = true;
    this.currentUserPubkey = pubkey;
    this.errorMessage = '';
    
    console.log('Login successful, fetching followers for:', pubkey);
    
    // フォロワー取得処理を開始
    this.loadFollowers();
  }

  /**
   * フォロワーを取得して各フォロワーの詳細情報を取得する
   * Requirements: 3.1, 3.2, 3.3, 7.1
   */
  private loadFollowers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.followers = [];

    // フォロワーリストを取得
    this.nostrService.getFollowers(this.currentUserPubkey)
      .pipe(
        catchError(error => {
          console.error('Failed to get followers:', error);
          this.errorMessage = 'フォロワーの取得に失敗しました';
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(followerPubkeys => {
        if (followerPubkeys.length === 0) {
          this.errorMessage = 'フォロワーが見つかりませんでした';
          return;
        }

        console.log(`Found ${followerPubkeys.length} followers`);
        
        // 各フォロワーの詳細情報を取得
        this.loadFollowerDetails(followerPubkeys);
      });
  }

  /**
   * 各フォロワーの詳細情報（メタデータ、最新投稿、活動データ、フォロー状態）を取得
   */
  private loadFollowerDetails(followerPubkeys: string[]): void {
    this.loading = true;

    // まずフォロー状態を取得
    this.nip07Service.checkFollowingStatus(followerPubkeys)
      .pipe(
        catchError(error => {
          console.error('Failed to check following status:', error);
          // エラーの場合は空のMapを返す
          return of(new Map<string, boolean>());
        })
      )
      .subscribe(followingMap => {
        // 各フォロワーの詳細情報を並列で取得
        const followerObservables = followerPubkeys.map(pubkey => {
          return forkJoin({
            metadata: this.nostrService.getMetadata(pubkey).pipe(
              catchError(error => {
                console.error(`Failed to get metadata for ${pubkey}:`, error);
                return of(null);
              })
            ),
            latestNote: this.nostrService.getLatestNote(pubkey).pipe(
              catchError(error => {
                console.error(`Failed to get latest note for ${pubkey}:`, error);
                return of(null);
              })
            ),
            activityData: this.nostrService.getActivityData(pubkey, 30).pipe(
              catchError(error => {
                console.error(`Failed to get activity data for ${pubkey}:`, error);
                return of([]);
              })
            )
          }).pipe(
            catchError(error => {
              console.error(`Failed to get details for ${pubkey}:`, error);
              return of({
                metadata: null,
                latestNote: null,
                activityData: []
              });
            })
          );
        });

        // すべてのフォロワー情報を取得
        forkJoin(followerObservables)
          .pipe(
            finalize(() => {
              this.loading = false;
            })
          )
          .subscribe(results => {
            this.followers = followerPubkeys.map((pubkey, index) => {
              const result = results[index];
              return {
                pubkey,
                metadata: result.metadata || undefined,
                latestNote: result.latestNote || undefined,
                activityData: result.activityData,
                isFollowing: followingMap.get(pubkey) || false
              };
            });

            // フォロワーをソート
            // Requirements: 8.1, 8.2, 8.3, 8.4
            this.followers = this.dataProcessingService.sortFollowers(this.followers);

            console.log(`Loaded details for ${this.followers.length} followers`);
          });
      });
  }

  /**
   * ログアウト処理
   * Requirements: 1.8
   */
  onLogout(): void {
    this.nip07Service.logout();
    this.isLoggedIn = false;
    this.currentUserPubkey = '';
    this.followers = [];
    this.errorMessage = '';
    console.log('User logged out');
  }

  /**
   * FollowerListComponent からの followUser イベントを受信
   * Requirements: 9.5, 9.6, 9.7, 9.8, 9.9
   */
  onFollowUser(targetPubkey: string): void {
    this.successMessage = '';
    this.errorMessage = '';

    console.log('Following user:', targetPubkey);

    this.nip07Service.followUser(targetPubkey)
      .pipe(
        catchError(error => {
          console.error('Failed to follow user:', error);
          this.errorMessage = error.message || 'フォロー処理に失敗しました';
          return of(false);
        })
      )
      .subscribe(success => {
        if (success) {
          // 成功メッセージを表示
          // Requirements: 9.8, 9.9
          this.successMessage = 'フォローしました';
          
          // フォロワーリストの該当ユーザーの isFollowing を更新
          const follower = this.followers.find(f => f.pubkey === targetPubkey);
          if (follower) {
            follower.isFollowing = true;
          }

          console.log('Successfully followed user:', targetPubkey);

          // 3秒後に成功メッセージを消す
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }
      });
  }

  /**
   * pubkey を省略表示する
   * 最初の8文字と最後の8文字を表示
   */
  getTruncatedPubkey(): string {
    if (!this.currentUserPubkey || this.currentUserPubkey.length < 16) {
      return this.currentUserPubkey;
    }
    return `${this.currentUserPubkey.slice(0, 8)}...${this.currentUserPubkey.slice(-8)}`;
  }
}
