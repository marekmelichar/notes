import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/folder.dart';
import 'app_providers.dart';

final foldersProvider = FutureProvider.autoDispose<List<Folder>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getFolders();
});
