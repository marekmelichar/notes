import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tag.dart';
import 'app_providers.dart';

final tagsProvider = FutureProvider.autoDispose<List<Tag>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getTags();
});
