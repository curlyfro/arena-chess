using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Infrastructure.Auth;
using ChessArena.Infrastructure.Data.Entities;

namespace ChessArena.Infrastructure.DynamoDb.Auth;

public sealed class DynamoRefreshTokenStore(IAmazonDynamoDB dynamoDb) : IRefreshTokenStore
{
    private RefreshToken? _pending;

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        var response = await dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = new Dictionary<string, AttributeValue>
            {
                [DynamoConstants.Pk] = new(KeyHelpers.TokenPk(tokenHash)),
                [DynamoConstants.Sk] = new(DynamoConstants.RefreshSk),
            },
        }, ct);

        if (!response.IsItemSet)
            return null;

        return FromItem(response.Item);
    }

    public Task AddAsync(RefreshToken token, CancellationToken ct = default)
    {
        _pending = token;
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        if (_pending is not null)
        {
            await PutTokenAsync(_pending, ct);
            _pending = null;
        }
    }

    private async Task PutTokenAsync(RefreshToken token, CancellationToken ct)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            [DynamoConstants.Pk] = new(KeyHelpers.TokenPk(token.TokenHash)),
            [DynamoConstants.Sk] = new(DynamoConstants.RefreshSk),
            [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.RefreshToken),
            ["Id"] = new(token.Id.ToString()),
            ["UserId"] = new(token.UserId),
            ["TokenHash"] = new(token.TokenHash),
            ["ExpiresAt"] = new(token.ExpiresAt.ToString("O")),
            ["CreatedAt"] = new(token.CreatedAt.ToString("O")),
            [DynamoConstants.Ttl] = new() { N = KeyHelpers.ToTtlEpoch(token.ExpiresAt).ToString() },
        };

        if (token.RevokedAt.HasValue)
            item["RevokedAt"] = new(token.RevokedAt.Value.ToString("O"));

        await dynamoDb.PutItemAsync(new PutItemRequest
        {
            TableName = DynamoConstants.TableName,
            Item = item,
        }, ct);
    }

    private static RefreshToken FromItem(Dictionary<string, AttributeValue> item) => new()
    {
        Id = Guid.Parse(item["Id"].S),
        UserId = item["UserId"].S,
        TokenHash = item["TokenHash"].S,
        ExpiresAt = DateTime.ParseExact(item["ExpiresAt"].S, "O", null, System.Globalization.DateTimeStyles.RoundtripKind),
        CreatedAt = DateTime.ParseExact(item["CreatedAt"].S, "O", null, System.Globalization.DateTimeStyles.RoundtripKind),
        RevokedAt = item.TryGetValue("RevokedAt", out var ra)
            ? DateTime.ParseExact(ra.S, "O", null, System.Globalization.DateTimeStyles.RoundtripKind)
            : null,
    };
}
