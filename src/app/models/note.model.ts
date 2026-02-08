/**
 * ノート (kind:1)
 * テキスト投稿の簡略化された型
 */
export interface Note {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
}
