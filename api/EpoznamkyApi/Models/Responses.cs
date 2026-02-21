namespace EpoznamkyApi.Models;

public class NoteResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public List<string> Tags { get; set; } = [];
    public bool IsPinned { get; set; }
    public bool IsDeleted { get; set; }
    public long? DeletedAt { get; set; }
    public List<SharedUser> SharedWith { get; set; } = [];
    public int Order { get; set; }
    public long CreatedAt { get; set; }
    public long UpdatedAt { get; set; }
    public long? SyncedAt { get; set; }
}

public class FolderResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string Color { get; set; } = string.Empty;
    public int Order { get; set; }
    public long CreatedAt { get; set; }
    public long UpdatedAt { get; set; }
}

public class TagResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}
