import { Metadata } from './metadata.model';
import { Note } from './note.model';
import { DailyActivity } from './daily-activity.model';

/**
 * フォロワー情報
 * 各フォロワーの統合データ
 */
export interface Follower {
  pubkey: string;
  metadata?: Metadata;
  latestNote?: Note;
  activityData: DailyActivity[];
  isFollowing: boolean;
}
