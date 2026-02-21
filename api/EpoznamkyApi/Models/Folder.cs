using System.ComponentModel.DataAnnotations;

namespace EpoznamkyApi.Models;

public class Folder
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string Color { get; set; } = Constants.DefaultColor;
    public int Order { get; set; }
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public string UserId { get; set; } = string.Empty;
}

public class CreateFolderRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(36)]
    public string? ParentId { get; set; }

    [Required]
    [RegularExpression(@"^#[0-9a-fA-F]{6}$")]
    public string Color { get; set; } = Constants.DefaultColor;
}

public class UpdateFolderRequest
{
    [StringLength(100, MinimumLength = 1)]
    public string? Name { get; set; }

    [StringLength(36)]
    public string? ParentId { get; set; }

    [RegularExpression(@"^#[0-9a-fA-F]{6}$")]
    public string? Color { get; set; }

    [Range(0, int.MaxValue)]
    public int? Order { get; set; }
}

public class ReorderFoldersRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public List<FolderOrderItem> Items { get; set; } = [];
}

public class FolderOrderItem
{
    [Required]
    [StringLength(36, MinimumLength = 1)]
    public string Id { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int Order { get; set; }
}
