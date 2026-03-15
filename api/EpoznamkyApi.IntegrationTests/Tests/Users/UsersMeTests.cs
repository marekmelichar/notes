using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Users;

[Collection("Database")]
public class UsersMeTests(DatabaseFixture db) : IntegrationTestBase(db)
{
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
}
