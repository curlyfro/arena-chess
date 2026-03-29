using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.DynamoDb.Repositories;

public sealed class DynamoPreferencesRepository(IAmazonDynamoDB dynamoDb) : IPreferencesRepository
{
    public async Task<(string? json, int version)> GetAsync(Guid playerId, CancellationToken ct = default)
    {
        var response = await dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = KeyHelpers.Key(KeyHelpers.PlayerPk(playerId), DynamoConstants.PreferencesSk),
        }, ct);

        if (!response.IsItemSet)
            return (null, 0);

        var json = response.Item.TryGetValue("Data", out var data) ? data.S : null;
        var version = response.Item.TryGetValue(DynamoConstants.Version, out var v) ? int.Parse(v.N) : 0;

        return (json, version);
    }

    public async Task SaveAsync(Guid playerId, string json, int expectedVersion, CancellationToken ct = default)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            [DynamoConstants.Pk] = new(KeyHelpers.PlayerPk(playerId)),
            [DynamoConstants.Sk] = new(DynamoConstants.PreferencesSk),
            [DynamoConstants.EntityType] = new("Preferences"),
            [DynamoConstants.Version] = new() { N = (expectedVersion + 1).ToString() },
            ["Data"] = new(json),
        };

        var conditionExpression = expectedVersion == 0
            ? $"attribute_not_exists({DynamoConstants.Pk})"
            : $"{DynamoConstants.Version} = :v";

        var request = new PutItemRequest
        {
            TableName = DynamoConstants.TableName,
            Item = item,
            ConditionExpression = conditionExpression,
        };

        if (expectedVersion > 0)
        {
            request.ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":v"] = new() { N = expectedVersion.ToString() },
            };
        }

        await dynamoDb.PutItemAsync(request, ct);
    }
}
