using ChessArena.Core.Enums;

namespace ChessArena.Core.Interfaces;

public interface IPgnValidator
{
    Task<bool> ValidateAsync(string pgn, GameResult declaredResult, CancellationToken ct = default);
}
