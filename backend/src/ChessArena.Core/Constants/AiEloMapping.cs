using System.Collections.Frozen;

namespace ChessArena.Core.Constants;

public static class AiEloMapping
{
    private static readonly FrozenDictionary<int, int> LevelToElo =
        new Dictionary<int, int>
        {
            [1] = 400,
            [2] = 600,
            [3] = 800,
            [4] = 1000,
            [5] = 1200,
            [6] = 1500,
            [7] = 1800,
            [8] = 2500
        }.ToFrozenDictionary();

    public static int GetAiElo(int level) =>
        LevelToElo.TryGetValue(level, out var elo) ? elo : 1200;
}
