import 'package:json_annotation/json_annotation.dart';

part 'tag.g.dart';

@JsonSerializable()
class Tag {
  final String id;
  final String name;
  final String color;

  const Tag({
    required this.id,
    required this.name,
    required this.color,
  });

  factory Tag.fromJson(Map<String, dynamic> json) => _$TagFromJson(json);

  Map<String, dynamic> toJson() => _$TagToJson(this);

  Tag copyWith({
    String? name,
    String? color,
  }) {
    return Tag(
      id: id,
      name: name ?? this.name,
      color: color ?? this.color,
    );
  }
}

@JsonSerializable()
class CreateTagRequest {
  final String name;
  final String color;

  const CreateTagRequest({
    required this.name,
    required this.color,
  });

  factory CreateTagRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateTagRequestFromJson(json);

  Map<String, dynamic> toJson() => _$CreateTagRequestToJson(this);
}
