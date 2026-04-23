using EpoznamkyApi.Models;

namespace EpoznamkyApi.IntegrationTests.Helpers;

public static class TestDataFactory
{
    public static CreateNoteRequest CreateNoteRequest(
        string title = "Test Note",
        string content = "Test content",
        string? folderId = null,
        List<string>? tags = null,
        bool isPinned = false) => new()
    {
        Title = title,
        Content = content,
        FolderId = folderId,
        Tags = tags ?? [],
        IsPinned = isPinned
    };

    public static UpdateNoteRequest UpdateNoteRequest(
        string? title = null,
        string? content = null,
        string? folderId = null,
        List<string>? tags = null,
        bool? isPinned = null,
        int? order = null,
        long? updatedAt = null) => new()
    {
        Title = title,
        Content = content,
        FolderId = folderId,
        Tags = tags,
        IsPinned = isPinned,
        Order = order,
        UpdatedAt = updatedAt
    };

    public static CreateFolderRequest CreateFolderRequest(
        string name = "Test Folder",
        string? parentId = null,
        string color = "#6366f1") => new()
    {
        Name = name,
        ParentId = parentId,
        Color = color
    };

    public static UpdateFolderRequest UpdateFolderRequest(
        string? name = null,
        string? parentId = null,
        string? color = null,
        int? order = null) => new()
    {
        Name = name,
        ParentId = parentId,
        Color = color,
        Order = order
    };

    public static CreateTagRequest CreateTagRequest(
        string name = "Test Tag",
        string color = "#6366f1") => new()
    {
        Name = name,
        Color = color
    };

    public static UpdateTagRequest UpdateTagRequest(
        string? name = null,
        string? color = null) => new()
    {
        Name = name,
        Color = color
    };
}
