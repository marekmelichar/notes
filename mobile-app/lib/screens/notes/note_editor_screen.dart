import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_quill/flutter_quill.dart';
import '../../models/note.dart';
import '../../providers/app_providers.dart';
import '../../providers/notes_provider.dart';

class NoteEditorScreen extends ConsumerStatefulWidget {
  final String? noteId;

  const NoteEditorScreen({super.key, this.noteId});

  @override
  ConsumerState<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends ConsumerState<NoteEditorScreen> {
  late final TextEditingController _titleController;
  late final QuillController _quillController;
  bool _isNewNote = false;
  bool _isSaving = false;
  String? _createdNoteId;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _quillController = QuillController.basic();
    _isNewNote = widget.noteId == null;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _quillController.dispose();
    super.dispose();
  }

  String get _effectiveNoteId => _createdNoteId ?? widget.noteId!;

  Future<void> _saveNote() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    try {
      final api = ref.read(apiClientProvider);
      final title = _titleController.text;
      final content = _quillController.document.toPlainText();

      if (_isNewNote && _createdNoteId == null) {
        final note = await api.createNote(CreateNoteRequest(
          title: title,
          content: content,
        ));
        _createdNoteId = note.id;
        _isNewNote = false;
      } else {
        await api.updateNote(_effectiveNoteId, {
          'title': title,
          'content': content,
        });
      }

      ref.invalidate(notesListProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Note saved'),
            duration: Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _deleteNote() async {
    if (_isNewNote && _createdNoteId == null) {
      Navigator.pop(context);
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete note?'),
        content: const Text('This note will be moved to trash.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final api = ref.read(apiClientProvider);
        await api.deleteNote(_effectiveNoteId);
        ref.invalidate(notesListProvider);
        if (mounted) Navigator.pop(context);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isNewNote ? 'New Note' : 'Edit Note'),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.save),
              onPressed: _saveNote,
            ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'delete') _deleteNote();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  leading: Icon(Icons.delete_outline),
                  title: Text('Delete'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: _isNewNote
          ? _buildEditor()
          : _buildWithExistingNote(),
    );
  }

  Widget _buildWithExistingNote() {
    final noteAsync = ref.watch(noteDetailProvider(widget.noteId!));

    return noteAsync.when(
      data: (note) {
        // Populate controllers only once
        if (_titleController.text.isEmpty && note.title.isNotEmpty) {
          _titleController.text = note.title;
        }
        return _buildEditor();
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
    );
  }

  Widget _buildEditor() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              hintText: 'Title',
              border: InputBorder.none,
            ),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        ),
        const Divider(indent: 16, endIndent: 16),
        QuillSimpleToolbar(
          controller: _quillController,
          configurations: const QuillSimpleToolbarConfigurations(
            showAlignmentButtons: false,
            showBackgroundColorButton: false,
            showClearFormat: false,
            showColorButton: false,
            showFontFamily: false,
            showFontSize: false,
            showIndent: false,
            showSearchButton: false,
            showSubscript: false,
            showSuperscript: false,
            multiRowsDisplay: false,
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: QuillEditor.basic(
              controller: _quillController,
              configurations: const QuillEditorConfigurations(
                placeholder: 'Start writing...',
                padding: EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
