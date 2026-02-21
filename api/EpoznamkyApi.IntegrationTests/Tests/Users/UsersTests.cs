using System.Net;
using EpoznamkyApi.Data;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace EpoznamkyApi.IntegrationTests.Tests.Users;

[Collection("Database")]
public class UsersTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    private async Task SeedUsersAndShareAsync()
    {
        // Seed User table (normally done by Keycloak sync, we do it manually for tests)
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.Users.Add(new User { Id = TestUserId, Email = TestUserEmail, Name = TestUserName });
        dbContext.Users.Add(new User { Id = OtherUserId, Email = OtherUserEmail, Name = OtherUserName });
        await dbContext.SaveChangesAsync();

        // Create a note as User 1 and share with User 2 (makes them "related")
        var noteResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Shared Note"));
        var note = await noteResponse.ReadAs<NoteResponse>();
        await Client.ShareNote(note.Id, TestDataFactory.ShareNoteRequest(email: OtherUserEmail));
    }

    [Fact]
    public async Task GetMe_should_return_current_user_info()
    {
        var response = await Client.GetCurrentUser();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.ReadAs<UserInfoResponse>();
        user.UserId.Should().Be(TestUserId);
        user.UserEmail.Should().Be(TestUserEmail);
        user.UserName.Should().Be(TestUserName);
    }

    [Fact]
    public async Task GetById_should_return_related_user()
    {
        await SeedUsersAndShareAsync();

        var response = await Client.GetUser(OtherUserId);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.ReadAs<User>();
        user.Id.Should().Be(OtherUserId);
        user.Email.Should().Be(OtherUserEmail);
    }

    [Fact]
    public async Task GetById_should_return_404_for_unrelated_user()
    {
        // Seed users but no sharing relationship
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.Users.Add(new User { Id = "unrelated-user", Email = "unrelated@example.com", Name = "Unrelated" });
        await dbContext.SaveChangesAsync();

        var response = await Client.GetUser("unrelated-user");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Search_should_find_related_users_by_email()
    {
        await SeedUsersAndShareAsync();

        var response = await Client.SearchUsers("user2");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var users = await response.ReadAs<List<User>>();
        users.Should().ContainSingle(u => u.Email == OtherUserEmail);
    }

    [Fact]
    public async Task Search_should_return_400_for_query_too_long()
    {
        var longEmail = new string('a', 321);

        var response = await Client.SearchUsers(longEmail);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
