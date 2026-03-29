import 'package:json_annotation/json_annotation.dart';

part 'folder.g.dart';

@JsonSerializable()
class Folder {
  final String id;
  final String name;
  final String? parentId;
  final String color;
  final int order;
  final int createdAt;
  final int updatedAt;

  const Folder({
    required this.id,
    required this.name,
    this.parentId,
    required this.color,
    required this.order,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Folder.fromJson(Map<String, dynamic> json) =>
      _$FolderFromJson(json);

  Map<String, dynamic> toJson() => _$FolderToJson(this);

  Folder copyWith({
    String? name,
    String? parentId,
    String? color,
  }) {
    return Folder(
      id: id,
      name: name ?? this.name,
      parentId: parentId ?? this.parentId,
      color: color ?? this.color,
      order: order,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

@JsonSerializable()
class CreateFolderRequest {
  final String name;
  final String? parentId;
  final String color;

  const CreateFolderRequest({
    required this.name,
    this.parentId,
    required this.color,
  });

  factory CreateFolderRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateFolderRequestFromJson(json);

  Map<String, dynamic> toJson() => _$CreateFolderRequestToJson(this);
}
