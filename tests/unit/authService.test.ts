import { describe, it, expect } from 'vitest';
import { AuthService } from '../../src/lib/domain/authentication/authService';

describe('AuthService (FR-SEC-01, NFR-SEC-02)', () => {
  it('authenticates valid operator credential', () => {
    const result = AuthService.attemptLogin('1234', 0);
    expect(result.success).toBe(true);
    expect(result.isLocked).toBe(false);
    expect(result.newFailedAttempts).toBe(0);
  });

  it('increments failed attempts on invalid PIN', () => {
    const result = AuthService.attemptLogin('9999', 2);
    expect(result.success).toBe(false);
    expect(result.isLocked).toBe(false);
    expect(result.newFailedAttempts).toBe(3);
    expect(result.errorMessage).toContain('2 attempt(s) remaining');
  });

  it('locks terminal after 5 failed attempts for 15 minutes', () => {
    const result = AuthService.attemptLogin('wrong', 4);
    expect(result.success).toBe(false);
    expect(result.isLocked).toBe(true);
    expect(result.remainingLockoutMinutes).toBe(15);
    expect(result.newLockedUntil).toBeDefined();
    expect(result.errorMessage).toContain('Terminal locked for 15 minutes');
  });

  it('rejects attempt when lock is still active', () => {
    const futureLock = Date.now() + 10 * 60 * 1000; // 10 minutes in future
    const result = AuthService.attemptLogin('1234', 5, futureLock);
    expect(result.success).toBe(false);
    expect(result.isLocked).toBe(true);
    expect(result.remainingLockoutMinutes).toBe(10);
    expect(result.errorMessage).toContain('Terminal locked');
  });
});
