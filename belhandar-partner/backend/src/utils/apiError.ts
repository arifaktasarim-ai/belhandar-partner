export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Yetkisiz erisim') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Bu islemi yapmaya yetkiniz yok') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Kayit bulunamadi') {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static internal(message = 'Sunucu hatasi olustu') {
    return new ApiError(500, message);
  }
}
