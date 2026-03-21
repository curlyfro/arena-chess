using ChessArena.Application.Services;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using FluentAssertions;

namespace ChessArena.UnitTests.Services;

public class TitleAwardServiceTests
{
    private readonly TitleAwardService _sut = new();

    [Theory]
    [InlineData(1000, PlayerTitle.Beginner)]
    [InlineData(1199, PlayerTitle.Beginner)]
    [InlineData(1200, PlayerTitle.ClubPlayer)]
    [InlineData(1400, PlayerTitle.Intermediate)]
    [InlineData(1600, PlayerTitle.Advanced)]
    [InlineData(1800, PlayerTitle.Expert)]
    [InlineData(2000, PlayerTitle.CandidateMaster)]
    [InlineData(2200, PlayerTitle.Master)]
    [InlineData(2400, PlayerTitle.Grandmaster)]
    [InlineData(2800, PlayerTitle.Grandmaster)]
    public void DetermineTitle_ReturnsCorrectTitle(int peakElo, PlayerTitle expected)
    {
        var player = new Player
        {
            Id = Guid.NewGuid(),
            Username = "test",
            ApplicationUserId = "u1",
            PeakEloBullet = peakElo,
            PeakEloBlitz = peakElo,
            PeakEloRapid = peakElo
        };

        _sut.DetermineTitle(player).Should().Be(expected);
    }

    [Fact]
    public void TryUpgradeTitle_UpgradesWhenQualified()
    {
        var player = new Player
        {
            Id = Guid.NewGuid(),
            Username = "test",
            ApplicationUserId = "u1",
            Title = PlayerTitle.Beginner,
            PeakEloBlitz = 1500
        };

        _sut.TryUpgradeTitle(player).Should().BeTrue();
        player.Title.Should().Be(PlayerTitle.Intermediate);
    }

    [Fact]
    public void TryUpgradeTitle_DoesNotDowngrade()
    {
        var player = new Player
        {
            Id = Guid.NewGuid(),
            Username = "test",
            ApplicationUserId = "u1",
            Title = PlayerTitle.Expert,
            PeakEloBlitz = 1200
        };

        _sut.TryUpgradeTitle(player).Should().BeFalse();
        player.Title.Should().Be(PlayerTitle.Expert);
    }

    [Fact]
    public void DetermineTitle_UsesHighestPeakAcrossAllTimeControls()
    {
        var player = new Player
        {
            Id = Guid.NewGuid(),
            Username = "test",
            ApplicationUserId = "u1",
            PeakEloBullet = 1100,
            PeakEloBlitz = 1300,
            PeakEloRapid = 2200
        };

        _sut.DetermineTitle(player).Should().Be(PlayerTitle.Master);
    }
}
