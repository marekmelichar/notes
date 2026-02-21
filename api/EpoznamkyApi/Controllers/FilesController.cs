using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class FilesController(FileService fileService, ILogger<FilesController> logger) : BaseController
{
    [HttpPost]
    [RequestSizeLimit(104_857_600)]
    [EnableRateLimiting("file-upload")]
    public async Task<ActionResult<FileUploadResponse>> Upload(
        IFormFile file,
        [FromForm] string? noteId)
    {
        if (file.Length == 0)
            return Problem(detail: "File is empty.", statusCode: 400);

        if (!fileService.IsWithinSizeLimit(file.Length))
            return Problem(detail: "File exceeds maximum allowed size.", statusCode: 400);

        if (!fileService.IsAllowedExtension(file.FileName))
            return Problem(detail: "File type not allowed.", statusCode: 400);

        if (!fileService.IsAllowedContentType(file.ContentType))
            return Problem(detail: "File content type not allowed.", statusCode: 400);

        var fileUpload = new FileUpload
        {
            OriginalFilename = file.FileName,
            StoredFilename = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}",
            ContentType = file.ContentType,
            Size = file.Length,
            UserId = UserId,
            NoteId = noteId
        };

        // Save file to disk first
        await using var stream = file.OpenReadStream();
        await fileService.SaveFileAsync(stream, fileUpload.StoredFilename);

        // Then persist to DB — if this fails, clean up the orphaned file
        try
        {
            await fileService.CreateFileUploadAsync(fileUpload);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DB save failed after file upload, cleaning up orphaned file {StoredFilename}", fileUpload.StoredFilename);
            fileService.DeleteFile(fileUpload.StoredFilename);
            throw;
        }

        var url = $"/api/v1/files/{fileUpload.Id}";

        return CreatedAtAction(nameof(GetFile), new { id = fileUpload.Id }, new FileUploadResponse
        {
            Id = fileUpload.Id,
            Url = url,
            OriginalFilename = fileUpload.OriginalFilename,
            ContentType = fileUpload.ContentType,
            Size = fileUpload.Size
        });
    }

    // AllowAnonymous: images embedded in notes render via <img src="..."> which cannot
    // send Bearer tokens. File IDs are UUID v4 (unguessable) — no enumeration risk.
    // Upload and delete remain fully authenticated.
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult> GetFile(string id)
    {
        var fileUpload = await fileService.GetFileUploadAsync(id);
        if (fileUpload == null) return NotFound();

        var stream = fileService.GetFileStream(fileUpload.StoredFilename);
        if (stream == null) return NotFound();

        return File(stream, fileUpload.ContentType, fileUpload.OriginalFilename);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var fileUpload = await fileService.GetFileUploadForUserAsync(id, UserId);
        if (fileUpload == null) return NotFound();

        // Remove from DB first, then delete file
        await fileService.DeleteFileUploadAsync(fileUpload);

        if (!fileService.DeleteFile(fileUpload.StoredFilename))
        {
            logger.LogWarning("File {StoredFilename} could not be deleted from disk after DB removal (file {FileId})", fileUpload.StoredFilename, id);
        }

        return NoContent();
    }
}
