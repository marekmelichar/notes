using System.ComponentModel.DataAnnotations;

namespace EpoznamkyApi.Models;

public class Tag
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = Constants.DefaultColor;
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public string UserId { get; set; } = string.Empty;
}

public class CreateTagRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^#[0-9a-fA-F]{6}$")]
    public string Color { get; set; } = Constants.DefaultColor;
}

public class UpdateTagRequest
{
    [StringLength(50, MinimumLength = 1)]
    public string? Name { get; set; }

    [RegularExpression(@"^#[0-9a-fA-F]{6}$")]
    public string? Color { get; set; }
}
