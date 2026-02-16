using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class FilesController(AppDbContext db, FileStorageService storageService, ILogger<FilesController> logger) : BaseController
{
    [HttpPost]
    [RequestSizeLimit(104_857_600)]
    [EnableRateLimiting("file-upload")]
    public async Task<ActionResult<FileUploadResponse>> Upload(
        IFormFile file,
        [FromForm] string? noteId)
    {
        if (file.Length == 0)
            return BadRequest("File is empty.");

        if (!storageService.IsWithinSizeLimit(file.Length))
            return BadRequest("File exceeds maximum allowed size.");

        if (!storageService.IsAllowedContentType(file.ContentType) && !storageService.IsAllowedExtension(file.FileName))
            return BadRequest("File type not allowed.");

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
        await storageService.SaveFileAsync(stream, fileUpload.StoredFilename);

        // Then persist to DB — if this fails, clean up the orphaned file
        try
        {
            db.FileUploads.Add(fileUpload);
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DB save failed after file upload, cleaning up orphaned file {StoredFilename}", fileUpload.StoredFilename);
            storageService.DeleteFile(fileUpload.StoredFilename);
            throw;
        }

        var url = $"/api/v1/files/{fileUpload.Id}";
        logger.LogInformation("File {FileId} uploaded by user {UserId} ({OriginalFilename}, {Size} bytes)", fileUpload.Id, UserId, fileUpload.OriginalFilename, fileUpload.Size);

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
        var fileUpload = await db.FileUploads.FirstOrDefaultAsync(f => f.Id == id);
        if (fileUpload == null) return NotFound();

        var stream = storageService.GetFileStream(fileUpload.StoredFilename);
        if (stream == null) return NotFound();

        return File(stream, fileUpload.ContentType, fileUpload.OriginalFilename);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var fileUpload = await db.FileUploads.FirstOrDefaultAsync(f => f.Id == id && f.UserId == UserId);
        if (fileUpload == null) return NotFound();

        // Remove from DB first, then delete file
        db.FileUploads.Remove(fileUpload);
        await db.SaveChangesAsync();

        if (!storageService.DeleteFile(fileUpload.StoredFilename))
        {
            logger.LogWarning("File {StoredFilename} could not be deleted from disk after DB removal (file {FileId})", fileUpload.StoredFilename, id);
        }

        logger.LogInformation("File {FileId} deleted by user {UserId}", id, UserId);
        return NoContent();
    }
}
