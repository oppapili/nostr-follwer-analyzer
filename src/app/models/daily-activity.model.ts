/**
 * 日別活動データ
 * 投稿数の集計に使用
 */
export interface DailyActivity {
  date: string; // YYYY-MM-DD 形式
  count: number;
}
