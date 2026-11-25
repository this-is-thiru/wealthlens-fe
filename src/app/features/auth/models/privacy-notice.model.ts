export interface PrivacyRight {
  section?: string;
  summary?: string;
  means?: string;
  endpoints?: string[];
}

export type ConsentNotice = Record<string, unknown>;

export interface PrivacyNotice {
  rights: PrivacyRight[];
  identifier: string;
  contact: string;
  grievanceResponseDays: number;
  purposeLapse: string;
  consent?: ConsentNotice;
  version: string;
}
