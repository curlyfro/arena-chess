using System.Globalization;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.DynamoDb.Repositories;

public sealed class DynamoRatingHistoryRepository : IRatingHistoryRepository
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly DynamoUnitOfWork _unitOfWork;
    private RatingHistory? _pending;

    public DynamoRatingHistoryRepository(IAmazonDynamoDB dynamoDb, DynamoUnitOfWork unitOfWork)
    {
        _dynamoDb = dynamoDb;
        _unitOfWork = unitOfWork;
        unitOfWork.Enlist(FlushToTransactionAsync);
    }

    public async Task<IReadOnlyList<RatingHistory>> GetByPlayerIdAsync(
        Guid playerId, TimeControl? timeControl = null, int limit = 100, CancellationToken ct = default)
    {
        // SK prefix: RATING# (all TCs) or RATING#Blitz# (specific TC)
        var skPrefix = timeControl.HasValue
            ? KeyHelpers.RatingSkPrefix(timeControl.Value)
            : DynamoConstants.RatingPrefix;

        var response = await _dynamoDb.QueryAsync(new QueryRequest
        {
            TableName = DynamoConstants.TableName,
            KeyConditionExpression = $"{DynamoConstants.Pk} = :pk AND begins_with({DynamoConstants.Sk}, :prefix)",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":pk"] = new(KeyHelpers.PlayerPk(playerId)),
                [":prefix"] = new(skPrefix),
            },
            ScanIndexForward = false, // newest first
            Limit = limit,
        }, ct);

        // Reverse to return chronological order (oldest → newest), matching EF behavior
        var items = response.Items.Select(FromItem).ToList();
        items.Reverse();
        return items;
    }

    public Task AddAsync(RatingHistory entry, CancellationToken ct = default)
    {
        _pending = entry;
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        if (_unitOfWork.IsActive)
            return; // Items will be flushed by UoW.CommitAsync

        if (_pending is null)
            return;

        var entry = _pending;
        _pending = null;

        await _dynamoDb.PutItemAsync(new PutItemRequest
        {
            TableName = DynamoConstants.TableName,
            Item = ToItem(entry),
        }, ct);
    }

    private Task FlushToTransactionAsync(List<TransactWriteItem> buffer, CancellationToken ct)
    {
        if (_pending is not null)
        {
            buffer.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = DynamoConstants.TableName,
                    Item = ToItem(_pending),
                },
            });
            _pending = null;
        }

        return Task.CompletedTask;
    }

    private static Dictionary<string, AttributeValue> ToItem(RatingHistory rh) => new()
    {
        [DynamoConstants.Pk] = new(KeyHelpers.PlayerPk(rh.PlayerId)),
        [DynamoConstants.Sk] = new(KeyHelpers.RatingSk(rh.TimeControl, rh.RecordedAt, rh.Id)),
        [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.RatingHistory),
        ["Id"] = new(rh.Id.ToString()),
        ["PlayerId"] = new(rh.PlayerId.ToString()),
        ["GameId"] = new(rh.GameId.ToString()),
        ["TimeControl"] = new(rh.TimeControl.ToString()),
        ["Rating"] = new() { N = rh.Rating.ToString() },
        ["RatingDeviation"] = new() { N = rh.RatingDeviation.ToString() },
        ["RecordedAt"] = new(rh.RecordedAt.ToString("O")),
    };

    private static RatingHistory FromItem(Dictionary<string, AttributeValue> item) => new()
    {
        Id = Guid.Parse(item["Id"].S),
        PlayerId = Guid.Parse(item["PlayerId"].S),
        GameId = Guid.Parse(item["GameId"].S),
        TimeControl = Enum.Parse<TimeControl>(item["TimeControl"].S),
        Rating = int.Parse(item["Rating"].N),
        RatingDeviation = int.Parse(item["RatingDeviation"].N),
        RecordedAt = DateTime.ParseExact(item["RecordedAt"].S, "O", null, DateTimeStyles.RoundtripKind),
    };
}
