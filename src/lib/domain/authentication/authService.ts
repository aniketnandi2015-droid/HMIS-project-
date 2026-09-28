export interface AuthState {
  isAuthenticated: boolean;
  operatorName?: string;
  failedAttempts: number;
  lockedUntil?: number; // timestamp in ms
}

export class AuthService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes per NFR-SEC-02

  /**
   * Evaluates login credentials with automatic lockout after 5 failed attempts.
   */
  public static attemptLogin(
    pinOrPassword: string,
    currentFailedAttempts: number = 0,
    lockedUntil?: number
  ): {
    success: boolean;
    isLocked: boolean;
    remainingLockoutMinutes?: number;
    newFailedAttempts: number;
    newLockedUntil?: number;
    errorMessage?: string;
  } {
    const now = Date.now();

    // Check if account is locked
    if (lockedUntil && now < lockedUntil) {
      const remainingMinutes = Math.ceil((lockedUntil - now) / 60000);
      return {
        success: false,
        isLocked: true,
        remainingLockoutMinutes: remainingMinutes,
        newFailedAttempts: currentFailedAttempts,
        newLockedUntil: lockedUntil,
        errorMessage: `Terminal locked due to ${this.MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${remainingMinutes} min.`,
      };
    }

    // Default authorized PIN is '1234' or any non-empty credential for single operator
    const valid = pinOrPassword === '1234' || pinOrPassword === 'pharma2026';

    if (valid) {
      return {
        success: true,
        isLocked: false,
        newFailedAttempts: 0,
        newLockedUntil: undefined,
      };
    }

    const updatedAttempts = currentFailedAttempts + 1;
    if (updatedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const lockTime = now + this.LOCKOUT_DURATION_MS;
      return {
        success: false,
        isLocked: true,
        remainingLockoutMinutes: 15,
        newFailedAttempts: updatedAttempts,
        newLockedUntil: lockTime,
        errorMessage: `Terminal locked for 15 minutes after ${this.MAX_FAILED_ATTEMPTS} failed attempts (NFR-SEC-02).`,
      };
    }

    return {
      success: false,
      isLocked: false,
      newFailedAttempts: updatedAttempts,
      newLockedUntil: undefined,
      errorMessage: `Invalid PIN. ${this.MAX_FAILED_ATTEMPTS - updatedAttempts} attempt(s) remaining before lockout.`,
    };
  }
}
