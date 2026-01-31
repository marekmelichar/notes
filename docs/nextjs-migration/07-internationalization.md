# 07 — Internationalization (i18n)

## Setup

The app uses **i18next** with:
- `i18next-http-backend` — loads translations from JSON files
- `i18next-browser-languagedetector` — auto-detects user's language
- `react-i18next` — React integration

**Supported languages:** English (`en`), Czech (`cs`)
**Fallback language:** English (`en`)

Translation files are located at `/public/locales/{lang}/translation.json`.

---

## Complete Translation Keys

### English (`en`)

```json
{
  "Common": {
    "Logo": "Logo",
    "User": "User",
    "Nav": {
      "Home": "Home",
      "Settings": "Settings",
      "Folders": "Folders",
      "Notes": "Notes",
      "Editor": "Editor"
    },
    "Loading": "Loading...",
    "ErrorLoadingData": "Error loading data",
    "Login": "Login",
    "Save": "Save",
    "Saved": "Saved",
    "Saving": "Saving...",
    "Cancel": "Cancel",
    "Submit": "Submit",
    "Add": "Add",
    "Delete": "Delete",
    "Create": "Create",
    "Edit": "Edit",
    "Search": "Search...",
    "SearchNotes": "Search notes...",
    "TypeToSearch": "Type to search",
    "ClearSearch": "Clear",
    "NoResults": "No results found",
    "Navigate": "navigate",
    "Open": "open",
    "Close": "close",
    "Ok": "OK",
    "SessionExpired": "Session expired. Please log in again.",
    "DarkMode": "Dark mode",
    "Logout": "Logout",
    "Version": "Version",
    "Welcome": "Welcome",
    "Untitled": "Untitled",
    "SwitchLanguage": "Switch language",
    "CollapseSidebar": "Collapse sidebar",
    "ExpandSidebar": "Expand sidebar",
    "CollapseNoteList": "Collapse list",
    "ExpandNoteList": "Expand list"
  },
  "Notes": {
    "AllNotes": "All Notes",
    "Favorites": "Favorites",
    "Trash": "Trash",
    "Unfiled": "Unfiled",
    "NewNote": "New",
    "CreateNote": "Create",
    "SelectNote": "Select or create a note",
    "SelectNoteHint": "Notes will appear after selecting from the list",
    "NoNotesYet": "No notes yet",
    "NoNotesHint": "Create your first note",
    "LoadingNotes": "Loading...",
    "Pin": "Pin",
    "Unpin": "Unpin",
    "Pinned": "Pinned",
    "MoveToFolder": "Move to folder",
    "NoFolder": "No folder",
    "DropToRemoveFromFolder": "Drop here to remove from folder",
    "LastSaved": "Saved:",
    "SaveShortcut": "Save (Ctrl+S)",
    "DaysRemaining": "{{days}} days",
    "DeletedToday": "Deleted today",
    "WillBeDeleted": "Will be permanently deleted after 30 days in trash",
    "Recent": "Recent",
    "Restore": "Restore",
    "NoteRestored": "Note restored",
    "SaveError": "Failed to save note",
    "AutoSaveIn": "Auto-save in",
    "Words": "words",
    "Characters": "characters"
  },
  "Folders": {
    "Folders": "Folders",
    "NewFolder": "New folder",
    "AddFolder": "Add",
    "AddSubfolder": "Subfolder",
    "CreateFolder": "New folder",
    "EditFolder": "Edit",
    "FolderName": "Name",
    "CollapseAll": "Collapse",
    "ExpandAll": "Expand",
    "ShowFoldersOnly": "Folders only",
    "ShowTreeWithNotes": "With notes"
  },
  "Tags": {
    "Tags": "Tags",
    "NewTag": "New tag",
    "AddTag": "Add",
    "CreateTag": "New tag",
    "EditTag": "Edit tag",
    "DeleteTag": "Delete tag",
    "TagName": "Name",
    "Color": "Color:",
    "ManageTags": "Manage tags",
    "CreateNew": "Create new tag",
    "NoTagsYet": "No tags yet"
  },
  "Sort": {
    "Sort": "Sort",
    "Modified": "Modified",
    "Created": "Created",
    "Title": "Title"
  },
  "View": {
    "ListView": "List",
    "GridView": "Grid"
  },
  "Colors": {
    "Blue": "Blue",
    "Purple": "Purple",
    "Green": "Green",
    "Orange": "Orange",
    "Pink": "Pink",
    "Teal": "Teal"
  },
  "HomePage": {
    "Description": "Start building your app!"
  },
  "SettingsPage": {
    "Description": "Application settings.",
    "Appearance": "Appearance",
    "PrimaryColor": "Color",
    "CustomColor": "Custom",
    "ResetToDefault": "Default",
    "Layout": "Layout",
    "ShowNoteList": "Show note list"
  },
  "Tabs": {
    "CloseTab": "Close tab",
    "CloseOtherTabs": "Close other tabs",
    "CloseAllTabs": "Close all tabs"
  },
  "Files": {
    "OfflineError": "Cannot upload files without connection",
    "TooLarge": "File is too large (max 100 MB)",
    "UploadError": "File upload failed"
  },
  "Export": {
    "Export": "Export",
    "PDF": "PDF",
    "DOCX": "Word (DOCX)",
    "Markdown": "Markdown",
    "HTML": "HTML",
    "Success": "Note exported successfully",
    "Error": "Note export failed"
  },
  "ErrorPage": {
    "Title": "Something went wrong",
    "Message": "An error occurred. Try reloading the page.",
    "ReloadPage": "Reload",
    "GoHome": "Home"
  }
}
```

