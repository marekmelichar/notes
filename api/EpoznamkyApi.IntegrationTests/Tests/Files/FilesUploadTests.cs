using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Files;

[Collection("Database")]
public class FilesUploadTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    private static byte[] CreateFakeImage(int size = 100)
    {
        var bytes = new byte[size];
        Random.Shared.NextBytes(bytes);
        return bytes;
    }

    [Fact]
    public async Task Upload_should_accept_valid_image()
    {
        var content = CreateFakeImage();

        var response = await Client.UploadFile("test.png", content, "image/png");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var file = await response.ReadAs<FileUploadResponse>();
        file.Id.Should().NotBeNullOrEmpty();
        file.OriginalFilename.Should().Be("test.png");
        file.ContentType.Should().Be("image/png");
        file.Size.Should().Be(content.Length);
        file.Url.Should().StartWith("/api/v1/files/");
    }

    [Fact]
    public async Task Upload_should_accept_valid_pdf()
    {
        var content = CreateFakeImage(200);

        var response = await Client.UploadFile("document.pdf", content, "application/pdf");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var file = await response.ReadAs<FileUploadResponse>();
        file.ContentType.Should().Be("application/pdf");
    }

    [Fact]
    public async Task Upload_should_reject_empty_file()
    {
        var response = await Client.UploadFile("empty.png", [], "image/png");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_should_reject_invalid_extension()
    {
        var content = CreateFakeImage();

        var response = await Client.UploadFile("script.exe", content, "image/png");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_should_reject_invalid_content_type()
    {
        var content = CreateFakeImage();

        var response = await Client.UploadFile("test.png", content, "application/x-executable");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
