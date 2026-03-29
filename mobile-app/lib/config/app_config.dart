class AppConfig {
  final String apiBaseUrl;
  final String keycloakUrl;
  final String keycloakRealm;
  final String keycloakClientId;
  final String redirectUri;

  const AppConfig({
    required this.apiBaseUrl,
    required this.keycloakUrl,
    this.keycloakRealm = 'notes',
    this.keycloakClientId = 'notes-mobile',
    this.redirectUri = 'eu.nettio.notes://callback',
  });

  String get keycloakIssuer =>
      '$keycloakUrl/realms/$keycloakRealm';

  String get keycloakDiscoveryUrl =>
      '$keycloakIssuer/.well-known/openid-configuration';

  static const dev = AppConfig(
    apiBaseUrl: 'http://10.0.2.2:5001',
    keycloakUrl: 'http://10.0.2.2:8080',
  );

  static const prod = AppConfig(
    apiBaseUrl: 'https://notes.nettio.eu',
    keycloakUrl: 'https://auth.nettio.eu',
  );
}
