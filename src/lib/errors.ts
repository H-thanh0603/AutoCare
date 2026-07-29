/**
 * Application error hierarchy.
 *
 * `message` is safe to show to end users (Vietnamese, no internals).
 * Anything sensitive belongs in `details`, which is logged server-side only.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "TOO_MANY_REQUESTS"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: number,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.") {
    super("TOO_MANY_REQUESTS", message, 429);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Dung lượng dữ liệu vượt quá giới hạn cho phép.") {
    super("PAYLOAD_TOO_LARGE", message, 413);
  }
}

export class ValidationError extends AppError {
  /** Field-level messages keyed by form field path, for React Hook Form. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message = "Dữ liệu không hợp lệ.",
    fieldErrors?: Record<string, string[]>,
  ) {
    super("VALIDATION_ERROR", message, 400, fieldErrors);
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Bạn cần đăng nhập để tiếp tục.") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Bạn không có quyền thực hiện thao tác này.") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Không tìm thấy dữ liệu.") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Dữ liệu đã bị thay đổi bởi người khác. Hãy tải lại trang.") {
    super("CONFLICT", message, 409, undefined);
  }
}

/** Business rule broken — e.g. starting an unapproved repair item. */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super("BUSINESS_RULE_VIOLATION", message, 422, details);
  }
}

const GENERIC_MESSAGE = "Có lỗi xảy ra. Vui lòng thử lại.";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Convert any thrown value into a client-safe result.
 *
 * Unknown errors are logged with their stack and replaced by a generic
 * message so internals never reach the browser.
 */
export function toActionError(error: unknown): Extract<
  ActionResult<never>,
  { ok: false }
> {
  if (error instanceof ValidationError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }

  console.error("[unhandled-error]", error);
  return { ok: false, code: "INTERNAL_ERROR", message: GENERIC_MESSAGE };
}

/** Wrap a server action body so it always returns a serializable result. */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return toActionError(error);
  }
}
