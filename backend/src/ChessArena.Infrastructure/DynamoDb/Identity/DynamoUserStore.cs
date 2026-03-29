using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace ChessArena.Infrastructure.DynamoDb.Identity;

/// <summary>
/// DynamoDB-backed user store for ASP.NET Identity.
/// Stores USER#, USERNAME#, EMAIL# items in the chess-arena table.
/// </summary>
public sealed class DynamoUserStore(IAmazonDynamoDB dynamoDb) :
    IUserStore<ApplicationUser>,
    IUserPasswordStore<ApplicationUser>,
    IUserEmailStore<ApplicationUser>,
    IUserLockoutStore<ApplicationUser>,
    IUserSecurityStampStore<ApplicationUser>
{
    // ── IUserStore ──

    public async Task<IdentityResult> CreateAsync(ApplicationUser user, CancellationToken ct)
    {
        user.Id ??= Guid.NewGuid().ToString();
        user.SecurityStamp ??= Guid.NewGuid().ToString();

        ArgumentException.ThrowIfNullOrEmpty(user.NormalizedUserName, nameof(user.NormalizedUserName));
        ArgumentException.ThrowIfNullOrEmpty(user.NormalizedEmail, nameof(user.NormalizedEmail));

        var userItem = ToItem(user);
        var usernameItem = new Dictionary<string, AttributeValue>
        {
            [DynamoConstants.Pk] = new(KeyHelpers.UsernamePk(user.NormalizedUserName)),
            [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
            [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.UsernameLookup),
            ["ApplicationUserId"] = new(user.Id),
        };
        var emailItem = new Dictionary<string, AttributeValue>
        {
            [DynamoConstants.Pk] = new(KeyHelpers.EmailPk(user.NormalizedEmail)),
            [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
            [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.EmailLookup),
            ["ApplicationUserId"] = new(user.Id),
        };

        try
        {
            await dynamoDb.TransactWriteItemsAsync(new TransactWriteItemsRequest
            {
                TransactItems =
                [
                    new TransactWriteItem
                    {
                        Put = new Put
                        {
                            TableName = DynamoConstants.TableName,
                            Item = userItem,
                            ConditionExpression = "attribute_not_exists(PK)",
                        },
                    },
                    new TransactWriteItem
                    {
                        Put = new Put
                        {
                            TableName = DynamoConstants.TableName,
                            Item = usernameItem,
                            ConditionExpression = "attribute_not_exists(PK)",
                        },
                    },
                    new TransactWriteItem
                    {
                        Put = new Put
                        {
                            TableName = DynamoConstants.TableName,
                            Item = emailItem,
                            ConditionExpression = "attribute_not_exists(PK)",
                        },
                    },
                ],
            }, ct);
        }
        catch (TransactionCanceledException ex)
            when (ex.CancellationReasons.Any(r => r.Code == "ConditionalCheckFailed"))
        {
            return IdentityResult.Failed(new IdentityError
            {
                Code = "DuplicateUser",
                Description = "Username or email is already taken.",
            });
        }

        return IdentityResult.Success;
    }

    public async Task<IdentityResult> UpdateAsync(ApplicationUser user, CancellationToken ct)
    {
        await dynamoDb.PutItemAsync(new PutItemRequest
        {
            TableName = DynamoConstants.TableName,
            Item = ToItem(user),
        }, ct);

        return IdentityResult.Success;
    }

    public async Task<IdentityResult> DeleteAsync(ApplicationUser user, CancellationToken ct)
    {
        var transactItems = new List<TransactWriteItem>
        {
            new()
            {
                Delete = new Delete
                {
                    TableName = DynamoConstants.TableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        [DynamoConstants.Pk] = new(KeyHelpers.UserPk(user.Id)),
                        [DynamoConstants.Sk] = new(DynamoConstants.ProfileSk),
                    },
                },
            },
        };

        if (user.NormalizedUserName is not null)
        {
            transactItems.Add(new TransactWriteItem
            {
                Delete = new Delete
                {
                    TableName = DynamoConstants.TableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        [DynamoConstants.Pk] = new(KeyHelpers.UsernamePk(user.NormalizedUserName)),
                        [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
                    },
                },
            });
        }

        if (user.NormalizedEmail is not null)
        {
            transactItems.Add(new TransactWriteItem
            {
                Delete = new Delete
                {
                    TableName = DynamoConstants.TableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        [DynamoConstants.Pk] = new(KeyHelpers.EmailPk(user.NormalizedEmail)),
                        [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
                    },
                },
            });
        }

        await dynamoDb.TransactWriteItemsAsync(new TransactWriteItemsRequest
        {
            TransactItems = transactItems,
        }, ct);

        return IdentityResult.Success;
    }

    public async Task<ApplicationUser?> FindByIdAsync(string userId, CancellationToken ct)
    {
        var response = await dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = new Dictionary<string, AttributeValue>
            {
                [DynamoConstants.Pk] = new(KeyHelpers.UserPk(userId)),
                [DynamoConstants.Sk] = new(DynamoConstants.ProfileSk),
            },
        }, ct);

        return response.IsItemSet ? FromItem(response.Item) : null;
    }

    public async Task<ApplicationUser?> FindByNameAsync(string normalizedUserName, CancellationToken ct)
    {
        var lookupResponse = await dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = new Dictionary<string, AttributeValue>
            {
                [DynamoConstants.Pk] = new(KeyHelpers.UsernamePk(normalizedUserName)),
                [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
            },
        }, ct);

        if (!lookupResponse.IsItemSet)
            return null;

        var userId = lookupResponse.Item["ApplicationUserId"].S;
        return await FindByIdAsync(userId, ct);
    }

    public Task<string?> GetNormalizedUserNameAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.NormalizedUserName);

    public Task<string> GetUserIdAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.Id);

    public Task<string?> GetUserNameAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.UserName);

    public Task SetNormalizedUserNameAsync(ApplicationUser user, string? normalizedName, CancellationToken ct)
    {
        user.NormalizedUserName = normalizedName;
        return Task.CompletedTask;
    }

    public Task SetUserNameAsync(ApplicationUser user, string? userName, CancellationToken ct)
    {
        user.UserName = userName;
        return Task.CompletedTask;
    }

    // ── IUserPasswordStore ──

    public Task SetPasswordHashAsync(ApplicationUser user, string? passwordHash, CancellationToken ct)
    {
        user.PasswordHash = passwordHash;
        return Task.CompletedTask;
    }

    public Task<string?> GetPasswordHashAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.PasswordHash);

    public Task<bool> HasPasswordAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.PasswordHash is not null);

    // ── IUserEmailStore ──

    public Task SetEmailAsync(ApplicationUser user, string? email, CancellationToken ct)
    {
        user.Email = email;
        return Task.CompletedTask;
    }

    public Task<string?> GetEmailAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.Email);

    public Task<bool> GetEmailConfirmedAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.EmailConfirmed);

    public Task SetEmailConfirmedAsync(ApplicationUser user, bool confirmed, CancellationToken ct)
    {
        user.EmailConfirmed = confirmed;
        return Task.CompletedTask;
    }

    public async Task<ApplicationUser?> FindByEmailAsync(string normalizedEmail, CancellationToken ct)
    {
        var lookupResponse = await dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = DynamoConstants.TableName,
            Key = new Dictionary<string, AttributeValue>
            {
                [DynamoConstants.Pk] = new(KeyHelpers.EmailPk(normalizedEmail)),
                [DynamoConstants.Sk] = new(DynamoConstants.LookupSk),
            },
        }, ct);

        if (!lookupResponse.IsItemSet)
            return null;

        var userId = lookupResponse.Item["ApplicationUserId"].S;
        return await FindByIdAsync(userId, ct);
    }

    public Task<string?> GetNormalizedEmailAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.NormalizedEmail);

    public Task SetNormalizedEmailAsync(ApplicationUser user, string? normalizedEmail, CancellationToken ct)
    {
        user.NormalizedEmail = normalizedEmail;
        return Task.CompletedTask;
    }

    // ── IUserLockoutStore ──

    public Task<DateTimeOffset?> GetLockoutEndDateAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.LockoutEnd);

    public Task SetLockoutEndDateAsync(ApplicationUser user, DateTimeOffset? lockoutEnd, CancellationToken ct)
    {
        user.LockoutEnd = lockoutEnd;
        return Task.CompletedTask;
    }

    public Task<int> GetAccessFailedCountAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.AccessFailedCount);

    public Task<bool> GetLockoutEnabledAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.LockoutEnabled);

    public Task SetLockoutEnabledAsync(ApplicationUser user, bool enabled, CancellationToken ct)
    {
        user.LockoutEnabled = enabled;
        return Task.CompletedTask;
    }

    public Task<int> IncrementAccessFailedCountAsync(ApplicationUser user, CancellationToken ct)
    {
        user.AccessFailedCount++;
        return Task.FromResult(user.AccessFailedCount);
    }

    public Task ResetAccessFailedCountAsync(ApplicationUser user, CancellationToken ct)
    {
        user.AccessFailedCount = 0;
        return Task.CompletedTask;
    }

    // ── IUserSecurityStampStore ──

    public Task SetSecurityStampAsync(ApplicationUser user, string stamp, CancellationToken ct)
    {
        user.SecurityStamp = stamp;
        return Task.CompletedTask;
    }

    public Task<string?> GetSecurityStampAsync(ApplicationUser user, CancellationToken ct) =>
        Task.FromResult(user.SecurityStamp);

    // ── Serialization ──

    private static Dictionary<string, AttributeValue> ToItem(ApplicationUser user)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            [DynamoConstants.Pk] = new(KeyHelpers.UserPk(user.Id)),
            [DynamoConstants.Sk] = new(DynamoConstants.ProfileSk),
            [DynamoConstants.EntityType] = new(DynamoConstants.EntityTypes.ApplicationUser),
            ["Id"] = new(user.Id),
        };

        if (user.UserName is not null) item["UserName"] = new(user.UserName);
        if (user.NormalizedUserName is not null) item["NormalizedUserName"] = new(user.NormalizedUserName);
        if (user.Email is not null) item["Email"] = new(user.Email);
        if (user.NormalizedEmail is not null) item["NormalizedEmail"] = new(user.NormalizedEmail);
        item["EmailConfirmed"] = new() { BOOL = user.EmailConfirmed };
        if (user.PasswordHash is not null) item["PasswordHash"] = new(user.PasswordHash);
        if (user.SecurityStamp is not null) item["SecurityStamp"] = new(user.SecurityStamp);
        if (user.ConcurrencyStamp is not null) item["ConcurrencyStamp"] = new(user.ConcurrencyStamp);
        item["LockoutEnabled"] = new() { BOOL = user.LockoutEnabled };
        item["AccessFailedCount"] = new() { N = user.AccessFailedCount.ToString() };

        if (user.LockoutEnd.HasValue)
            item["LockoutEnd"] = new(user.LockoutEnd.Value.ToString("O"));

        if (user.PlayerId.HasValue)
            item["PlayerId"] = new(user.PlayerId.Value.ToString());

        return item;
    }

    private static ApplicationUser FromItem(Dictionary<string, AttributeValue> item)
    {
        var user = new ApplicationUser
        {
            Id = item["Id"].S,
            EmailConfirmed = item.TryGetValue("EmailConfirmed", out var ec) && ec.BOOL == true,
            LockoutEnabled = item.TryGetValue("LockoutEnabled", out var le) && le.BOOL == true,
            AccessFailedCount = item.TryGetValue("AccessFailedCount", out var afc) ? int.Parse(afc.N) : 0,
        };

        if (item.TryGetValue("UserName", out var un)) user.UserName = un.S;
        if (item.TryGetValue("NormalizedUserName", out var nun)) user.NormalizedUserName = nun.S;
        if (item.TryGetValue("Email", out var em)) user.Email = em.S;
        if (item.TryGetValue("NormalizedEmail", out var ne)) user.NormalizedEmail = ne.S;
        if (item.TryGetValue("PasswordHash", out var ph)) user.PasswordHash = ph.S;
        if (item.TryGetValue("SecurityStamp", out var ss)) user.SecurityStamp = ss.S;
        if (item.TryGetValue("ConcurrencyStamp", out var cs)) user.ConcurrencyStamp = cs.S;
        if (item.TryGetValue("LockoutEnd", out var lo))
            user.LockoutEnd = DateTimeOffset.ParseExact(lo.S, "O", null, System.Globalization.DateTimeStyles.RoundtripKind);
        if (item.TryGetValue("PlayerId", out var pid))
            user.PlayerId = Guid.Parse(pid.S);

        return user;
    }

    public void Dispose() { }
}
