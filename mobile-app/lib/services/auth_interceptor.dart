import 'package:dio/dio.dart';
import 'auth_service.dart';

class AuthInterceptor extends Interceptor {
  final AuthService _authService;

  AuthInterceptor(this._authService);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _authService.getValidAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      try {
        await _authService.refreshAccessToken();
        final token = _authService.accessToken;
        if (token != null) {
          err.requestOptions.headers['Authorization'] = 'Bearer $token';
          final response = await Dio().fetch(err.requestOptions);
          return handler.resolve(response);
        }
      } catch (_) {
        // Refresh failed — let the error propagate
      }
    }
    handler.next(err);
  }
}
