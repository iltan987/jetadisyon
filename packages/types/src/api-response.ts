import type { ResponseCode } from './response-codes.js';

export interface ApiResponse<T = undefined> {
  code: ResponseCode;
  message: string;
  data?: T;
}
