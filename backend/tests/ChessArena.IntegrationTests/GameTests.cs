using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ChessArena.IntegrationTests;

public class GameTests(CustomWebApplicationFactory factory)
    : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private async Task<(string AccessToken, string PlayerId)> RegisterAndGetTokenAsync(string suffix)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = $"game-{suffix}@example.com",
            Username = $"gameuser{suffix}",
            Password = "Password123"
        });

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);

        // Get player ID from /me
        var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meRequest.Headers.Authorization = new("Bearer", auth!.AccessToken);
        var meResponse = await _client.SendAsync(meRequest);
        var profile = await meResponse.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);

        return (auth.AccessToken, profile!.PlayerId.ToString());
    }

    private HttpRequestMessage AuthorizedRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new("Bearer", token);
        return request;
    }

    [Fact]
    public async Task SubmitGame_RatedWin_UpdatesElo()
    {
        var (token, playerId) = await RegisterAndGetTokenAsync("win");

        var submitResponse = await _client.SendAsync(
            AuthorizedRequest(HttpMethod.Post, "/api/games", token)
                .WithJsonContent(new
                {
                    AiLevel = 5,
                    TimeControl = "blitz",
                    IsRated = true,
                    Result = "win",
                    Termination = "checkmate",
                    PlayerColor = "white",
                    Pgn = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0",
                    AccuracyPlayer = 85.0,
                    DurationSeconds = 120
                }));

        submitResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await submitResponse.Content.ReadFromJsonAsync<GameSubmitResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.EloChange.Should().BeGreaterThan(0, "a win against L5 should gain Elo");
        result.EloAfter.Should().BeGreaterThan(result.EloBefore);
        result.GameId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task SubmitGame_RatedLoss_DecreasesElo()
    {
        var (token, _) = await RegisterAndGetTokenAsync("loss");

        var submitResponse = await _client.SendAsync(
            AuthorizedRequest(HttpMethod.Post, "/api/games", token)
                .WithJsonContent(new
                {
                    AiLevel = 5,
                    TimeControl = "blitz",
                    IsRated = true,
                    Result = "loss",
                    Termination = "checkmate",
                    PlayerColor = "white",
                    Pgn = "1. f3 e5 2. g4 Qh4# 0-1",
                    AccuracyPlayer = 20.0,
                    DurationSeconds = 30
                }));

        submitResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await submitResponse.Content.ReadFromJsonAsync<GameSubmitResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.EloChange.Should().BeLessThan(0, "a loss should decrease Elo");
        result.EloAfter.Should().BeLessThan(result.EloBefore);
    }

    [Fact]
    public async Task SubmitGame_Unrated_NoEloChange()
    {
        var (token, _) = await RegisterAndGetTokenAsync("unrated");

        var submitResponse = await _client.SendAsync(
            AuthorizedRequest(HttpMethod.Post, "/api/games", token)
                .WithJsonContent(new
                {
                    AiLevel = 3,
                    TimeControl = "custom",
                    IsRated = false,
                    Result = "win",
                    Termination = "resign",
                    PlayerColor = "black",
                    Pgn = "1. e4 e5 2. d4 exd4 0-1",
                    AccuracyPlayer = 70.0,
                    DurationSeconds = 60
                }));

        submitResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await submitResponse.Content.ReadFromJsonAsync<GameSubmitResponse>(JsonOptions);
        result.Should().NotBeNull();
        result!.EloChange.Should().Be(0, "unrated games should not change Elo");
    }

    [Fact]
    public async Task SubmitGame_Unauthorized_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/games", new
        {
            AiLevel = 5,
            TimeControl = "blitz",
            IsRated = true,
            Result = "win",
            Termination = "checkmate",
            PlayerColor = "white",
            Pgn = "1. e4 e5 1-0",
            AccuracyPlayer = 50.0,
            DurationSeconds = 60
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetGame_ReturnsGameDetail()
    {
        var (token, _) = await RegisterAndGetTokenAsync("detail");

        var submitResponse = await _client.SendAsync(
            AuthorizedRequest(HttpMethod.Post, "/api/games", token)
                .WithJsonContent(new
                {
                    AiLevel = 4,
                    TimeControl = "rapid",
                    IsRated = true,
                    Result = "win",
                    Termination = "resign",
                    PlayerColor = "white",
                    Pgn = "1. e4 e5 2. d4 exd4 1-0",
                    AccuracyPlayer = 80.0,
                    DurationSeconds = 300
                }));

        var submitResult = await submitResponse.Content.ReadFromJsonAsync<GameSubmitResponse>(JsonOptions);

        var getResponse = await _client.GetAsync($"/api/games/{submitResult!.GameId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await getResponse.Content.ReadFromJsonAsync<GameDetailResponse>(JsonOptions);
        detail.Should().NotBeNull();
        detail!.AiLevel.Should().Be(4);
        detail.TimeControl.Should().Be("Rapid");
        detail.Pgn.Should().Contain("e4");
        detail.PlayerUsername.Should().Be("gameuserdetail");
    }

    [Fact]
    public async Task Leaderboard_ReturnsPlayers()
    {
        // Register a player and submit a rated game so they appear on the leaderboard
        var (token, _) = await RegisterAndGetTokenAsync("leader");

        await _client.SendAsync(
            AuthorizedRequest(HttpMethod.Post, "/api/games", token)
                .WithJsonContent(new
                {
                    AiLevel = 5,
                    TimeControl = "blitz",
                    IsRated = true,
                    Result = "win",
                    Termination = "checkmate",
                    PlayerColor = "white",
                    Pgn = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0",
                    AccuracyPlayer = 90.0,
                    DurationSeconds = 45
                }));

        var response = await _client.GetAsync("/api/leaderboard?timeControl=blitz");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var entries = await response.Content.ReadFromJsonAsync<LeaderboardEntry[]>(JsonOptions);
        entries.Should().NotBeNull();
        entries!.Should().Contain(e => e.Username == "gameuserleader");
    }

}

internal static class HttpRequestMessageExtensions
{
    public static HttpRequestMessage WithJsonContent<T>(this HttpRequestMessage request, T content)
    {
        request.Content = JsonContent.Create(content);
        return request;
    }
}
