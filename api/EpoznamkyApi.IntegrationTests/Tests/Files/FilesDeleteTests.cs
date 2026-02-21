using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Files;

[Collection("Database")]
public class FilesDeleteTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Delete_should_remove_own_file()
    {
        var content = new byte[] { 1, 2, 3 };
        var uploadResponse = await Client.UploadFile("test.png", content, "image/png");
        var file = await uploadResponse.ReadAs<FileUploadResponse>();

        var deleteResponse = await Client.DeleteFile(file.Id);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // File should no longer be accessible
        var getResponse = await Client.GetFile(file.Id);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_should_return_404_for_other_users_file()
    {
        var content = new byte[] { 1, 2, 3 };
        var uploadResponse = await Client.UploadFile("test.png", content, "image/png");
        var file = await uploadResponse.ReadAs<FileUploadResponse>();

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var deleteResponse = await Client.DeleteFile(file.Id);

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_should_return_404_for_nonexistent_file()
    {
        var deleteResponse = await Client.DeleteFile("nonexistent-id");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
