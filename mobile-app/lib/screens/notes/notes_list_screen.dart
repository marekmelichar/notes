import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../models/note.dart';
import '../../providers/notes_provider.dart';
import '../../providers/folders_provider.dart';
import '../../providers/tags_provider.dart';

class NotesListScreen extends ConsumerWidget {
  const NotesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(notesListProvider);
    final foldersAsync = ref.watch(foldersProvider);
    final tagsAsync = ref.watch(tagsProvider);
    final filter = ref.watch(notesFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push('/search'),
          ),
          PopupMenuButton<NotesSortBy>(
            icon: const Icon(Icons.sort),
            onSelected: (sortBy) {
              ref.read(notesSortByProvider.notifier).state = sortBy;
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: NotesSortBy.updatedAt,
                child: Text('Sort by updated'),
              ),
              const PopupMenuItem(
                value: NotesSortBy.createdAt,
                child: Text('Sort by created'),
              ),
              const PopupMenuItem(
                value: NotesSortBy.title,
                child: Text('Sort by title'),
              ),
            ],
          ),
        ],
      ),
      drawer: Drawer(
        child: _buildDrawer(context, ref, foldersAsync, tagsAsync, filter),
      ),
      body: notesAsync.when(
        data: (paginated) => _buildNotesList(context, paginated),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 16),
              Text('Failed to load notes\n$error'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref.invalidate(notesListProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/notes/new'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildDrawer(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<dynamic>> foldersAsync,
    AsyncValue<List<dynamic>> tagsAsync,
    NotesFilter filter,
  ) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        DrawerHeader(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Icon(
                Icons.note_alt_outlined,
                size: 40,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
              const SizedBox(height: 8),
              Text(
                'Notes',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
              ),
            ],
          ),
        ),
        ListTile(
          leading: const Icon(Icons.notes),
          title: const Text('All Notes'),
          selected: filter.folderId == null && !filter.isDeleted,
          onTap: () {
            ref.read(notesFilterProvider.notifier).state = const NotesFilter();
            Navigator.pop(context);
          },
        ),
        ListTile(
          leading: const Icon(Icons.push_pin_outlined),
          title: const Text('Pinned'),
          onTap: () {
            ref.read(notesFilterProvider.notifier).state =
                const NotesFilter(isPinned: true);
            Navigator.pop(context);
          },
        ),
        ListTile(
          leading: const Icon(Icons.delete_outline),
          title: const Text('Trash'),
          onTap: () {
            ref.read(notesFilterProvider.notifier).state =
                const NotesFilter(isDeleted: true);
            Navigator.pop(context);
          },
        ),
        const Divider(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            'Folders',
            style: Theme.of(context).textTheme.labelLarge,
          ),
        ),
        foldersAsync.when(
          data: (folders) => Column(
            children: folders
                .map<Widget>((folder) => ListTile(
                      leading: Icon(
                        Icons.folder_outlined,
                        color: _parseColor(folder.color),
                      ),
                      title: Text(folder.name),
                      selected: filter.folderId == folder.id,
                      onTap: () {
                        ref.read(notesFilterProvider.notifier).state =
                            NotesFilter(folderId: folder.id);
                        Navigator.pop(context);
                      },
                    ))
                .toList(),
          ),
          loading: () =>
              const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
          error: (_, __) => const SizedBox.shrink(),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.settings_outlined),
          title: const Text('Settings'),
          onTap: () {
            Navigator.pop(context);
            context.push('/settings');
          },
        ),
      ],
    );
  }

  Widget _buildNotesList(BuildContext context, PaginatedNotes paginated) {
    if (paginated.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.note_alt_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No notes yet',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: paginated.items.length,
      itemBuilder: (context, index) {
        final note = paginated.items[index];
        return _NoteListTile(note: note);
      },
    );
  }

  Color? _parseColor(String hex) {
    try {
      final colorStr = hex.replaceFirst('#', '');
      return Color(int.parse('FF$colorStr', radix: 16));
    } catch (_) {
      return null;
    }
  }
}

class _NoteListTile extends StatelessWidget {
  final NoteListItem note;

  const _NoteListTile({required this.note});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: note.isPinned
          ? Icon(Icons.push_pin, color: Theme.of(context).colorScheme.primary)
          : null,
      title: Text(
        note.title.isEmpty ? 'Untitled' : note.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        timeago.format(note.updatedAtDate),
        style: Theme.of(context).textTheme.bodySmall,
      ),
      onTap: () => context.push('/notes/${note.id}'),
    );
  }
}
