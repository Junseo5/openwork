/**
 * Unit tests for Logger utility
 *
 * Tests the centralized logging system that provides structured logging
 * for debugging and error tracking across the application.
 *
 * @module __tests__/unit/main/utils/logger.unit.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock electron module
const mockApp = {
  isPackaged: false,
  getPath: vi.fn((name: string) => `/mock/path/${name}`),
  getVersion: vi.fn(() => '1.0.0'),
  name: 'Openwork',
};

vi.mock('electron', () => ({
  app: mockApp,
}));

// Mock fs module
const mockFs = {
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 1000 })),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  writeFileSync: vi.fn(),
};

vi.mock('fs', () => ({
  default: mockFs,
  existsSync: mockFs.existsSync,
  mkdirSync: mockFs.mkdirSync,
  appendFileSync: mockFs.appendFileSync,
  statSync: mockFs.statSync,
  renameSync: mockFs.renameSync,
  unlinkSync: mockFs.unlinkSync,
  readdirSync: mockFs.readdirSync,
  writeFileSync: mockFs.writeFileSync,
}));

describe('Logger Module', () => {
  let Logger: typeof import('@main/utils/logger').Logger;
  let LogLevel: typeof import('@main/utils/logger').LogLevel;
  let createLogger: typeof import('@main/utils/logger').createLogger;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Re-import module to get fresh state
    const module = await import('@main/utils/logger');
    Logger = module.Logger;
    LogLevel = module.LogLevel;
    createLogger = module.createLogger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger Class', () => {
    describe('Constructor and Configuration', () => {
      it('should create logger with default configuration', () => {
        // Act
        const logger = new Logger('test-module');

        // Assert
        expect(logger).toBeDefined();
        expect(logger.getModuleName()).toBe('test-module');
      });

      it('should create logger with custom log level', () => {
        // Act
        const logger = new Logger('test-module', { level: LogLevel.DEBUG });

        // Assert
        expect(logger.getLevel()).toBe(LogLevel.DEBUG);
      });

      it('should create logger with file logging enabled', () => {
        // Act
        const logger = new Logger('test-module', { fileLogging: true });

        // Assert
        expect(logger.isFileLoggingEnabled()).toBe(true);
      });
    });

    describe('Logging Methods', () => {
      it('should log debug messages when level is DEBUG', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.DEBUG });

        // Act
        logger.debug('Debug message', { key: 'value' });

        // Assert
        expect(console.debug).toHaveBeenCalled();
      });

      it('should not log debug messages when level is INFO', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.INFO });

        // Act
        logger.debug('Debug message');

        // Assert
        expect(console.debug).not.toHaveBeenCalled();
      });

      it('should log info messages', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.INFO });

        // Act
        logger.info('Info message');

        // Assert
        expect(console.log).toHaveBeenCalled();
      });

      it('should log warning messages', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.WARN });

        // Act
        logger.warn('Warning message');

        // Assert
        expect(console.warn).toHaveBeenCalled();
      });

      it('should log error messages with Error objects', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.ERROR });
        const error = new Error('Test error');

        // Act
        logger.error('Error occurred', error);

        // Assert
        expect(console.error).toHaveBeenCalled();
      });

      it('should include timestamp in log output', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.INFO });

        // Act
        logger.info('Test message');

        // Assert
        const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}/);
      });

      it('should include module name in log output', () => {
        // Arrange
        const logger = new Logger('my-module', { level: LogLevel.INFO });

        // Act
        logger.info('Test message');

        // Assert
        const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call[0]).toContain('[my-module]');
      });
    });

    describe('Structured Logging', () => {
      it('should log with context data', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.INFO });
        const context = { userId: '123', action: 'login' };

        // Act
        logger.info('User action', context);

        // Assert
        expect(console.log).toHaveBeenCalled();
        const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call.length).toBeGreaterThan(1);
      });

      it('should handle circular references in context', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.INFO });
        const context: Record<string, unknown> = { key: 'value' };
        context.self = context; // Circular reference

        // Act & Assert - should not throw
        expect(() => logger.info('Circular context', context)).not.toThrow();
      });
    });

    describe('File Logging', () => {
      it('should write to file when file logging is enabled', () => {
        // Arrange
        const logger = new Logger('test', { fileLogging: true, level: LogLevel.INFO });

        // Act
        logger.info('File log message');

        // Assert
        expect(mockFs.appendFileSync).toHaveBeenCalled();
      });

      it('should not write to file when file logging is disabled', () => {
        // Arrange
        const logger = new Logger('test', { fileLogging: false, level: LogLevel.INFO });

        // Act
        logger.info('Console only message');

        // Assert
        expect(mockFs.appendFileSync).not.toHaveBeenCalled();
      });

      it('should create logs directory if it does not exist', () => {
        // Arrange
        mockFs.existsSync.mockReturnValueOnce(false);
        const logger = new Logger('test', { fileLogging: true, level: LogLevel.INFO });

        // Act
        logger.info('Test message');

        // Assert
        expect(mockFs.mkdirSync).toHaveBeenCalled();
      });
    });

    describe('Log Level Control', () => {
      it('should filter logs below current level', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.ERROR });

        // Act
        logger.debug('Debug');
        logger.info('Info');
        logger.warn('Warn');
        logger.error('Error');

        // Assert
        expect(console.debug).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
      });

      it('should allow changing log level at runtime', () => {
        // Arrange
        const logger = new Logger('test', { level: LogLevel.ERROR });

        // Act & Assert - initially only errors
        logger.info('Should not log');
        expect(console.log).not.toHaveBeenCalled();

        // Change level
        logger.setLevel(LogLevel.INFO);
        logger.info('Should log now');
        expect(console.log).toHaveBeenCalled();
      });
    });
  });

  describe('createLogger Factory', () => {
    it('should create a new logger instance', () => {
      // Act
      const logger = createLogger('factory-test');

      // Assert
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getModuleName()).toBe('factory-test');
    });

    it('should pass options to logger', () => {
      // Act
      const logger = createLogger('factory-test', { level: LogLevel.DEBUG });

      // Assert
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('LogLevel Enum', () => {
    it('should have correct level ordering', () => {
      // Assert
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
    });
  });
});
