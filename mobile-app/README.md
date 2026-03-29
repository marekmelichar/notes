# Notes Mobile App (Flutter)

Mobile companion app for notes.nettio.eu.

## Prerequisites

- Flutter SDK >= 3.24.0
- Dart SDK >= 3.5.0
- Android Studio / Xcode (for platform builds)

## Getting Started

```bash
# Install dependencies
flutter pub get

# Generate JSON serialization code
dart run build_runner build --delete-conflicting-outputs

# Run on connected device / emulator
flutter run

# Run in production mode
flutter run --dart-define=PROD=true
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── config/
│   └── app_config.dart       # API & Keycloak configuration
├── models/                   # Data models (JSON serializable)
│   ├── note.dart
│   ├── folder.dart
│   └── tag.dart
├── services/                 # API & auth services
│   ├── api_client.dart       # Dio-based REST client
│   ├── auth_service.dart     # Keycloak OAuth via AppAuth
│   └── auth_interceptor.dart # Dio token interceptor
├── providers/                # Riverpod state management
│   ├── app_providers.dart    # Core DI (Dio, ApiClient, Auth)
│   ├── auth_provider.dart    # Auth state
│   ├── notes_provider.dart   # Notes state + filters
│   ├── folders_provider.dart # Folders state
│   └── tags_provider.dart    # Tags state
├── router/
│   └── app_router.dart       # GoRouter navigation
└── screens/                  # UI screens
    ├── login_screen.dart
    ├── notes/
    │   ├── notes_list_screen.dart
    │   ├── note_editor_screen.dart
    │   └── search_screen.dart
    └── settings/
        └── settings_screen.dart
```

## Auth Setup

The app uses Keycloak via `flutter_appauth` (AppAuth PKCE flow).

### Android
Add the redirect URI scheme to `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        manifestPlaceholders += [appAuthRedirectScheme: "eu.nettio.notes"]
    }
}
```

### iOS
Add the redirect URI scheme to `ios/Runner/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>eu.nettio.notes</string>
        </array>
    </dict>
</array>
```

## Keycloak Configuration

Register a new client `notes-mobile` in your Keycloak realm with:
- Client type: Public
- Valid redirect URIs: `eu.nettio.notes://callback`
- PKCE: S256
