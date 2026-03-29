import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class AuthService {
  final FlutterAppAuth _appAuth;
  final FlutterSecureStorage _secureStorage;
  final AppConfig _config;

  String? _accessToken;
  String? _refreshToken;
  DateTime? _expiresAt;

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _expiresAtKey = 'expires_at';

  AuthService({
    required AppConfig config,
    FlutterAppAuth? appAuth,
    FlutterSecureStorage? secureStorage,
  })  : _config = config,
        _appAuth = appAuth ?? const FlutterAppAuth(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  String? get accessToken => _accessToken;
  bool get isAuthenticated => _accessToken != null;

  bool get isTokenExpired {
    if (_expiresAt == null) return true;
    return DateTime.now().isAfter(
      _expiresAt!.subtract(const Duration(seconds: 60)),
    );
  }

  Future<bool> tryRestoreSession() async {
    _accessToken = await _secureStorage.read(key: _accessTokenKey);
    _refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    final expiresAtStr = await _secureStorage.read(key: _expiresAtKey);
    if (expiresAtStr != null) {
      _expiresAt = DateTime.tryParse(expiresAtStr);
    }

    if (_refreshToken != null) {
      try {
        await refreshAccessToken();
        return true;
      } catch (_) {
        await _clearTokens();
        return false;
      }
    }
    return false;
  }

  Future<bool> login() async {
    try {
      final result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          _config.keycloakClientId,
          _config.redirectUri,
          discoveryUrl: _config.keycloakDiscoveryUrl,
          scopes: ['openid', 'offline_access'],
          promptValues: ['login'],
        ),
      );

      if (result != null) {
        await _handleTokenResponse(result);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> refreshAccessToken() async {
    if (_refreshToken == null) {
      throw Exception('No refresh token available');
    }

    final result = await _appAuth.token(
      TokenRequest(
        _config.keycloakClientId,
        _config.redirectUri,
        discoveryUrl: _config.keycloakDiscoveryUrl,
        refreshToken: _refreshToken,
        scopes: ['openid', 'offline_access'],
      ),
    );

    if (result != null) {
      await _handleTokenResponse(result);
    } else {
      throw Exception('Token refresh failed');
    }
  }

  Future<void> logout() async {
    await _clearTokens();
  }

  Future<String?> getValidAccessToken() async {
    if (_accessToken == null) return null;

    if (isTokenExpired) {
      try {
        await refreshAccessToken();
      } catch (_) {
        await _clearTokens();
        return null;
      }
    }
    return _accessToken;
  }

  Future<void> _handleTokenResponse(TokenResponse response) async {
    _accessToken = response.accessToken;
    _refreshToken = response.refreshToken;
    _expiresAt = response.accessTokenExpirationDateTime;

    await _secureStorage.write(
      key: _accessTokenKey,
      value: _accessToken,
    );
    if (_refreshToken != null) {
      await _secureStorage.write(
        key: _refreshTokenKey,
        value: _refreshToken,
      );
    }
    if (_expiresAt != null) {
      await _secureStorage.write(
        key: _expiresAtKey,
        value: _expiresAt!.toIso8601String(),
      );
    }
  }

  Future<void> _clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    _expiresAt = null;
    await _secureStorage.deleteAll();
  }
}
