using System.ComponentModel.DataAnnotations.Schema;

namespace EpoznamkyApi.Models;

public class Note
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public bool IsPinned { get; set; }
    public bool IsDeleted { get; set; }
    public int Order { get; set; }
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long? SyncedAt { get; set; }
    public string UserId { get; set; } = string.Empty;

    // Navigation - not mapped to DB, populated via queries
    [NotMapped]
    public List<string> Tags { get; set; } = [];
    [NotMapped]
    public List<SharedUser> SharedWith { get; set; } = [];
}

// Junction table for Note <-> Tag many-to-many
public class NoteTag
{
    public string NoteId { get; set; } = string.Empty;
    public string TagId { get; set; } = string.Empty;
}

// Table for note sharing
public class NoteShare
{
    public string NoteId { get; set; } = string.Empty;
    public string SharedWithUserId { get; set; } = string.Empty;
    public string SharedWithEmail { get; set; } = string.Empty;
    public string Permission { get; set; } = "view"; // "view" or "edit"
}

// DTO for API responses
public class SharedUser
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Permission { get; set; } = "view";
}

// Request DTOs
public class CreateNoteRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public List<string> Tags { get; set; } = [];
    public bool IsPinned { get; set; }
}

public class UpdateNoteRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? FolderId { get; set; }
    public List<string>? Tags { get; set; }
    public bool? IsPinned { get; set; }
    public int? Order { get; set; }
}

public class ShareNoteRequest
{
    public string Email { get; set; } = string.Empty;
    public string Permission { get; set; } = "view";
}

public class ReorderNotesRequest
{
    public List<NoteOrderItem> Items { get; set; } = [];
}

public class NoteOrderItem
{
    public string Id { get; set; } = string.Empty;
    public int Order { get; set; }
}
