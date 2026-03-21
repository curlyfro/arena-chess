using ChessArena.Application.Services;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using FluentAssertions;

namespace ChessArena.UnitTests.Services;

public class EloRatingServiceTests
{
    private readonly EloRatingService _sut = new();

    [Fact]
    public void ExpectedScore_EqualRatings_Returns50Percent()
    {
        var result = _sut.ExpectedScore(1500, 1500);
        result.Should().BeApproximately(0.5, 0.001);
    }

    [Fact]
    public void ExpectedScore_PlayerHigherBy200_ReturnsAbout76Percent()
    {
        var result = _sut.ExpectedScore(1400, 1200);
        result.Should().BeApproximately(0.76, 0.01);
    }

    [Fact]
    public void ExpectedScore_AppendixA_1350vs1200_Returns0703()
    {
        // Spec Appendix A: Player 1350 vs AI 1200
        // diff = Clamp(1200 - 1350, -400, 400) = -150
        // ea = 1 / (1 + 10^(-150/400)) = 1 / (1 + 0.4217) = 0.703
        var result = _sut.ExpectedScore(1350, 1200);
        result.Should().BeApproximately(0.703, 0.001);
    }

    [Fact]
    public void ExpectedScore_ClampsAt400PointDifference()
    {
        var resultHuge = _sut.ExpectedScore(1000, 2000);
        var resultClamped = _sut.ExpectedScore(1000, 1400);
        resultHuge.Should().BeApproximately(resultClamped, 0.001);
    }

    [Fact]
    public void GetKFactor_NewPlayer_Returns40()
    {
        var player = CreatePlayer(gamesBlitz: 10, eloBlitz: 1200);
        _sut.GetKFactor(player, TimeControl.Blitz).Should().Be(40);
    }

    [Fact]
    public void GetKFactor_EstablishedUnder2400_Returns20()
    {
        var player = CreatePlayer(gamesBlitz: 50, eloBlitz: 1800);
        _sut.GetKFactor(player, TimeControl.Blitz).Should().Be(20);
    }

    [Fact]
    public void GetKFactor_ElitePlayer_Returns10()
    {
        var player = CreatePlayer(gamesBlitz: 100, eloBlitz: 2500);
        _sut.GetKFactor(player, TimeControl.Blitz).Should().Be(10);
    }

    [Fact]
    public void GetKFactor_29Games_StillNewPlayer()
    {
        var player = CreatePlayer(gamesBlitz: 29, eloBlitz: 1500);
        _sut.GetKFactor(player, TimeControl.Blitz).Should().Be(40);
    }

    [Fact]
    public void GetKFactor_30Games_EstablishedPlayer()
    {
        var player = CreatePlayer(gamesBlitz: 30, eloBlitz: 1500);
        _sut.GetKFactor(player, TimeControl.Blitz).Should().Be(20);
    }

    [Fact]
    public void ComputeDelta_AppendixA_Returns6()
    {
        // Player 1350, K=20, wins (actual=1.0), expected=0.703
        // delta = Round(20 * (1.0 - 0.703)) = Round(5.94) = 6
        var delta = _sut.ComputeDelta(20, 1.0, 0.703);
        delta.Should().Be(6);
    }

    [Fact]
    public void ComputeDelta_Loss_ReturnsNegative()
    {
        var delta = _sut.ComputeDelta(20, 0.0, 0.703);
        delta.Should().Be(-14);
    }

    [Fact]
    public void ComputeDelta_Draw_ReturnsSmallDelta()
    {
        var delta = _sut.ComputeDelta(20, 0.5, 0.703);
        delta.Should().Be(-4);
    }

    [Fact]
    public void ApplyLowAiCap_Level1_ClampsTo20()
    {
        _sut.ApplyLowAiCap(30, 1).Should().Be(20);
        _sut.ApplyLowAiCap(-30, 1).Should().Be(-20);
    }

    [Fact]
    public void ApplyLowAiCap_Level3_ClampsTo20()
    {
        _sut.ApplyLowAiCap(25, 3).Should().Be(20);
    }

    [Fact]
    public void ApplyLowAiCap_Level4_NoCap()
    {
        _sut.ApplyLowAiCap(30, 4).Should().Be(30);
    }

    [Fact]
    public void ApplyLowAiCap_Level5_NoCap()
    {
        _sut.ApplyLowAiCap(30, 5).Should().Be(30);
    }

    [Fact]
    public void FullCalculation_AppendixA()
    {
        // Full spec walkthrough: Player 1350, established, beats Level 5 (Elo 1200)
        var player = CreatePlayer(gamesBlitz: 45, eloBlitz: 1350);

        double ea = _sut.ExpectedScore(1350, 1200);
        int k = _sut.GetKFactor(player, TimeControl.Blitz);
        int delta = _sut.ComputeDelta(k, 1.0, ea);
        int capped = _sut.ApplyLowAiCap(delta, 5);

        ea.Should().BeApproximately(0.703, 0.001);
        k.Should().Be(20);
        delta.Should().Be(6);
        capped.Should().Be(6); // Level 5 = no cap

        int newRating = 1350 + capped;
        newRating.Should().Be(1356);
    }

    private static Player CreatePlayer(int gamesBlitz = 0, int eloBlitz = 1200)
    {
        return new Player
        {
            Id = Guid.NewGuid(),
            Username = "testplayer",
            ApplicationUserId = "user-1",
            GamesBlitz = gamesBlitz,
            EloBlitz = eloBlitz,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow
        };
    }
}
