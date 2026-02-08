import { TestBed } from '@angular/core/testing';
import { NostrService } from './nostr.service';

describe('NostrService', () => {
  let service: NostrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NostrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate unique subscription IDs', () => {
    const id1 = (service as any).generateSubscriptionId();
    const id2 = (service as any).generateSubscriptionId();
    expect(id1).not.toEqual(id2);
  });

  it('should handle disconnect when not connected', () => {
    expect(() => service.disconnect()).not.toThrow();
  });
});
