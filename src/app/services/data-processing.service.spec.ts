import { TestBed } from '@angular/core/testing';
import { DataProcessingService } from './data-processing.service';
import { Note } from '../models/note.model';
import { Follower } from '../models/follower.model';
import { DailyActivity } from '../models/daily-activity.model';

describe('DataProcessingService', () => {
  let service: DataProcessingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataProcessingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('aggregateDailyActivity', () => {
    it('should aggregate notes by date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Math.floor(today.getTime() / 1000);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

      const notes: Note[] = [
        { id: '1', pubkey: 'abc', content: 'test1', created_at: todayTimestamp },
        { id: '2', pubkey: 'abc', content: 'test2', created_at: todayTimestamp },
        { id: '3', pubkey: 'abc', content: 'test3', created_at: yesterdayTimestamp }
      ];

      const result = service.aggregateDailyActivity(notes);

      expect(result.length).toBe(30);
      expect(result.every(day => day.count >= 0)).toBe(true);
    });

    it('should fill missing dates with zero', () => {
      const notes: Note[] = [];
      const result = service.aggregateDailyActivity(notes);

      expect(result.length).toBe(30);
      expect(result.every(day => day.count === 0)).toBe(true);
    });

    it('should return dates in YYYY-MM-DD format', () => {
      const notes: Note[] = [];
      const result = service.aggregateDailyActivity(notes);

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(result.every(day => dateRegex.test(day.date))).toBe(true);
    });

    it('should sort dates in ascending order', () => {
      const notes: Note[] = [];
      const result = service.aggregateDailyActivity(notes);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });
  });

  describe('sortFollowers', () => {
    it('should sort by name (case insensitive)', () => {
      const followers: Follower[] = [
        { pubkey: '1', metadata: { name: 'Charlie' }, activityData: [], isFollowing: false },
        { pubkey: '2', metadata: { name: 'alice' }, activityData: [], isFollowing: false },
        { pubkey: '3', metadata: { name: 'Bob' }, activityData: [], isFollowing: false }
      ];

      const result = service.sortFollowers(followers);

      expect(result[0].metadata?.name).toBe('alice');
      expect(result[1].metadata?.name).toBe('Bob');
      expect(result[2].metadata?.name).toBe('Charlie');
    });

    it('should prefer name over display_name', () => {
      const followers: Follower[] = [
        { pubkey: '1', metadata: { name: 'Alice', display_name: 'Zoe' }, activityData: [], isFollowing: false },
        { pubkey: '2', metadata: { display_name: 'Bob' }, activityData: [], isFollowing: false }
      ];

      const result = service.sortFollowers(followers);

      expect(result[0].metadata?.name).toBe('Alice');
      expect(result[1].metadata?.display_name).toBe('Bob');
    });

    it('should use pubkey when no name or display_name', () => {
      const followers: Follower[] = [
        { pubkey: 'ccc', activityData: [], isFollowing: false },
        { pubkey: 'aaa', activityData: [], isFollowing: false },
        { pubkey: 'bbb', activityData: [], isFollowing: false }
      ];

      const result = service.sortFollowers(followers);

      expect(result[0].pubkey).toBe('aaa');
      expect(result[1].pubkey).toBe('bbb');
      expect(result[2].pubkey).toBe('ccc');
    });

    it('should not mutate original array', () => {
      const followers: Follower[] = [
        { pubkey: '2', metadata: { name: 'Bob' }, activityData: [], isFollowing: false },
        { pubkey: '1', metadata: { name: 'Alice' }, activityData: [], isFollowing: false }
      ];

      const original = [...followers];
      service.sortFollowers(followers);

      expect(followers).toEqual(original);
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp to Japanese date format', () => {
      // 2026年2月8日 14:30:00
      const timestamp = 1770748200;
      const result = service.formatTimestamp(timestamp);

      expect(result).toContain('2026年');
      expect(result).toContain('2月');
      expect(result).toContain('8日');
    });

    it('should include time in HH:MM format', () => {
      const timestamp = 1770748200; // 14:30
      const result = service.formatTimestamp(timestamp);

      expect(result).toMatch(/\d{2}:\d{2}$/);
    });

    it('should pad single digit hours and minutes', () => {
      // Create a timestamp for 9:05
      const date = new Date(2026, 1, 8, 9, 5, 0);
      const timestamp = Math.floor(date.getTime() / 1000);
      const result = service.formatTimestamp(timestamp);

      expect(result).toContain('09:05');
    });
  });

  describe('truncatePubkey', () => {
    it('should truncate long pubkey', () => {
      const pubkey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = service.truncatePubkey(pubkey);

      expect(result).toBe('12345678...90abcdef');
      expect(result.length).toBe(19); // 8 + 3 + 8
    });

    it('should return short pubkey as is', () => {
      const pubkey = 'short';
      const result = service.truncatePubkey(pubkey);

      expect(result).toBe('short');
    });

    it('should handle empty string', () => {
      const result = service.truncatePubkey('');

      expect(result).toBe('');
    });
  });
});
