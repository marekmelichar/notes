using System.Text.RegularExpressions;
using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EpoznamkyApi.Services;

public class FileStorageSettings
{
    public string UploadDirectory { get; set; } = "/app/uploads";
    public long MaxFileSizeBytes { get; set; } = 104_857_600; // 100 MB
    public string[] AllowedContentTypes { get; set; } =
    [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
        "text/markdown",
        "text/x-markdown",
        "text/plain"
    ];

    public string[] AllowedExtensions { get; set; } =
    [
        // Images
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif",
        // Documents
        ".pdf", ".docx", ".xlsx", ".xls", ".pptx",
        // Archives & text
        ".zip", ".md", ".txt", ".conf"
    ];
}

public partial class FileService(AppDbContext db, IOptions<FileStorageSettings> options, ILogger<FileService> logger)
{
    private readonly FileStorageSettings _settings = options.Value;

    // Matches file IDs embedded in note content. Both images (src="/api/v1/files/{id}")
    // and fileEmbed nodes (url="/api/v1/files/{id}") share the same URL shape.
    [GeneratedRegex(@"/api/v1/files/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})")]
    private static partial Regex FileIdInContentRegex();

    /// <summary>
    /// Extracts all file UUIDs referenced inside a note's content JSON.
    /// </summary>
    public static HashSet<string> ExtractReferencedFileIds(string? content)
    {
        if (string.IsNullOrEmpty(content)) return [];

        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in FileIdInContentRegex().Matches(content))
        {
            ids.Add(match.Groups[1].Value);
        }
        return ids;
    }

    // DB operations

    public async Task<FileUpload> CreateFileUploadAsync(FileUpload fileUpload)
    {
        db.FileUploads.Add(fileUpload);
        await db.SaveChangesAsync();
        logger.LogInformation("File {FileId} uploaded by user {UserId} ({OriginalFilename}, {Size} bytes)",
            fileUpload.Id, fileUpload.UserId, fileUpload.OriginalFilename, fileUpload.Size);
        return fileUpload;
    }

    public async Task<FileUpload?> GetFileUploadAsync(string id) =>
        await db.FileUploads.FirstOrDefaultAsync(f => f.Id == id);

    public async Task<FileUpload?> GetFileUploadForUserAsync(string id, string userId) =>
        await db.FileUploads.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

    public async Task DeleteFileUploadAsync(FileUpload fileUpload)
    {
        db.FileUploads.Remove(fileUpload);
        await db.SaveChangesAsync();
        logger.LogInformation("File {FileId} deleted by user {UserId}", fileUpload.Id, fileUpload.UserId);
    }

    /// <summary>
    /// Removes FileUpload rows for the given IDs (scoped to a user and note) and
    /// returns the stored filenames so the caller can do best-effort disk cleanup.
    /// </summary>
    public async Task<List<string>> DeleteFileUploadsByIdsAsync(IReadOnlyCollection<string> fileIds, string userId, string noteId)
    {
        if (fileIds.Count == 0) return [];

        var files = await db.FileUploads
            .Where(f => fileIds.Contains(f.Id) && f.UserId == userId && f.NoteId == noteId)
            .ToListAsync();

        if (files.Count == 0) return [];

        db.FileUploads.RemoveRange(files);
        await db.SaveChangesAsync();

        foreach (var f in files)
        {
            logger.LogInformation("File {FileId} removed (orphaned from note {NoteId})", f.Id, noteId);
        }

        return files.Select(f => f.StoredFilename).ToList();
    }

    // Disk I/O operations

    public async Task<string> SaveFileAsync(Stream fileStream, string storedFilename)
    {
        Directory.CreateDirectory(_settings.UploadDirectory);

        var filePath = GetSafePath(storedFilename);

        try
        {
            await using var output = File.Create(filePath);
            await fileStream.CopyToAsync(output);
            logger.LogInformation("File saved: {StoredFilename}", storedFilename);
            return filePath;
        }
        catch (IOException ex)
        {
            logger.LogError(ex, "Failed to save file: {StoredFilename}", storedFilename);
            throw;
        }
    }

    public FileStream? GetFileStream(string storedFilename)
    {
        var filePath = GetSafePath(storedFilename);

        try
        {
            if (!File.Exists(filePath)) return null;
            return new FileStream(filePath, FileMode.Open, FileAccess.Read);
        }
        catch (IOException ex)
        {
            logger.LogError(ex, "Failed to read file: {StoredFilename}", storedFilename);
            return null;
        }
    }

    public bool DeleteFile(string storedFilename)
    {
        var filePath = GetSafePath(storedFilename);

        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                logger.LogInformation("File deleted: {StoredFilename}", storedFilename);
            }
            return true;
        }
        catch (IOException ex)
        {
            logger.LogError(ex, "Failed to delete file: {StoredFilename}", storedFilename);
            return false;
        }
    }

    // Validation

    public bool IsAllowedContentType(string contentType)
    {
        return _settings.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
    }

    private static readonly Dictionary<string, string> ExtensionToContentType = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".gif"] = "image/gif",
        [".webp"] = "image/webp",
        [".heic"] = "image/heic",
        [".heif"] = "image/heif",
        [".pdf"] = "application/pdf",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".xls"] = "application/vnd.ms-excel",
        [".pptx"] = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        [".zip"] = "application/zip",
        [".md"] = "text/markdown",
        [".txt"] = "text/plain",
        [".conf"] = "text/plain",
    };

    /// <summary>
    /// Resolve a content type from the file extension. Returns <c>application/octet-stream</c>
    /// when the extension is not recognized.
    /// </summary>
    public string ResolveContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return ExtensionToContentType.TryGetValue(extension, out var ct) ? ct : "application/octet-stream";
    }

    public bool IsAllowedExtension(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return _settings.AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase);
    }

    public bool IsWithinSizeLimit(long size)
    {
        return size <= _settings.MaxFileSizeBytes;
    }

    /// <summary>
    /// Resolve the file path and verify it stays within the upload directory (prevents path traversal).
    /// </summary>
    private string GetSafePath(string storedFilename)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_settings.UploadDirectory, storedFilename));
        var uploadDir = Path.GetFullPath(_settings.UploadDirectory);

        if (!fullPath.StartsWith(uploadDir + Path.DirectorySeparatorChar) && fullPath != uploadDir)
        {
            logger.LogWarning("Path traversal attempt blocked: {Filename}", storedFilename);
            throw new InvalidOperationException("Invalid file path.");
        }

        return fullPath;
    }
}
