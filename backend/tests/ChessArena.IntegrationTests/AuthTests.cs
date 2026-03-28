using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ChessArena.IntegrationTests;

public class AuthTests(CustomWebApplicationFactory factory)
    : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    [Fact]
    public async Task Register_ReturnsTokens()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "test@example.com",
            Username = "testuser",
            Password = "Password123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        body.Should().NotBeNull();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.RefreshToken.Should().NotBeNullOrEmpty();
        body.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "dupe@example.com",
            Username = "dupeuser1",
            Password = "Password123"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "dupe@example.com",
            Username = "dupeuser2",
            Password = "Password123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsTokens()
    {
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "login@example.com",
            Username = "loginuser",
            Password = "Password123"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "login@example.com",
            Password = "Password123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        body.Should().NotBeNull();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_InvalidPassword_ReturnsUnauthorized()
    {
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "wrongpw@example.com",
            Username = "wrongpwuser",
            Password = "Password123"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "wrongpw@example.com",
            Password = "WrongPassword"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithToken_ReturnsProfile()
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "me@example.com",
            Username = "meuser",
            Password = "Password123"
        });

        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new("Bearer", auth!.AccessToken);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        body.Should().NotBeNull();
        body!.Username.Should().Be("meuser");
        body.Email.Should().Be("me@example.com");
    }

    [Fact]
    public async Task Me_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_ValidToken_ReturnsNewTokens()
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "refresh@example.com",
            Username = "refreshuser",
            Password = "Password123"
        });

        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);

        var refreshResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            RefreshToken = auth!.RefreshToken
        });

        refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var newAuth = await refreshResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        newAuth.Should().NotBeNull();
        newAuth!.AccessToken.Should().NotBeNullOrEmpty();
        newAuth.RefreshToken.Should().NotBe(auth.RefreshToken, "token rotation should issue a new refresh token");
    }

    [Fact]
    public async Task Refresh_UsedToken_ReturnsUnauthorized()
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "reuse@example.com",
            Username = "reuseuser",
            Password = "Password123"
        });

        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);

        // First refresh succeeds
        await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            RefreshToken = auth!.RefreshToken
        });

        // Second use of the same token should fail (rotation)
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            RefreshToken = auth.RefreshToken
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Revoke_ValidToken_ReturnsNoContent()
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = "revoke@example.com",
            Username = "revokeuser",
            Password = "Password123"
        });

        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);

        var revokeResponse = await _client.PostAsJsonAsync("/api/auth/revoke", new
        {
            RefreshToken = auth!.RefreshToken
        });

        revokeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Revoked token should not work for refresh
        var refreshResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            RefreshToken = auth.RefreshToken
        });

        refreshResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

}
