import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/problem-detail.model';

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Extracts an RFC 9457 `ProblemDetail` payload from an `HttpErrorResponse` (or plain error object),
 * including when `responseType: 'text'` causes Angular to hand back `err.error` as a JSON string.
 */
export function parseProblemDetail(err: unknown): ProblemDetail | null {
  const errObj = asRecord(err);
  let body: unknown = errObj ? errObj['error'] : null;

  if (typeof body === 'string') {
    const parsed = tryParseJson(body);
    if (!parsed) return null;
    body = parsed;
  }

  const record = asRecord(body);
  if (!record) return null;

  // Support legacy `{ data: { ... } }` envelope if ever encountered
  const inner = asRecord(record['data']) ?? record;

  if (
    typeof inner['detail'] === 'string' ||
    typeof inner['title'] === 'string' ||
    typeof inner['type'] === 'string'
  ) {
    return inner as ProblemDetail;
  }

  return null;
}

/**
 * Extracts a user-friendly error message from an HTTP error or generic Error,
 * prioritizing RFC 9457 `ProblemDetail.detail`, then `ProblemDetail.title`, then
 * legacy `message` / `error` fields, then plain-text bodies, and finally `fallback`.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const problem = parseProblemDetail(err);
  if (problem?.detail && problem.detail.trim()) {
    return problem.detail.trim();
  }
  if (problem?.title && problem.title.trim()) {
    return problem.title.trim();
  }

  const errObj = asRecord(err);
  const rawBody = errObj ? errObj['error'] : null;

  if (typeof rawBody === 'string') {
    const parsed = tryParseJson(rawBody);
    const parsedRec = asRecord(parsed);
    if (parsedRec) {
      const legacy =
        (typeof parsedRec['message'] === 'string' &&
          parsedRec['message'].trim()) ||
        (typeof parsedRec['error'] === 'string' && parsedRec['error'].trim());
      if (legacy) return legacy;
    } else if (rawBody.trim()) {
      return rawBody.trim();
    }
  } else {
    const bodyRec = asRecord(rawBody);
    const inner = (bodyRec && asRecord(bodyRec['data'])) || bodyRec;
    if (inner) {
      const legacy =
        (typeof inner['message'] === 'string' && inner['message'].trim()) ||
        (typeof inner['error'] === 'string' && inner['error'].trim());
      if (legacy) return legacy;
    }
  }

  // Avoid leaking Angular's technical "Http failure response for <url>..." to end users
  const isHttpError =
    err instanceof HttpErrorResponse ||
    (errObj && errObj['name'] === 'HttpErrorResponse');
  if (
    !isHttpError &&
    errObj &&
    typeof errObj['message'] === 'string' &&
    errObj['message'].trim()
  ) {
    return errObj['message'].trim();
  }

  return fallback;
}

/**
 * Parses the HTTP `Retry-After` response header (either integer seconds or HTTP-date)
 * into a positive number of seconds remaining, or `null` if absent/unparseable.
 */
export function parseRetryAfterSeconds(err: unknown): number | null {
  if (!(err instanceof HttpErrorResponse) || !err.headers) {
    return null;
  }

  const header = err.headers.get('Retry-After');
  if (!header) return null;

  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  const targetMs = Date.parse(trimmed);
  if (!Number.isNaN(targetMs)) {
    const diffSeconds = Math.ceil((targetMs - Date.now()) / 1000);
    return diffSeconds > 0 ? diffSeconds : null;
  }

  return null;
}

/**
 * Formats a user-facing 429 rate-limit message using `ProblemDetail.detail` and/or `Retry-After`.
 */
export function formatRateLimitMessage(
  err: unknown,
  fallback = 'Too many attempts. Please wait a moment and try again.',
): string {
  const retryAfter = parseRetryAfterSeconds(err);
  const problem = parseProblemDetail(err);
  const detail = problem?.detail?.trim();

  if (detail && retryAfter) {
    return detail.toLowerCase().includes('second') ||
      detail.toLowerCase().includes('minute')
      ? detail
      : `${detail} Please try again in ${retryAfter} seconds.`;
  }
  if (detail) return detail;
  if (retryAfter) {
    return `Too many attempts. Please try again in ${retryAfter} seconds.`;
  }
  return fallback;
}
