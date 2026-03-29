using ChessArena.Core.Constants;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Application.Services;

public sealed class GameResultService : IGameResultService
{
    private readonly IEloRatingService _eloService;
    private readonly ISessionCapService _sessionCapService;
    private readonly IPgnValidator _pgnValidator;
    private readonly IPlayerRepository _playerRepository;
    private readonly IGameRepository _gameRepository;
    private readonly IRatingHistoryRepository _ratingHistoryRepository;
    private readonly TitleAwardService _titleAwardService;
    private readonly IUnitOfWork _unitOfWork;

    public GameResultService(
        IEloRatingService eloService,
        ISessionCapService sessionCapService,
        IPgnValidator pgnValidator,
        IPlayerRepository playerRepository,
        IGameRepository gameRepository,
        IRatingHistoryRepository ratingHistoryRepository,
        TitleAwardService titleAwardService,
        IUnitOfWork unitOfWork)
    {
        _eloService = eloService;
        _sessionCapService = sessionCapService;
        _pgnValidator = pgnValidator;
        _playerRepository = playerRepository;
        _gameRepository = gameRepository;
        _ratingHistoryRepository = ratingHistoryRepository;
        _titleAwardService = titleAwardService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Game> ProcessResultAsync(
        Guid playerId,
        GameSubmission submission,
        CancellationToken ct = default)
    {
        var player = await _playerRepository.GetByIdAsync(playerId, ct)
            ?? throw new InvalidOperationException($"Player {playerId} not found.");

        if (!await _pgnValidator.ValidateAsync(submission.Pgn, submission.Result, submission.PlayerColor, ct))
            throw new InvalidOperationException("PGN validation failed.");

        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var aiElo = AiEloMapping.GetAiElo(submission.AiLevel);
            int eloBefore = player.GetRating(submission.TimeControl);
            int eloChange = 0;

            if (submission.IsRated && submission.TimeControl != TimeControl.Custom)
            {
                double actualScore = submission.Result switch
                {
                    GameResult.Win => 1.0,
                    GameResult.Draw => 0.5,
                    _ => 0.0
                };

                double expected = _eloService.ExpectedScore(eloBefore, aiElo);
                int kFactor = _eloService.GetKFactor(player, submission.TimeControl);
                int rawDelta = _eloService.ComputeDelta(kFactor, actualScore, expected);

                eloChange = _eloService.ApplyLowAiCap(rawDelta, submission.AiLevel);

                // Apply floor clamp first, then check session cap with the actual delta
                int newRating = Math.Max(eloBefore + eloChange, RatingConstants.RatingFloor);
                eloChange = newRating - eloBefore;

                if (eloChange > 0)
                {
                    bool underCap = await _sessionCapService.CheckAndIncrementAsync(
                        playerId, eloChange, ct);
                    if (!underCap)
                    {
                        eloChange = 0;
                        newRating = eloBefore;
                    }
                }

                player.SetRating(submission.TimeControl, newRating);
                player.IncrementGamesPlayed(submission.TimeControl);
                player.SetRd(submission.TimeControl, Math.Max(
                    RatingConstants.MinRd,
                    player.GetRd(submission.TimeControl) - RatingConstants.RdReductionPerGame));

                if (newRating > player.GetPeakElo(submission.TimeControl))
                    player.SetPeakElo(submission.TimeControl, newRating);

                _titleAwardService.TryUpgradeTitle(player);
            }

            player.LastActiveAt = DateTime.UtcNow;

            var game = new Game
            {
                Id = Guid.NewGuid(),
                PlayerId = playerId,
                AiLevel = submission.AiLevel,
                AiElo = aiElo,
                TimeControl = submission.TimeControl,
                IsRated = submission.IsRated,
                Result = submission.Result,
                Termination = submission.Termination,
                PlayerColor = submission.PlayerColor,
                EloBefore = eloBefore,
                EloAfter = eloBefore + eloChange,
                EloChange = eloChange,
                Pgn = submission.Pgn,
                AccuracyPlayer = submission.AccuracyPlayer,
                DurationSeconds = submission.DurationSeconds,
                PlayedAt = DateTime.UtcNow
            };

            game.Player = player;
            await _gameRepository.AddAsync(game, ct);

            if (submission.IsRated && submission.TimeControl != TimeControl.Custom)
            {
                await _ratingHistoryRepository.AddAsync(new RatingHistory
                {
                    Id = Guid.NewGuid(),
                    PlayerId = playerId,
                    GameId = game.Id,
                    TimeControl = submission.TimeControl,
                    Rating = game.EloAfter,
                    RatingDeviation = player.GetRd(submission.TimeControl),
                    RecordedAt = game.PlayedAt
                }, ct);
            }

            await _unitOfWork.CommitAsync(ct);

            return game;
        }
        catch
        {
            try { await _unitOfWork.RollbackAsync(ct); }
            catch { /* rollback is best-effort */ }
            throw;
        }
    }
}
