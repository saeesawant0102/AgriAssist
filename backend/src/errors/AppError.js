export class AppError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} code - Error code (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
   * @param {string} message - Human readable error message
   * @param {Array<any>} [details=[]] - Optional structured error details
   */
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details = []) {
    return new AppError(400, code, message, details);
  }

  static validation(message = 'Validation failed', details = []) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static locationNotFound(message = 'Farm location could not be geocoded') {
    return new AppError(400, 'LOCATION_NOT_FOUND', message);
  }

  static unauthenticated(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'Access forbidden', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }

  static accountDisabled(message = 'Account is disabled. Please contact administrator.') {
    return new AppError(403, 'ACCOUNT_DISABLED', message);
  }

  static profileNotFound(message = 'User profile not found') {
    return new AppError(403, 'PROFILE_NOT_FOUND', message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new AppError(409, code, message);
  }

  static emailAlreadyExists(message = 'An account with this email already exists') {
    return new AppError(409, 'EMAIL_ALREADY_EXISTS', message);
  }

  static weatherUnavailable(message = 'Weather service is currently unavailable') {
    return new AppError(502, 'WEATHER_UNAVAILABLE', message);
  }

  static internal(message = 'Internal server error') {
    return new AppError(500, 'INTERNAL', message);
  }
}
