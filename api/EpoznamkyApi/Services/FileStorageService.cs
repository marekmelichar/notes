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
        "image/svg+xml",
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
        ".conf"
    ];
}

public class FileStorageService(IOptions<FileStorageSettings> options)
{
    private readonly FileStorageSettings _settings = options.Value;

    public async Task<string> SaveFileAsync(Stream fileStream, string storedFilename)
    {
        Directory.CreateDirectory(_settings.UploadDirectory);
        var filePath = Path.Combine(_settings.UploadDirectory, storedFilename);
        await using var output = File.Create(filePath);
        await fileStream.CopyToAsync(output);
        return filePath;
    }

    public FileStream? GetFileStream(string storedFilename)
    {
        var filePath = Path.Combine(_settings.UploadDirectory, storedFilename);
        if (!File.Exists(filePath)) return null;
        return new FileStream(filePath, FileMode.Open, FileAccess.Read);
    }

    public void DeleteFile(string storedFilename)
    {
        var filePath = Path.Combine(_settings.UploadDirectory, storedFilename);
        if (File.Exists(filePath)) File.Delete(filePath);
    }

    public bool IsAllowedContentType(string contentType)
    {
        return _settings.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
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
}
