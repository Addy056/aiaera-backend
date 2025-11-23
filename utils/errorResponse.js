// backend/utils/ErrorResponse.js

/**
 * Custom Error Class for cleaner controller error handling.
 * Use this when you want to throw HTTP-friendly errors:
 *
 *    throw new ErrorResponse("Not found", 404);
 *
 */
export class ErrorResponse extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;

    // Maintains proper stack trace for where error was created
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }
}
