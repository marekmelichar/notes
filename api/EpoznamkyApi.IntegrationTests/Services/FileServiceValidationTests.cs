using EpoznamkyApi.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace EpoznamkyApi.IntegrationTests.Services;

public class FileServiceValidationTests
{
    private readonly FileService _sut;

    public FileServiceValidationTests()
    {
        var settings = new FileStorageSettings();
        _sut = new FileService(null!, Options.Create(settings), NullLogger<FileService>.Instance);
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("application/pdf")]
    [InlineData("text/plain")]
    public void IsAllowedContentType_should_accept_valid_types(string contentType)
    {
        _sut.IsAllowedContentType(contentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("application/x-executable")]
    [InlineData("text/html")]
    [InlineData("application/javascript")]
    public void IsAllowedContentType_should_reject_invalid_types(string contentType)
    {
        _sut.IsAllowedContentType(contentType).Should().BeFalse();
    }

    [Theory]
    [InlineData("photo.jpg")]
    [InlineData("doc.pdf")]
    [InlineData("image.png")]
    [InlineData("archive.zip")]
    [InlineData("notes.md")]
    public void IsAllowedExtension_should_accept_valid_extensions(string fileName)
    {
        _sut.IsAllowedExtension(fileName).Should().BeTrue();
    }

    [Theory]
    [InlineData("script.exe")]
    [InlineData("virus.bat")]
    [InlineData("hack.sh")]
    [InlineData("page.html")]
    public void IsAllowedExtension_should_reject_invalid_extensions(string fileName)
    {
        _sut.IsAllowedExtension(fileName).Should().BeFalse();
    }

    [Fact]
    public void IsWithinSizeLimit_should_accept_file_within_limit()
    {
        _sut.IsWithinSizeLimit(50_000_000).Should().BeTrue(); // 50 MB
    }

    [Fact]
    public void IsWithinSizeLimit_should_accept_file_at_exact_limit()
    {
        _sut.IsWithinSizeLimit(104_857_600).Should().BeTrue(); // exactly 100 MB
    }

    [Fact]
    public void IsWithinSizeLimit_should_reject_file_over_limit()
    {
        _sut.IsWithinSizeLimit(104_857_601).Should().BeFalse(); // 100 MB + 1 byte
    }
}
