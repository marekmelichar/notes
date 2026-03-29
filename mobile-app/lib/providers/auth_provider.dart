import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app_providers.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final bool isLoading;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.isLoading = false,
  });

  AuthState copyWith({AuthStatus? status, bool? isLoading}) {
    return AuthState(
      status: status ?? this.status,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AuthState());

  Future<void> initialize() async {
    state = state.copyWith(isLoading: true);
    final authService = _ref.read(authServiceProvider);
    final restored = await authService.tryRestoreSession();
    state = AuthState(
      status:
          restored ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    );
  }

  Future<void> login() async {
    state = state.copyWith(isLoading: true);
    final authService = _ref.read(authServiceProvider);
    final success = await authService.login();
    state = AuthState(
      status:
          success ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    );
  }

  Future<void> logout() async {
    final authService = _ref.read(authServiceProvider);
    await authService.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
