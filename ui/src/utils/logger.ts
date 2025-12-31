/**
 * Logger Utility
 *
 * Provides controlled logging based on environment.
 * In production, only error logs are shown.
 * In development, all log levels are available.
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

// Determine current log level based on environment
const getCurrentLevel = (): number => {
  if (import.meta.env.PROD) {
    return LOG_LEVELS.error;
  }
  return LOG_LEVELS.debug;
};

const currentLevel = getCurrentLevel();

/**
 * Centralized logger with environment-aware logging
 */
export const logger = {
  /**
   * Log error messages (always shown)
   */
  error: (message: string, ...args: unknown[]): void => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  /**
   * Log warning messages (shown in development)
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log info messages (shown in development)
   */
  info: (message: string, ...args: unknown[]): void => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log debug messages (shown in development)
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
};
