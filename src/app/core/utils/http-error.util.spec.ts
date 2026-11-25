import { describe, expect, it } from 'vitest';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
  extractErrorMessage,
  formatRateLimitMessage,
  parseProblemDetail,
  parseRetryAfterSeconds,
} from './http-error.util';

describe('http-error.util', () => {
  it('parses RFC 9457 ProblemDetail objects and prioritizes detail over title', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'privacyNoticeVersion is required',
        instance: '/api/v1/public/auth/register',
      },
    });

    expect(parseProblemDetail(err)?.detail).toBe(
      'privacyNoticeVersion is required',
    );
    expect(extractErrorMessage(err, 'Fallback')).toBe(
      'privacyNoticeVersion is required',
    );
  });

  it('parses ProblemDetail JSON string returned when responseType is text', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: JSON.stringify({
        title: 'Conflict',
        status: 409,
        detail: 'Email already registered',
      }),
    });

    expect(extractErrorMessage(err, 'Fallback')).toBe(
      'Email already registered',
    );
  });

  it('falls back to ProblemDetail.title when detail is absent', () => {
    const err = new HttpErrorResponse({
      status: 403,
      error: { title: 'Forbidden', status: 403 },
    });

    expect(extractErrorMessage(err, 'Fallback')).toBe('Forbidden');
  });

  it('supports plain-text error bodies and legacy { message } payloads', () => {
    const plain = new HttpErrorResponse({
      status: 400,
      error: 'Invalid quarter: Q5',
    });
    const legacy = new HttpErrorResponse({
      status: 400,
      error: { message: 'Legacy failure' },
    });

    expect(extractErrorMessage(plain, 'Fallback')).toBe('Invalid quarter: Q5');
    expect(extractErrorMessage(legacy, 'Fallback')).toBe('Legacy failure');
  });

  it('does not leak Angular HttpErrorResponse technical message to users', () => {
    const err = new HttpErrorResponse({
      status: 500,
      url: '/api/v1/me/portfolio/stocks',
    });
    expect(extractErrorMessage(err, 'Something went wrong')).toBe(
      'Something went wrong',
    );
  });

  it('parses Retry-After integer seconds and formats 429 rate-limit messages', () => {
    const err = new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': '45' }),
      error: {
        title: 'Too Many Requests',
        status: 429,
        detail: 'Rate limit exceeded.',
      },
    });

    expect(parseRetryAfterSeconds(err)).toBe(45);
    expect(formatRateLimitMessage(err)).toBe(
      'Rate limit exceeded. Please try again in 45 seconds.',
    );
  });
});
