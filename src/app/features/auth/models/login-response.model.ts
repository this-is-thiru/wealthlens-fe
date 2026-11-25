export interface LoginResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  tokenType: string;
  privacy_notice?: string;
  privacy_notice_version?: string;
  email?: string;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  tokenType: string;
}
