import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (level === 'debug' && !environment.enableDebugLogs) {
      return;
    }

    console[level]({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    });
  }
}