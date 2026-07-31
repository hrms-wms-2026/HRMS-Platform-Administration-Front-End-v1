import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export type ErrorCategory =
  | 'session-expired'
  | 'access-denied'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'rate-limited'
  | 'server-error'
  | 'service-unavailable'
  | 'offline'
  | 'unknown';

const RETRYABLE_STATUSES = new Set([0, 500, 502, 503, 504]);

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  categorize(error: HttpErrorResponse): ErrorCategory {
    switch (error.status) {
      case 401:
        return 'session-expired';
      case 403:
        return 'access-denied';
      case 404:
        return 'not-found';
      case 409:
        return 'conflict';
      case 422:
        return 'validation';
      case 429:
        return 'rate-limited';
      case 500:
        return 'server-error';
      case 503:
        return 'service-unavailable';
      case 0:
        return 'offline';
      default:
        return 'unknown';
    }
  }

  isRetryable(error: HttpErrorResponse): boolean {
    return RETRYABLE_STATUSES.has(error.status);
  }

  messageFor(category: ErrorCategory): string {
    switch (category) {
      case 'session-expired':
        return 'Your session has expired. Please sign in again.';
      case 'access-denied':
        return "You don't have permission to perform this action.";
      case 'not-found':
        return 'The requested record could not be found.';
      case 'conflict':
        return 'This record was changed by someone else. Please refresh and try again.';
      case 'validation':
        return 'Please check the highlighted fields and try again.';
      case 'rate-limited':
        return 'Too many requests. Please wait a moment and try again.';
      case 'server-error':
        return 'Something went wrong on our end. Please try again.';
      case 'service-unavailable':
        return 'The service is temporarily unavailable. Please try again shortly.';
      case 'offline':
        return 'Connection failed. Check your network and try again.';
      default:
        return 'An unexpected error occurred.';
    }
  }
}