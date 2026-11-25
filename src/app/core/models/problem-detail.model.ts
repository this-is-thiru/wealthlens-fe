/**
 * RFC 9457 Problem Details for HTTP APIs returned by WealthLens backend `ControllerAdviser`.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}
