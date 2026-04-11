import type { ResponseCode } from "./response-codes";

export interface ApiResponse<T = undefined> {
  code: ResponseCode;
  message: string;
  data?: T;
}
