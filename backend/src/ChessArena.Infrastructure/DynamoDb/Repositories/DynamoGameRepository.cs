using System.Globalization;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.DynamoDb.Repositories;

public sealed class DynamoGameRepository : IGameRepository
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly DynamoUnitOfWork _unitOfWork;
    private Game? _pending;

    public DynamoGameRepository(IAmazonDynamoDB dynamoDb, DynamoUnitOfWork unitOfWork)
    {
        _dynamoDb = dynamoDb;
        _unitOfWork = unitOfWork;
        unitOfWork.Enlist(FlushToTransactionAsync);
    }

    public async Task<Game?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var response = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = KeyHelpers.Key(KeyHelpers.GamePk(id), DynamoConstants.DetailSk),
        }, ct);

        if (!response.IsItemSet)
            return null;

        return FromDetailItem(response.Item);
    }

    public async Task<IReadOnlyList<Game>> GetByPlayerIdAsync(
        Guid playerId, int page, int pageSize, CancellationToken ct = default)
    {
        // DynamoDB cursor-based pagination: chain queries to reach page N
        Dictionary<string, AttributeValue>? exclusiveStartKey = null;

        for (int p = 1; p <= page; p++)
        {
            var response = await _dynamoDb.QueryAsync(new QueryRequest
            {
                TableName = DynamoConstants.TableName,
                KeyConditionExpression = $"{DynamoConstants.Pk} = :pk AND begins_with({DynamoConstants.Sk}, :prefix)",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":pk"] = new(KeyHelpers.PlayerPk(playerId)),
                    [":prefix"] = new(DynamoConstants.GamePrefix),
                },
                ScanIndexForward = false, // newest first
                Limit = pageSize,
                ExclusiveStartKey = exclusiveStartKey,
            }, ct);

            if (p == page)
                return response.Items.Select(FromPlayerGameItem).ToList();

            // If no more pages, return empty
            if (response.LastEvaluatedKey == null || response.LastEvaluatedKey.Count == 0)
                return [];

            exclusiveStartKey = response.LastEvaluatedKey;
        }

        return [];
    }

    public async Task<int> GetCountByPlayerIdAsync(Guid playerId, CancellationToken ct = default)
    {
        int total = 0;
        Dictionary<string, AttributeValue>? startKey = null;

        do
        {
            var response = await _dynamoDb.QueryAsync(new QueryRequest
            {
                TableName = DynamoConstants.TableName,
                KeyConditionExpression = $"{DynamoConstants.Pk} = :pk AND begins_with({DynamoConstants.Sk}, :prefix)",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":pk"] = new(KeyHelpers.PlayerPk(playerId)),
                    [":prefix"] = new(DynamoConstants.GamePrefix),
                },
                Select = Select.COUNT,
                ExclusiveStartKey = startKey,
            }, ct);

            total += response.Count ?? 0;
            startKey = response.LastEvaluatedKey;
        } while (startKey is { Count: > 0 });

        return total;
    }

    public Task AddAsync(Game game, CancellationToken ct = default)
    {
        _pending = game;
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        if (_unitOfWork.IsActive)
            return; // Items will be flushed by UoW.CommitAsync

        if (_pending is null)
            return;

        var items = BuildWriteItems(_pending);
        _pending = null;

        await _dynamoDb.TransactWriteItemsAsync(new TransactWriteItemsRequest
        {
            TransactItems = items,
        }, ct);
    }

    private Task FlushToTransactionAsync(List<TransactWriteItem> buffer, CancellationToken ct)
    {
        if (_pending is not null)
        {
            buffer.AddRange(BuildWriteItems(_pending));
            _pending = null;
        }

        return Task.CompletedTask;
    }

    private static List<TransactWriteItem> BuildWriteItems(Game game)
    {
        var playerUsername = game.Player?.Username
            ?? throw new InvalidOperationException("Game.Player must be set before saving — username is denormalized on the DETAIL item.");

        return
        [
            new() { Put = new Put { TableName = DynamoConstants.TableName, Item = ToPlayerGameItem(game) } },
            new() { Put = new Put { TableName = DynamoConstants.TableName, Item = ToDetailItem(game, playerUsername) } },
        ];
    }

    // ── Serialization: Player collection item (PLAYER#<id> | GAME#<time>#<gameId>) ──

    private static Dictionary<string, AttributeValue> ToPlayerGameItem(Game g) => BuildGameAttributes(g,
        KeyHelpers.PlayerPk(g.PlayerId),
        KeyHelpers.GameSk(g.PlayedAt, g.Id));

    // ── Serialization: Detail item (GAME#<id> | DETAIL) ──

    private static Dictionary<string, AttributeValue> ToDetailItem(Game g, string playerUsername)
    {
        var item = BuildGameAttributes(g, KeyHelpers.GamePk(g.Id), DynamoConstants.DetailSk);
        item["PlayerUsername"] = new(playerUsername);
        return item;
    }

    private static Dictionary<string, AttributeValue> BuildGameAttributes(Game g, string pk, string sk) => new()
    {
        [DynamoConstants.Pk] = new(pk),
        [DynamoConstants.Sk] = new(sk),
        [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.Game),
        ["Id"] = new(g.Id.ToString()),
        ["PlayerId"] = new(g.PlayerId.ToString()),
        ["AiLevel"] = new() { N = g.AiLevel.ToString() },
        ["AiElo"] = new() { N = g.AiElo.ToString() },
        ["TimeControl"] = new(g.TimeControl.ToString()),
        ["IsRated"] = new() { BOOL = g.IsRated },
        ["Result"] = new(g.Result.ToString()),
        ["Termination"] = new(g.Termination.ToString()),
        ["PlayerColor"] = new(g.PlayerColor.ToString()),
        ["EloBefore"] = new() { N = g.EloBefore.ToString() },
        ["EloAfter"] = new() { N = g.EloAfter.ToString() },
        ["EloChange"] = new() { N = g.EloChange.ToString() },
        ["Pgn"] = new(g.Pgn),
        ["AccuracyPlayer"] = new() { N = g.AccuracyPlayer.ToString(CultureInfo.InvariantCulture) },
        ["DurationSeconds"] = new() { N = g.DurationSeconds.ToString() },
        ["PlayedAt"] = new(g.PlayedAt.ToString("O")),
    };

    private static Game FromDetailItem(Dictionary<string, AttributeValue> item)
    {
        var game = FromGameAttributes(item);

        // Populate Player stub with denormalized username
        if (item.TryGetValue("PlayerUsername", out var un))
            game.Player = new Player { Id = game.PlayerId, Username = un.S };

        return game;
    }

    private static Game FromPlayerGameItem(Dictionary<string, AttributeValue> item) =>
        FromGameAttributes(item);

    private static Game FromGameAttributes(Dictionary<string, AttributeValue> item) => new()
    {
        Id = Guid.Parse(item["Id"].S),
        PlayerId = Guid.Parse(item["PlayerId"].S),
        AiLevel = int.Parse(item["AiLevel"].N),
        AiElo = int.Parse(item["AiElo"].N),
        TimeControl = Enum.Parse<TimeControl>(item["TimeControl"].S),
        IsRated = item["IsRated"].BOOL == true,
        Result = Enum.Parse<GameResult>(item["Result"].S),
        Termination = Enum.Parse<Termination>(item["Termination"].S),
        PlayerColor = Enum.Parse<PlayerColor>(item["PlayerColor"].S),
        EloBefore = int.Parse(item["EloBefore"].N),
        EloAfter = int.Parse(item["EloAfter"].N),
        EloChange = int.Parse(item["EloChange"].N),
        Pgn = item["Pgn"].S,
        AccuracyPlayer = float.Parse(item["AccuracyPlayer"].N, CultureInfo.InvariantCulture),
        DurationSeconds = int.Parse(item["DurationSeconds"].N),
        PlayedAt = DateTime.ParseExact(item["PlayedAt"].S, "O", null, DateTimeStyles.RoundtripKind),
    };
}
