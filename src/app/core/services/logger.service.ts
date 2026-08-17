import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../config/api-endpoints';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const CSRF_COOKIE_NAME = 'admin_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
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
    this.report('error', message, context);
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

  /** Best-effort only. Uses raw fetch (not HttpClient) so a failed report never
   * re-enters error.interceptor.ts, which itself calls LoggerService.error() on
   * every failed HTTP request - looping through HttpClient here could recurse. */
  private report(level: LogLevel, message: string, context?: LogContext): void {
    const token = readCookie(CSRF_COOKIE_NAME);

    fetch(`${environment.apiUrl}${API_ENDPOINTS.logs.create}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { [CSRF_HEADER_NAME]: token } : {}),
      },
      body: JSON.stringify({
        level,
        message,
        context: context ?? null,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Swallow - reporting failures must never throw or log again.
    });
  }
}
