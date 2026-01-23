using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class FilesController(AppDbContext db, FileStorageService storageService) : BaseController
{
    [HttpPost]
    [Authorize]
    [RequestSizeLimit(104_857_600)]
    public async Task<ActionResult<FileUploadResponse>> Upload(
        IFormFile file,
        [FromForm] string? noteId)
    {
        if (file.Length == 0)
            return BadRequest("File is empty.");

        if (!storageService.IsWithinSizeLimit(file.Length))
            return BadRequest("File exceeds maximum allowed size.");

        if (!storageService.IsAllowedContentType(file.ContentType))
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

        await using var stream = file.OpenReadStream();
        await storageService.SaveFileAsync(stream, fileUpload.StoredFilename);

        db.FileUploads.Add(fileUpload);
        await db.SaveChangesAsync();

        var url = $"{Request.Scheme}://{Request.Host}/api/v1/files/{fileUpload.Id}";

        return CreatedAtAction(nameof(GetFile), new { id = fileUpload.Id }, new FileUploadResponse
        {
            Id = fileUpload.Id,
            Url = url,
            OriginalFilename = fileUpload.OriginalFilename,
            ContentType = fileUpload.ContentType,
            Size = fileUpload.Size
        });
    }

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
    [Authorize]
    public async Task<ActionResult> Delete(string id)
    {
        var fileUpload = await db.FileUploads.FirstOrDefaultAsync(f => f.Id == id && f.UserId == UserId);
        if (fileUpload == null) return NotFound();

        storageService.DeleteFile(fileUpload.StoredFilename);
        db.FileUploads.Remove(fileUpload);
        await db.SaveChangesAsync();

        return NoContent();
    }
}