### Czech (`cs`)

```json
{
  "Common": {
    "Logo": "Logo",
    "User": "Uživatel",
    "Nav": {
      "Home": "Domů",
      "Settings": "Nastavení",
      "Folders": "Složky",
      "Notes": "Poznámky",
      "Editor": "Editor"
    },
    "Loading": "Načítám...",
    "ErrorLoadingData": "Chyba načítání",
    "Login": "Přihlásit",
    "Save": "Uložit",
    "Saved": "Uloženo",
    "Saving": "Ukládám...",
    "Cancel": "Zrušit",
    "Submit": "Odeslat",
    "Add": "Přidat",
    "Delete": "Smazat",
    "Create": "Vytvořit",
    "Edit": "Upravit",
    "Search": "Hledat...",
    "SearchNotes": "Hledat poznámky...",
    "TypeToSearch": "Zadejte text pro vyhledávání",
    "ClearSearch": "Smazat",
    "NoResults": "Nic nenalezeno",
    "Navigate": "navigace",
    "Open": "otevřít",
    "Close": "zavřít",
    "Ok": "OK",
    "SessionExpired": "Relace vypršela. Přihlaste se znovu.",
    "DarkMode": "Tmavý režim",
    "Logout": "Odhlásit",
    "Version": "Verze",
    "Welcome": "Vítejte",
    "Untitled": "Bez názvu",
    "SwitchLanguage": "Změnit jazyk",
    "CollapseSidebar": "Sbalit panel",
    "ExpandSidebar": "Rozbalit panel",
    "CollapseNoteList": "Sbalit seznam",
    "ExpandNoteList": "Rozbalit seznam"
  },
  "Notes": {
    "AllNotes": "Všechny",
    "Favorites": "Oblíbené",
    "Trash": "Koš",
    "Unfiled": "Nezařazené",
    "NewNote": "Nová",
    "CreateNote": "Vytvořit",
    "SelectNote": "Vyberte nebo vytvořte poznámku",
    "SelectNoteHint": "Poznámky se zobrazí po výběru ze seznamu",
    "NoNotesYet": "Žádné poznámky",
    "NoNotesHint": "Vytvořte první poznámku",
    "LoadingNotes": "Načítám...",
    "Pin": "Připnout",
    "Unpin": "Odepnout",
    "Pinned": "Připnuto",
    "MoveToFolder": "Do složky",
    "NoFolder": "Bez složky",
    "DropToRemoveFromFolder": "Přetáhněte sem pro odebrání",
    "LastSaved": "Uloženo:",
    "SaveShortcut": "Uložit (Ctrl+S)",
    "DaysRemaining": "{{days}} dní",
    "DeletedToday": "Smazáno dnes",
    "WillBeDeleted": "Bude trvale smazáno po 30 dnech v koši",
    "Recent": "Nedávné",
    "Restore": "Obnovit",
    "NoteRestored": "Poznámka obnovena",
    "SaveError": "Nepodařilo se uložit poznámku",
    "AutoSaveIn": "Automatické uložení za",
    "Words": "slov",
    "Characters": "znaků"
  },
  "Folders": {
    "Folders": "Složky",
    "NewFolder": "Nová složka",
    "AddFolder": "Přidat",
    "AddSubfolder": "Podsložka",
    "CreateFolder": "Nová složka",
    "EditFolder": "Upravit",
    "FolderName": "Název",
    "CollapseAll": "Sbalit",
    "ExpandAll": "Rozbalit",
    "ShowFoldersOnly": "Jen složky",
    "ShowTreeWithNotes": "S poznámkami"
  },
  "Tags": {
    "Tags": "Štítky",
    "NewTag": "Nový štítek",
    "AddTag": "Přidat",
    "CreateTag": "Nový štítek",
    "EditTag": "Upravit štítek",
    "DeleteTag": "Smazat štítek",
    "TagName": "Název",
    "Color": "Barva:",
    "ManageTags": "Spravovat štítky",
    "CreateNew": "Vytvořit nový štítek",
    "NoTagsYet": "Zatím žádné štítky"
  },
  "Sort": {
    "Sort": "Řadit",
    "Modified": "Upraveno",
    "Created": "Vytvořeno",
    "Title": "Název"
  },
  "View": {
    "ListView": "Seznam",
    "GridView": "Mřížka"
  },
  "Colors": {
    "Blue": "Modrá",
    "Purple": "Fialová",
    "Green": "Zelená",
    "Orange": "Oranžová",
    "Pink": "Růžová",
    "Teal": "Tyrkysová"
  },
  "HomePage": {
    "Description": "Začněte budovat svou aplikaci!"
  },
  "SettingsPage": {
    "Description": "Nastavení aplikace.",
    "Appearance": "Vzhled",
    "PrimaryColor": "Barva",
    "CustomColor": "Vlastní",
    "ResetToDefault": "Výchozí",
    "Layout": "Rozvržení",
    "ShowNoteList": "Zobrazit seznam poznámek"
  },
  "Tabs": {
    "CloseTab": "Zavřít záložku",
    "CloseOtherTabs": "Zavřít ostatní záložky",
    "CloseAllTabs": "Zavřít všechny záložky"
  },
  "Files": {
    "OfflineError": "Nelze nahrát soubory bez připojení",
    "TooLarge": "Soubor je příliš velký (max 100 MB)",
    "UploadError": "Nahrání souboru se nezdařilo"
  },
  "Export": {
    "Export": "Exportovat",
    "PDF": "PDF",
    "DOCX": "Word (DOCX)",
    "Markdown": "Markdown",
    "HTML": "HTML",
    "Success": "Poznámka úspěšně exportována",
    "Error": "Export poznámky se nezdařil"
  },
  "ErrorPage": {
    "Title": "Něco se pokazilo",
    "Message": "Došlo k chybě. Zkuste obnovit stránku.",
    "ReloadPage": "Obnovit",
    "GoHome": "Domů"
  }
}
```

---

## Usage Pattern

Translation keys are used with the `t()` function:

```typescript
// Example usage
t('Common.Save')           // → "Save" / "Uložit"
t('Notes.AllNotes')        // → "All Notes" / "Všechny"
t('Notes.DaysRemaining', { days: 15 })  // → "15 days" / "15 dní"
```

## Language Detection Order

1. Query parameter (`?lng=cs`)
2. localStorage
3. Browser navigator language
4. Fallback: `en`
