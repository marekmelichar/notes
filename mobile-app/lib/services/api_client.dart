import 'package:dio/dio.dart';
import '../models/note.dart';
import '../models/folder.dart';
import '../models/tag.dart';

class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  // --- Notes ---

  Future<PaginatedNotes> getNotes({
    int limit = 200,
    int offset = 0,
    String sortBy = 'updatedAt',
    String sortOrder = 'desc',
    bool isDeleted = false,
    String? folderId,
    List<String>? tagIds,
    bool? isPinned,
  }) async {
    final params = <String, dynamic>{
      'limit': limit,
      'offset': offset,
      'sortBy': sortBy,
      'sortOrder': sortOrder,
      'isDeleted': isDeleted,
    };
    if (folderId != null) params['folderId'] = folderId;
    if (tagIds != null && tagIds.isNotEmpty) {
      params['tagIds'] = tagIds.join(',');
    }
    if (isPinned != null) params['isPinned'] = isPinned;

    final response = await _dio.get(
      '/api/v1/notes/list',
      queryParameters: params,
    );
    return PaginatedNotes.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Note> getNote(String id) async {
    final response = await _dio.get('/api/v1/notes/$id');
    return Note.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Note> createNote(CreateNoteRequest request) async {
    final response = await _dio.post(
      '/api/v1/notes',
      data: request.toJson(),
    );
    return Note.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Note> updateNote(String id, Map<String, dynamic> updates) async {
    final response = await _dio.put('/api/v1/notes/$id', data: updates);
    return Note.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteNote(String id) async {
    await _dio.delete('/api/v1/notes/$id');
  }

  Future<void> permanentlyDeleteNote(String id) async {
    await _dio.delete('/api/v1/notes/$id/permanent');
  }

  Future<Note> restoreNote(String id) async {
    final response = await _dio.post('/api/v1/notes/$id/restore');
    return Note.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<NoteListItem>> searchNotes(String query) async {
    final response = await _dio.get(
      '/api/v1/notes/list/search',
      queryParameters: {'q': query},
    );
    return (response.data as List<dynamic>)
        .map((e) => NoteListItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> reorderNotes(List<ReorderItem> items) async {
    await _dio.post(
      '/api/v1/notes/reorder',
      data: {'items': items.map((e) => e.toJson()).toList()},
    );
  }

  // --- Folders ---

  Future<List<Folder>> getFolders() async {
    final response = await _dio.get('/api/v1/folders');
    return (response.data as List<dynamic>)
        .map((e) => Folder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Folder> getFolder(String id) async {
    final response = await _dio.get('/api/v1/folders/$id');
    return Folder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Folder> createFolder(CreateFolderRequest request) async {
    final response = await _dio.post(
      '/api/v1/folders',
      data: request.toJson(),
    );
    return Folder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Folder> updateFolder(String id, Map<String, dynamic> updates) async {
    final response = await _dio.put('/api/v1/folders/$id', data: updates);
    return Folder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteFolder(String id) async {
    await _dio.delete('/api/v1/folders/$id');
  }

  Future<List<Folder>> reorderFolders(List<ReorderItem> items) async {
    final response = await _dio.post(
      '/api/v1/folders/reorder',
      data: {'items': items.map((e) => e.toJson()).toList()},
    );
    return (response.data as List<dynamic>)
        .map((e) => Folder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // --- Tags ---

  Future<List<Tag>> getTags() async {
    final response = await _dio.get('/api/v1/tags');
    return (response.data as List<dynamic>)
        .map((e) => Tag.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Tag> createTag(CreateTagRequest request) async {
    final response = await _dio.post(
      '/api/v1/tags',
      data: request.toJson(),
    );
    return Tag.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Tag> updateTag(String id, Map<String, dynamic> updates) async {
    final response = await _dio.put('/api/v1/tags/$id', data: updates);
    return Tag.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteTag(String id) async {
    await _dio.delete('/api/v1/tags/$id');
  }
}
