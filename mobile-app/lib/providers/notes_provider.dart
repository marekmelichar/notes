import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/note.dart';
import 'app_providers.dart';

enum NotesSortBy { createdAt, updatedAt, title }

enum NotesSortOrder { asc, desc }

class NotesFilter {
  final String? folderId;
  final List<String> tagIds;
  final bool? isPinned;
  final bool isDeleted;

  const NotesFilter({
    this.folderId,
    this.tagIds = const [],
    this.isPinned,
    this.isDeleted = false,
  });

  NotesFilter copyWith({
    String? folderId,
    List<String>? tagIds,
    bool? isPinned,
    bool? isDeleted,
  }) {
    return NotesFilter(
      folderId: folderId ?? this.folderId,
      tagIds: tagIds ?? this.tagIds,
      isPinned: isPinned ?? this.isPinned,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }
}

final notesFilterProvider = StateProvider<NotesFilter>(
  (ref) => const NotesFilter(),
);

final notesSortByProvider = StateProvider<NotesSortBy>(
  (ref) => NotesSortBy.updatedAt,
);

final notesSortOrderProvider = StateProvider<NotesSortOrder>(
  (ref) => NotesSortOrder.desc,
);

final notesListProvider =
    FutureProvider.autoDispose<PaginatedNotes>((ref) async {
  final api = ref.watch(apiClientProvider);
  final filter = ref.watch(notesFilterProvider);
  final sortBy = ref.watch(notesSortByProvider);
  final sortOrder = ref.watch(notesSortOrderProvider);

  return api.getNotes(
    sortBy: sortBy.name,
    sortOrder: sortOrder.name,
    isDeleted: filter.isDeleted,
    folderId: filter.folderId,
    tagIds: filter.tagIds.isNotEmpty ? filter.tagIds : null,
    isPinned: filter.isPinned,
  );
});

final noteDetailProvider =
    FutureProvider.autoDispose.family<Note, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  return api.getNote(id);
});

final notesSearchProvider =
    FutureProvider.autoDispose.family<List<NoteListItem>, String>(
  (ref, query) async {
    if (query.isEmpty) return [];
    final api = ref.watch(apiClientProvider);
    return api.searchNotes(query);
  },
);
