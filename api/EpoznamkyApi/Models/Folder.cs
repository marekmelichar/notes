namespace EpoznamkyApi.Models;

public class Folder
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string Color { get; set; } = "#6366f1";
    public int Order { get; set; }
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public string UserId { get; set; } = string.Empty;
}

public class CreateFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string Color { get; set; } = "#6366f1";
}

public class UpdateFolderRequest
{
    public string? Name { get; set; }
    public string? ParentId { get; set; }
    public string? Color { get; set; }
    public int? Order { get; set; }
}

public class ReorderFoldersRequest
{
    public List<FolderOrderItem> Items { get; set; } = [];
}

public class FolderOrderItem
{
    public string Id { get; set; } = string.Empty;
    public int Order { get; set; }
}
