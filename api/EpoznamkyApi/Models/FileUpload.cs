namespace EpoznamkyApi.Models;

public class FileUpload
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OriginalFilename { get; set; } = string.Empty;
    public string StoredFilename { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? NoteId { get; set; }
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

public class FileUploadResponse
{
    public string Id { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
}
