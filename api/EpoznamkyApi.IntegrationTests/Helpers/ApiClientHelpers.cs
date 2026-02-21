using System.Net.Http.Json;
using EpoznamkyApi.Models;

namespace EpoznamkyApi.IntegrationTests.Helpers;

public static class ApiClientHelpers
{
    private const string ApiBase = "/api/v1";

    // Notes
    public static Task<HttpResponseMessage> GetNotes(this HttpClient client, int limit = 100, int offset = 0)
        => client.GetAsync($"{ApiBase}/notes?limit={limit}&offset={offset}");

    public static Task<HttpResponseMessage> GetNote(this HttpClient client, string id)
        => client.GetAsync($"{ApiBase}/notes/{id}");

    public static Task<HttpResponseMessage> CreateNote(this HttpClient client, CreateNoteRequest request)
        => client.PostAsJsonAsync($"{ApiBase}/notes", request);

    public static Task<HttpResponseMessage> UpdateNote(this HttpClient client, string id, UpdateNoteRequest request)
        => client.PutAsJsonAsync($"{ApiBase}/notes/{id}", request);

    public static Task<HttpResponseMessage> DeleteNote(this HttpClient client, string id)
        => client.DeleteAsync($"{ApiBase}/notes/{id}");

    public static Task<HttpResponseMessage> DeleteNotePermanent(this HttpClient client, string id)
        => client.DeleteAsync($"{ApiBase}/notes/{id}/permanent");

    public static Task<HttpResponseMessage> RestoreNote(this HttpClient client, string id)
        => client.PostAsync($"{ApiBase}/notes/{id}/restore", null);

    public static Task<HttpResponseMessage> SearchNotes(this HttpClient client, string query)
        => client.GetAsync($"{ApiBase}/notes/search?q={Uri.EscapeDataString(query)}");

    public static Task<HttpResponseMessage> ReorderNotes(this HttpClient client, ReorderNotesRequest request)
        => client.PostAsJsonAsync($"{ApiBase}/notes/reorder", request);

    public static Task<HttpResponseMessage> ShareNote(this HttpClient client, string id, ShareNoteRequest request)
        => client.PostAsJsonAsync($"{ApiBase}/notes/{id}/share", request);

    public static Task<HttpResponseMessage> RemoveShare(this HttpClient client, string noteId, string userId)
        => client.DeleteAsync($"{ApiBase}/notes/{noteId}/share/{userId}");

    // Folders
    public static Task<HttpResponseMessage> GetFolders(this HttpClient client)
        => client.GetAsync($"{ApiBase}/folders");

    public static Task<HttpResponseMessage> GetFolder(this HttpClient client, string id)
        => client.GetAsync($"{ApiBase}/folders/{id}");

    public static Task<HttpResponseMessage> CreateFolder(this HttpClient client, CreateFolderRequest request)
        => client.PostAsJsonAsync($"{ApiBase}/folders", request);

    public static Task<HttpResponseMessage> UpdateFolder(this HttpClient client, string id, UpdateFolderRequest request)
        => client.PutAsJsonAsync($"{ApiBase}/folders/{id}", request);

    public static Task<HttpResponseMessage> DeleteFolder(this HttpClient client, string id)
        => client.DeleteAsync($"{ApiBase}/folders/{id}");

    public static Task<HttpResponseMessage> ReorderFolders(this HttpClient client, ReorderFoldersRequest request)
        => client.PostAsJsonAsync($"{ApiBase}/folders/reorder", request);

    // Tags
    public static Task<HttpResponseMessage> GetTags(this HttpClient client)
        => client.GetAsync($"{ApiBase}/tags");

    public static Task<HttpResponseMessage> GetTag(this HttpClient client, string id)
        => client.GetAsync($"{ApiBase}/tags/{id}");

    public static Task<HttpResponseMessage> CreateTag(this HttpClient client, CreateTagRequest request)
        => client.PostAsJsonAsync($"{ApiBase}/tags", request);

    public static Task<HttpResponseMessage> UpdateTag(this HttpClient client, string id, UpdateTagRequest request)
        => client.PutAsJsonAsync($"{ApiBase}/tags/{id}", request);

    public static Task<HttpResponseMessage> DeleteTag(this HttpClient client, string id)
        => client.DeleteAsync($"{ApiBase}/tags/{id}");

    // Files
    public static async Task<HttpResponseMessage> UploadFile(this HttpClient client, string fileName, byte[] content, string contentType, string? noteId = null)
    {
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        form.Add(fileContent, "file", fileName);

        if (noteId != null)
            form.Add(new StringContent(noteId), "noteId");

        return await client.PostAsync($"{ApiBase}/files", form);
    }

    public static Task<HttpResponseMessage> GetFile(this HttpClient client, string id)
        => client.GetAsync($"{ApiBase}/files/{id}");

    public static Task<HttpResponseMessage> DeleteFile(this HttpClient client, string id)
        => client.DeleteAsync($"{ApiBase}/files/{id}");

    // Users
    public static Task<HttpResponseMessage> GetCurrentUser(this HttpClient client)
        => client.GetAsync($"{ApiBase}/users/me");

    public static Task<HttpResponseMessage> GetUser(this HttpClient client, string id)
        => client.GetAsync($"{ApiBase}/users/{id}");

    public static Task<HttpResponseMessage> SearchUsers(this HttpClient client, string email)
        => client.GetAsync($"{ApiBase}/users/search?email={Uri.EscapeDataString(email)}");

    // Generic helpers
    public static async Task<T> ReadAs<T>(this HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<T>();
        return result ?? throw new InvalidOperationException($"Failed to deserialize response as {typeof(T).Name}");
    }
}
