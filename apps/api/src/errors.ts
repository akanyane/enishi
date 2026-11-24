import type { ApiError } from "@enishi/shared";

/** Error carrying an HTTP status and optional structured details for the client. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: Pick<ApiError, "fields" | "duplicateId"> = {},
  ) {
    super(message);
  }
}
