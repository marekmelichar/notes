using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Files;

[Collection("Database")]
public class FilesDownloadTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task GetFile_should_be_accessible_anonymously()
    {
        // Upload as authenticated user
        var content = new byte[] { 1, 2, 3, 4, 5 };
        var uploadResponse = await Client.UploadFile("test.png", content, "image/png");
        var file = await uploadResponse.ReadAs<FileUploadResponse>();

        // Download as anonymous
        Client.AsAnonymous();
        var response = await Client.GetFile(file.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetFile_should_return_correct_content_type_and_filename()
    {
        var content = new byte[] { 1, 2, 3 };
        var uploadResponse = await Client.UploadFile("photo.jpg", content, "image/jpeg");
        var file = await uploadResponse.ReadAs<FileUploadResponse>();

        var response = await Client.GetFile(file.Id);

        response.Content.Headers.ContentType!.MediaType.Should().Be("image/jpeg");
        response.Content.Headers.ContentDisposition!.FileName.Should().Be("photo.jpg");
    }

    [Fact]
    public async Task GetFile_should_return_404_for_nonexistent_file()
    {
        var response = await Client.GetFile("nonexistent-id");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
