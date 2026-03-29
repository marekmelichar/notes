import 'package:json_annotation/json_annotation.dart';

part 'note.g.dart';

@JsonSerializable()
class NoteListItem {
  final String id;
  final String title;
  final String? folderId;
  final List<String> tags;
  final bool isPinned;
  final bool isDeleted;
  final int? deletedAt;
  final int order;
  final int createdAt;
  final int updatedAt;

  const NoteListItem({
    required this.id,
    required this.title,
    this.folderId,
    required this.tags,
    required this.isPinned,
    required this.isDeleted,
    this.deletedAt,
    required this.order,
    required this.createdAt,
    required this.updatedAt,
  });

  factory NoteListItem.fromJson(Map<String, dynamic> json) =>
      _$NoteListItemFromJson(json);

  Map<String, dynamic> toJson() => _$NoteListItemToJson(this);

  DateTime get createdAtDate =>
      DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);

  DateTime get updatedAtDate =>
      DateTime.fromMillisecondsSinceEpoch(updatedAt * 1000);
}

@JsonSerializable()
class Note extends NoteListItem {
  final String content;
  final int? syncedAt;

  const Note({
    required super.id,
    required super.title,
    super.folderId,
    required super.tags,
    required super.isPinned,
    required super.isDeleted,
    super.deletedAt,
    required super.order,
    required super.createdAt,
    required super.updatedAt,
    required this.content,
    this.syncedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) => _$NoteFromJson(json);

  @override
  Map<String, dynamic> toJson() => _$NoteToJson(this);

  Note copyWith({
    String? title,
    String? content,
    String? folderId,
    List<String>? tags,
    bool? isPinned,
  }) {
    return Note(
      id: id,
      title: title ?? this.title,
      content: content ?? this.content,
      folderId: folderId ?? this.folderId,
      tags: tags ?? this.tags,
      isPinned: isPinned ?? this.isPinned,
      isDeleted: isDeleted,
      deletedAt: deletedAt,
      order: order,
      createdAt: createdAt,
      updatedAt: updatedAt,
      syncedAt: syncedAt,
    );
  }
}

@JsonSerializable()
class PaginatedNotes {
  final List<NoteListItem> items;
  final int totalCount;

  const PaginatedNotes({
    required this.items,
    required this.totalCount,
  });

  factory PaginatedNotes.fromJson(Map<String, dynamic> json) =>
      _$PaginatedNotesFromJson(json);

  Map<String, dynamic> toJson() => _$PaginatedNotesToJson(this);
}

@JsonSerializable()
class CreateNoteRequest {
  final String title;
  final String content;
  final String? folderId;
  final List<String> tags;
  final bool isPinned;

  const CreateNoteRequest({
    required this.title,
    required this.content,
    this.folderId,
    this.tags = const [],
    this.isPinned = false,
  });

  factory CreateNoteRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateNoteRequestFromJson(json);

  Map<String, dynamic> toJson() => _$CreateNoteRequestToJson(this);
}

@JsonSerializable()
class ReorderItem {
  final String id;
  final int order;

  const ReorderItem({required this.id, required this.order});

  factory ReorderItem.fromJson(Map<String, dynamic> json) =>
      _$ReorderItemFromJson(json);

  Map<String, dynamic> toJson() => _$ReorderItemToJson(this);
}
