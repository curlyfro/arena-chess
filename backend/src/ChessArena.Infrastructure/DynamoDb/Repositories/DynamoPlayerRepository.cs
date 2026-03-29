using System.Globalization;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.DynamoDb.Repositories;

public sealed class DynamoPlayerRepository : IPlayerRepository
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly DynamoUnitOfWork _unitOfWork;
    private Player? _pending;
    private Player? _tracked;

    public DynamoPlayerRepository(IAmazonDynamoDB dynamoDb, DynamoUnitOfWork unitOfWork)
    {
        _dynamoDb = dynamoDb;
        _unitOfWork = unitOfWork;

        // Enlist so UoW.CommitAsync flushes tracked player changes
        unitOfWork.Enlist(FlushToTransactionAsync);
    }

    public async Task<Player?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var response = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = KeyHelpers.Key(KeyHelpers.PlayerPk(id), DynamoConstants.ProfileSk),
        }, ct);

        if (!response.IsItemSet)
            return null;

        var player = FromItem(response.Item);
        _tracked = player;
        return player;
    }

    public async Task<Player?> GetByUsernameAsync(string username, CancellationToken ct = default)
    {
        var lookup = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = KeyHelpers.Key(KeyHelpers.UsernamePk(username), DynamoConstants.LookupSk),
        }, ct);

        if (!lookup.IsItemSet)
            return null;

        var playerId = Guid.Parse(lookup.Item["PlayerId"].S);
        return await GetByIdAsync(playerId, ct);
    }

    public async Task<Player?> GetByApplicationUserIdAsync(string userId, CancellationToken ct = default)
    {
        var lookup = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = KeyHelpers.Key(KeyHelpers.UserPk(userId), DynamoConstants.PlayerLookupSk),
        }, ct);

        if (!lookup.IsItemSet)
            return null;

        var playerId = Guid.Parse(lookup.Item["PlayerId"].S);
        return await GetByIdAsync(playerId, ct);
    }

    public Task AddAsync(Player player, CancellationToken ct = default)
    {
        _pending = player;
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        if (_unitOfWork.IsActive)
            return; // Items will be flushed by UoW.CommitAsync via FlushToTransactionAsync

        if (_pending is not null)
        {
            await WriteNewPlayerDirectAsync(_pending, ct);
            _pending = null;
        }
        else if (_tracked is not null)
        {
            await WriteExistingPlayerDirectAsync(_tracked, ct);
            _tracked = null;
        }
    }

    /// <summary>
    /// Called by UoW.CommitAsync to contribute pending items to the transaction buffer.
    /// </summary>
    private Task FlushToTransactionAsync(List<TransactWriteItem> buffer, CancellationToken ct)
    {
        if (_pending is not null)
        {
            ContributeNewPlayer(buffer, _pending);
            _pending = null;
        }
        else if (_tracked is not null)
        {
            ContributeExistingPlayer(buffer, _tracked);
            _tracked = null;
        }

        return Task.CompletedTask;
    }

    private async Task WriteNewPlayerDirectAsync(Player player, CancellationToken ct)
    {
        var items = new List<TransactWriteItem>();
        ContributeNewPlayer(items, player);

        await _dynamoDb.TransactWriteItemsAsync(new TransactWriteItemsRequest
        {
            TransactItems = items,
        }, ct);
    }

    private async Task WriteExistingPlayerDirectAsync(Player player, CancellationToken ct)
    {
        var item = ToItem(player);
        var version = player.RowVersion;
        item[DynamoConstants.Version] = new() { N = (version + 1).ToString() };

        await _dynamoDb.PutItemAsync(new PutItemRequest
        {
            TableName = DynamoConstants.TableName,
            Item = item,
            ConditionExpression = $"{DynamoConstants.Version} = :v",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":v"] = new() { N = version.ToString() },
            },
        }, ct);

        player.RowVersion = version + 1;
    }

    private static void ContributeNewPlayer(List<TransactWriteItem> buffer, Player player)
    {
        buffer.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = DynamoConstants.TableName,
                Item = ToItem(player),
                ConditionExpression = "attribute_not_exists(PK)",
            },
        });
        buffer.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = DynamoConstants.TableName,
                Item = new Dictionary<string, AttributeValue>
                {
                    [DynamoConstants.Pk] = new(KeyHelpers.UsernamePk(player.Username)),
                    [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
                    [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.UsernameLookup),
                    ["PlayerId"] = new(player.Id.ToString()),
                },
            },
        });
        buffer.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = DynamoConstants.TableName,
                Item = new Dictionary<string, AttributeValue>
                {
                    [DynamoConstants.Pk] = new(KeyHelpers.UserPk(player.ApplicationUserId)),
                    [DynamoConstants.Sk] = new(DynamoConstants.PlayerLookupSk),
                    [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.PlayerLookup),
                    ["PlayerId"] = new(player.Id.ToString()),
                },
            },
        });
    }

    private static void ContributeExistingPlayer(List<TransactWriteItem> buffer, Player player)
    {
        var item = ToItem(player);
        var version = player.RowVersion;
        item[DynamoConstants.Version] = new() { N = (version + 1).ToString() };

        buffer.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = DynamoConstants.TableName,
                Item = item,
                ConditionExpression = $"{DynamoConstants.Version} = :v",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":v"] = new() { N = version.ToString() },
                },
            },
        });

        player.RowVersion = version + 1;

        // Update leaderboard items for each time control the player has games in
        ContributeLeaderboardItems(buffer, player);
    }

    private static void ContributeLeaderboardItems(List<TransactWriteItem> buffer, Player player)
    {
        var timeControls = new[]
        {
            (tc: TimeControl.Bullet, games: player.GamesBullet, rating: player.EloBullet),
            (tc: TimeControl.Blitz, games: player.GamesBlitz, rating: player.EloBlitz),
            (tc: TimeControl.Rapid, games: player.GamesRapid, rating: player.EloRapid),
        };

        foreach (var (tc, games, rating) in timeControls)
        {
            if (games <= 0) continue;

            buffer.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = DynamoConstants.TableName,
                    Item = new Dictionary<string, AttributeValue>
                    {
                        [DynamoConstants.Pk] = new(KeyHelpers.PlayerPk(player.Id)),
                        [DynamoConstants.Sk] = new(KeyHelpers.LeaderboardSk(tc)),
                        [DynamoConstants.Gsi1Pk] = new(KeyHelpers.LeaderboardGsi1Pk(tc)),
                        [DynamoConstants.Gsi1Sk] = new(KeyHelpers.LeaderboardGsi1Sk(rating, player.Id)),
                        [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.Leaderboard),
                        ["PlayerId"] = new(player.Id.ToString()),
                        ["Username"] = new(player.Username),
                        ["Title"] = new(player.Title.ToString()),
                        ["Rating"] = new() { N = rating.ToString() },
                        ["GamesPlayed"] = new() { N = games.ToString() },
                    },
                },
            });
        }
    }

    private static Dictionary<string, AttributeValue> ToItem(Player p)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            [DynamoConstants.Pk] = new(KeyHelpers.PlayerPk(p.Id)),
            [DynamoConstants.Sk] = new(DynamoConstants.ProfileSk),
            [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.Player),
            [DynamoConstants.Version] = new() { N = p.RowVersion.ToString() },
            ["Id"] = new(p.Id.ToString()),
            ["Username"] = new(p.Username),
            ["ApplicationUserId"] = new(p.ApplicationUserId),
            ["EloBullet"] = new() { N = p.EloBullet.ToString() },
            ["EloBlitz"] = new() { N = p.EloBlitz.ToString() },
            ["EloRapid"] = new() { N = p.EloRapid.ToString() },
            ["RdBullet"] = new() { N = p.RdBullet.ToString() },
            ["RdBlitz"] = new() { N = p.RdBlitz.ToString() },
            ["RdRapid"] = new() { N = p.RdRapid.ToString() },
            ["GamesBullet"] = new() { N = p.GamesBullet.ToString() },
            ["GamesBlitz"] = new() { N = p.GamesBlitz.ToString() },
            ["GamesRapid"] = new() { N = p.GamesRapid.ToString() },
            ["PeakEloBullet"] = new() { N = p.PeakEloBullet.ToString() },
            ["PeakEloBlitz"] = new() { N = p.PeakEloBlitz.ToString() },
            ["PeakEloRapid"] = new() { N = p.PeakEloRapid.ToString() },
            ["Title"] = new(p.Title.ToString()),
            ["CreatedAt"] = new(p.CreatedAt.ToString("O")),
            ["LastActiveAt"] = new(p.LastActiveAt.ToString("O")),
        };

        return item;
    }

    private static Player FromItem(Dictionary<string, AttributeValue> item) => new()
    {
        Id = Guid.Parse(item["Id"].S),
        Username = item["Username"].S,
        ApplicationUserId = item["ApplicationUserId"].S,
        EloBullet = int.Parse(item["EloBullet"].N),
        EloBlitz = int.Parse(item["EloBlitz"].N),
        EloRapid = int.Parse(item["EloRapid"].N),
        RdBullet = int.Parse(item["RdBullet"].N),
        RdBlitz = int.Parse(item["RdBlitz"].N),
        RdRapid = int.Parse(item["RdRapid"].N),
        GamesBullet = int.Parse(item["GamesBullet"].N),
        GamesBlitz = int.Parse(item["GamesBlitz"].N),
        GamesRapid = int.Parse(item["GamesRapid"].N),
        PeakEloBullet = int.Parse(item["PeakEloBullet"].N),
        PeakEloBlitz = int.Parse(item["PeakEloBlitz"].N),
        PeakEloRapid = int.Parse(item["PeakEloRapid"].N),
        Title = Enum.Parse<PlayerTitle>(item["Title"].S),
        CreatedAt = DateTime.ParseExact(item["CreatedAt"].S, "O", null, DateTimeStyles.RoundtripKind),
        LastActiveAt = DateTime.ParseExact(item["LastActiveAt"].S, "O", null, DateTimeStyles.RoundtripKind),
        RowVersion = item.TryGetValue(DynamoConstants.Version, out var v) ? uint.Parse(v.N) : 0,
    };

}
