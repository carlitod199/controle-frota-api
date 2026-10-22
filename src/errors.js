export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (message) => new AppError(404, 'NOT_FOUND', message);

export const conflict = (message) => new AppError(409, 'CONFLICT', message);
