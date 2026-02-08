import { TestBed } from '@angular/core/testing';
import { Nip07Service } from './nip07.service';
import { NostrService } from './nostr.service';
import { of, throwError } from 'rxjs';
import { NostrEvent } from '../models/nostr-event.model';

describe('Nip07Service', () => {
  let service: Nip07Service;
  let nostrServiceSpy: jasmine.SpyObj<NostrService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('NostrService', ['connect', 'subscribeToEvents']);
    
    TestBed.configureTestingModule({
      providers: [
        Nip07Service,
        { provide: NostrService, useValue: spy }
      ]
    });
    service = TestBed.inject(Nip07Service);
    nostrServiceSpy = TestBed.inject(NostrService) as jasmine.SpyObj<NostrService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAvailable', () => {
    it('should return false when window.nostr is not defined', () => {
      delete (window as any).nostr;
      expect(service.isAvailable()).toBe(false);
    });

    it('should return true when window.nostr is defined', () => {
      (window as any).nostr = { getPublicKey: () => Promise.resolve('test') };
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('login', () => {
    it('should return error when NIP-07 is not available', (done) => {
      delete (window as any).nostr;
      
      service.login().subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.message).toContain('NIP-07 拡張機能が見つかりません');
          done();
        }
      });
    });

    it('should return pubkey on successful login', (done) => {
      const mockPubkey = 'test-pubkey-123';
      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      service.login().subscribe({
        next: (pubkey) => {
          expect(pubkey).toBe(mockPubkey);
          expect(service.getCurrentUserPubkey()).toBe(mockPubkey);
          done();
        },
        error: () => fail('Should not fail')
      });
    });

    it('should handle login failure', (done) => {
      (window as any).nostr = {
        getPublicKey: () => Promise.reject(new Error('User rejected'))
      };

      service.login().subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.message).toContain('ログインに失敗しました');
          done();
        }
      });
    });
  });

  describe('logout', () => {
    it('should clear current user pubkey', (done) => {
      const mockPubkey = 'test-pubkey-123';
      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      service.login().subscribe({
        next: () => {
          expect(service.getCurrentUserPubkey()).toBe(mockPubkey);
          service.logout();
          expect(service.getCurrentUserPubkey()).toBeNull();
          done();
        }
      });
    });
  });

  describe('getCurrentUserContactList', () => {
    it('should return error when not logged in', (done) => {
      service.getCurrentUserContactList().subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.message).toContain('ログインしていません');
          done();
        }
      });
    });

    it('should return following list from kind:3 event', (done) => {
      const mockPubkey = 'user-pubkey';
      const mockEvent: NostrEvent = {
        id: 'event1',
        pubkey: mockPubkey,
        created_at: Date.now(),
        kind: 3,
        tags: [
          ['p', 'following1'],
          ['p', 'following2'],
          ['p', 'following3']
        ],
        content: '',
        sig: 'sig1'
      };

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of(mockEvent));

      service.login().subscribe(() => {
        service.getCurrentUserContactList().subscribe({
          next: (followingList) => {
            expect(followingList).toEqual(['following1', 'following2', 'following3']);
            done();
          },
          error: () => fail('Should not fail')
        });
      });
    });

    it('should return empty array when no contact list found', (done) => {
      const mockPubkey = 'user-pubkey';

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of());

      service.login().subscribe(() => {
        service.getCurrentUserContactList().subscribe({
          next: (followingList) => {
            expect(followingList).toEqual([]);
            done();
          },
          error: () => fail('Should not fail')
        });
      });
    });
  });

  describe('checkFollowingStatus', () => {
    it('should return status map for given pubkeys', (done) => {
      const mockPubkey = 'user-pubkey';
      const mockEvent: NostrEvent = {
        id: 'event1',
        pubkey: mockPubkey,
        created_at: Date.now(),
        kind: 3,
        tags: [
          ['p', 'following1'],
          ['p', 'following2']
        ],
        content: '',
        sig: 'sig1'
      };

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of(mockEvent));

      service.login().subscribe(() => {
        const pubkeysToCheck = ['following1', 'following2', 'not-following'];
        
        service.checkFollowingStatus(pubkeysToCheck).subscribe({
          next: (statusMap) => {
            expect(statusMap.get('following1')).toBe(true);
            expect(statusMap.get('following2')).toBe(true);
            expect(statusMap.get('not-following')).toBe(false);
            done();
          },
          error: () => fail('Should not fail')
        });
      });
    });

    it('should return all false on error', (done) => {
      const mockPubkey = 'user-pubkey';

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      nostrServiceSpy.connect.and.returnValue(throwError(() => new Error('Connection failed')));

      service.login().subscribe(() => {
        const pubkeysToCheck = ['pubkey1', 'pubkey2'];
        
        service.checkFollowingStatus(pubkeysToCheck).subscribe({
          next: (statusMap) => {
            expect(statusMap.get('pubkey1')).toBe(false);
            expect(statusMap.get('pubkey2')).toBe(false);
            done();
          },
          error: () => fail('Should not fail')
        });
      });
    });
  });

  describe('signEvent', () => {
    it('should return error when NIP-07 is not available', (done) => {
      delete (window as any).nostr;
      
      const unsignedEvent = {
        pubkey: 'test',
        created_at: 123456,
        kind: 1,
        tags: [],
        content: 'test'
      };

      service.signEvent(unsignedEvent).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.message).toContain('NIP-07 拡張機能が見つかりません');
          done();
        }
      });
    });

    it('should sign event successfully', (done) => {
      const unsignedEvent = {
        pubkey: 'test-pubkey',
        created_at: 123456,
        kind: 1,
        tags: [],
        content: 'test content'
      };

      const signedEvent: NostrEvent = {
        ...unsignedEvent,
        id: 'event-id',
        sig: 'signature'
      };

      (window as any).nostr = {
        signEvent: (event: any) => Promise.resolve(signedEvent)
      };

      service.signEvent(unsignedEvent).subscribe({
        next: (result) => {
          expect(result).toEqual(signedEvent);
          done();
        },
        error: () => fail('Should not fail')
      });
    });
  });

  describe('followUser', () => {
    it('should return error when not logged in', (done) => {
      service.followUser('target-pubkey').subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.message).toContain('ログインしていません');
          done();
        }
      });
    });

    it('should return true if already following', (done) => {
      const mockPubkey = 'user-pubkey';
      const targetPubkey = 'target-pubkey';
      const mockEvent: NostrEvent = {
        id: 'event1',
        pubkey: mockPubkey,
        created_at: Date.now(),
        kind: 3,
        tags: [
          ['p', targetPubkey]
        ],
        content: '',
        sig: 'sig1'
      };

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey)
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of(mockEvent));

      service.login().subscribe(() => {
        service.followUser(targetPubkey).subscribe({
          next: (result) => {
            expect(result).toBe(true);
            done();
          },
          error: () => fail('Should not fail')
        });
      });
    });

    it('should follow new user successfully', (done) => {
      const mockPubkey = 'user-pubkey';
      const targetPubkey = 'new-target-pubkey';
      const mockContactEvent: NostrEvent = {
        id: 'event1',
        pubkey: mockPubkey,
        created_at: Date.now(),
        kind: 3,
        tags: [
          ['p', 'existing-follow']
        ],
        content: '',
        sig: 'sig1'
      };

      const signedEvent: NostrEvent = {
        id: 'new-event-id',
        pubkey: mockPubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 3,
        tags: [
          ['p', 'existing-follow'],
          ['p', targetPubkey]
        ],
        content: '',
        sig: 'new-sig'
      };

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey),
        signEvent: (event: any) => Promise.resolve(signedEvent)
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of(mockContactEvent));
      (nostrServiceSpy as any).publishEvent = jasmine.createSpy('publishEvent')
        .and.returnValue(of(true));

      service.login().subscribe(() => {
        service.followUser(targetPubkey).subscribe({
          next: (result) => {
            expect(result).toBe(true);
            expect((nostrServiceSpy as any).publishEvent).toHaveBeenCalled();
            done();
          },
          error: () => fail('Should not fail')
        });
      });
    });

    it('should handle sign event failure', (done) => {
      const mockPubkey = 'user-pubkey';
      const targetPubkey = 'new-target-pubkey';
      const mockContactEvent: NostrEvent = {
        id: 'event1',
        pubkey: mockPubkey,
        created_at: Date.now(),
        kind: 3,
        tags: [],
        content: '',
        sig: 'sig1'
      };

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey),
        signEvent: (event: any) => Promise.reject(new Error('User rejected'))
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of(mockContactEvent));

      service.login().subscribe(() => {
        service.followUser(targetPubkey).subscribe({
          next: () => fail('Should not succeed'),
          error: (error) => {
            expect(error.message).toContain('イベントの署名に失敗しました');
            done();
          }
        });
      });
    });

    it('should handle publish event failure', (done) => {
      const mockPubkey = 'user-pubkey';
      const targetPubkey = 'new-target-pubkey';
      const mockContactEvent: NostrEvent = {
        id: 'event1',
        pubkey: mockPubkey,
        created_at: Date.now(),
        kind: 3,
        tags: [],
        content: '',
        sig: 'sig1'
      };

      const signedEvent: NostrEvent = {
        id: 'new-event-id',
        pubkey: mockPubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 3,
        tags: [['p', targetPubkey]],
        content: '',
        sig: 'new-sig'
      };

      (window as any).nostr = {
        getPublicKey: () => Promise.resolve(mockPubkey),
        signEvent: (event: any) => Promise.resolve(signedEvent)
      };

      nostrServiceSpy.connect.and.returnValue(of(undefined));
      (nostrServiceSpy as any).subscribeToEvents = jasmine.createSpy('subscribeToEvents')
        .and.returnValue(of(mockContactEvent));
      (nostrServiceSpy as any).publishEvent = jasmine.createSpy('publishEvent')
        .and.returnValue(throwError(() => new Error('Publish failed')));

      service.login().subscribe(() => {
        service.followUser(targetPubkey).subscribe({
          next: () => fail('Should not succeed'),
          error: (error) => {
            expect(error.message).toContain('フォロー処理に失敗しました');
            done();
          }
        });
      });
    });
  });
});
