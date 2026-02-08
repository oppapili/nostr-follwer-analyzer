import { Injectable } from '@angular/core';
import { DailyActivity } from '../models/daily-activity.model';
import { Note } from '../models/note.model';
import { Follower } from '../models/follower.model';

/**
 * データ処理サービス
 * データの集計、ソート、変換を担当
 */
@Injectable({
  providedIn: 'root'
})
export class DataProcessingService {

  constructor() { }

  /**
   * 日別投稿数を集計する
   * @param notes 投稿データの配列
   * @returns 日別の投稿数データ（30日分、欠損日は0埋め）
   */
  aggregateDailyActivity(notes: Note[]): DailyActivity[] {
    // 今日の日付を取得（ローカルタイムゾーン）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 30日前の日付を計算
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29); // 今日を含めて30日

    // 日付をキーとした投稿数のマップを作成
    const activityMap = new Map<string, number>();

    // 30日分の日付を初期化（すべて0）
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const dateStr = this.formatDateToYYYYMMDD(date);
      activityMap.set(dateStr, 0);
    }

    // 投稿データを日別に集計
    notes.forEach(note => {
      const noteDate = new Date(note.created_at * 1000); // UNIX timestamp → ミリ秒
      noteDate.setHours(0, 0, 0, 0); // 時刻をリセット
      const dateStr = this.formatDateToYYYYMMDD(noteDate);

      // 30日間の範囲内の投稿のみカウント
      if (activityMap.has(dateStr)) {
        activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
      }
    });

    // マップを配列に変換してソート
    const result: DailyActivity[] = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  /**
   * フォロワーリストをソートする
   * ユーザー名（name または display_name）のアルファベット順でソート
   * ユーザー名がない場合は pubkey でソート
   * 大文字小文字を区別しない
   * @param followers フォロワーの配列
   * @returns ソート済みのフォロワー配列
   */
  sortFollowers(followers: Follower[]): Follower[] {
    return [...followers].sort((a, b) => {
      // ソートキーを取得（name > display_name > pubkey の優先順位）
      const keyA = this.getSortKey(a);
      const keyB = this.getSortKey(b);

      // 大文字小文字を区別せずに比較
      return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
    });
  }

  /**
   * フォロワーのソートキーを取得
   * @param follower フォロワー
   * @returns ソートに使用するキー文字列
   */
  private getSortKey(follower: Follower): string {
    if (follower.metadata?.name) {
      return follower.metadata.name.toLowerCase();
    }
    if (follower.metadata?.display_name) {
      return follower.metadata.display_name.toLowerCase();
    }
    return follower.pubkey.toLowerCase();
  }

  /**
   * UNIX timestamp を人が読める形式に変換
   * @param timestamp UNIX timestamp（秒）
   * @returns 人が読める形式の日時文字列（例: 2026年2月8日 14:30）
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000); // UNIX timestamp → ミリ秒
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  }

  /**
   * pubkey を省略表示用に短縮
   * @param pubkey 完全な pubkey（64文字の16進数）
   * @returns 省略表示された pubkey（例: npub1abc...xyz）
   */
  truncatePubkey(pubkey: string): string {
    if (!pubkey || pubkey.length < 16) {
      return pubkey;
    }
    // 最初の8文字と最後の8文字を表示
    return `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 8)}`;
  }

  /**
   * 日付をYYYY-MM-DD形式の文字列に変換
   * @param date Dateオブジェクト
   * @returns YYYY-MM-DD形式の文字列
   */
  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
