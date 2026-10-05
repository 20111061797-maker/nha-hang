using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Features.Customers;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class CustomerManagementService(RestaurantDbContext dbContext) : ICustomerManagementService
{
    private async Task EnsureMembershipLevelsAsync(CancellationToken ct)
    {
        if (await dbContext.CustomerMembershipLevels.AnyAsync(ct)) return;

        var levels = new[]
        {
            new CustomerMembershipLevel { Code = "BRONZE", Name = "Hạng Đồng", MinimumPoints = 0 },
            new CustomerMembershipLevel { Code = "SILVER", Name = "Hạng Bạc", MinimumPoints = 100 },
            new CustomerMembershipLevel { Code = "GOLD", Name = "Hạng Vàng", MinimumPoints = 300 },
            new CustomerMembershipLevel { Code = "DIAMOND", Name = "Hạng Kim Cương", MinimumPoints = 600 }
        };

        dbContext.CustomerMembershipLevels.AddRange(levels);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<MembershipLevelDto>> GetMembershipLevelsAsync(CancellationToken ct)
    {
        await EnsureMembershipLevelsAsync(ct);
        var levels = await dbContext.CustomerMembershipLevels
            .OrderBy(x => x.MinimumPoints)
            .ToListAsync(ct);

        return levels.Select(x => new MembershipLevelDto(x.Id, x.Code, x.Name, x.MinimumPoints)).ToList();
    }

    public async Task<IReadOnlyList<CustomerListItem>> GetCustomersAsync(string? search, CancellationToken ct)
    {
        await EnsureMembershipLevelsAsync(ct);

        var query = dbContext.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c => c.FullName.ToLower().Contains(s) || c.Phone.Contains(s) || (c.Email != null && c.Email.ToLower().Contains(s)));
        }

        var customers = await query.OrderByDescending(c => c.CreatedAt).ToListAsync(ct);
        var customerIds = customers.Select(c => c.Id).ToList();

        var loyaltyAccounts = await dbContext.CustomerLoyaltyAccounts
            .AsNoTracking()
            .Where(a => customerIds.Contains(a.CustomerId))
            .ToListAsync(ct);

        var levels = await dbContext.CustomerMembershipLevels.AsNoTracking().ToListAsync(ct);
        var levelMap = levels.ToDictionary(l => l.Id, l => l);

        var orderStats = await dbContext.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId != null && customerIds.Contains(o.CustomerId.Value) && o.Status != OrderStatus.Cancelled)
            .GroupBy(o => o.CustomerId!.Value)
            .Select(g => new
            {
                CustomerId = g.Key,
                Count = g.Count(),
                TotalSpent = g.Sum(o => o.TotalAmount)
            })
            .ToDictionaryAsync(x => x.CustomerId, ct);

        return customers.Select(c =>
        {
            var account = loyaltyAccounts.FirstOrDefault(a => a.CustomerId == c.Id);
            var balance = account?.Balance ?? 0;
            var level = levels.OrderByDescending(l => l.MinimumPoints).FirstOrDefault(l => balance >= l.MinimumPoints) ?? levels.FirstOrDefault();
            var stats = orderStats.TryGetValue(c.Id, out var s) ? s : null;

            return new CustomerListItem(
                c.Id,
                c.FullName,
                c.Phone,
                c.Email,
                c.IsActive,
                level?.Code ?? "BRONZE",
                level?.Name ?? "Hạng Đồng",
                account?.Balance ?? 0,
                stats?.Count ?? 0,
                stats?.TotalSpent ?? 0m,
                c.CreatedAt
            );
        }).ToList();
    }

    public async Task<CustomerDetails?> GetCustomerAsync(Guid id, CancellationToken ct)
    {
        await EnsureMembershipLevelsAsync(ct);

        var customer = await dbContext.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null) return null;

        var account = await dbContext.CustomerLoyaltyAccounts.AsNoTracking().FirstOrDefaultAsync(a => a.CustomerId == id, ct);
        var levels = await dbContext.CustomerMembershipLevels.AsNoTracking().OrderBy(x => x.MinimumPoints).ToListAsync(ct);
        var balance = account?.Balance ?? 0;
        var level = levels.OrderByDescending(l => l.MinimumPoints).FirstOrDefault(l => balance >= l.MinimumPoints) ?? levels.FirstOrDefault();

        var orderStats = await dbContext.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == id && o.Status != OrderStatus.Cancelled)
            .GroupBy(o => o.CustomerId!.Value)
            .Select(g => new
            {
                Count = g.Count(),
                TotalSpent = g.Sum(o => o.TotalAmount)
            })
            .FirstOrDefaultAsync(ct);

        var transactions = account != null
            ? await dbContext.CustomerPointTransactions
                .AsNoTracking()
                .Where(t => t.LoyaltyAccountId == account.Id)
                .OrderByDescending(t => t.CreatedAt)
                .Take(20)
                .Select(t => new CustomerPointTransactionDetails(t.Id, t.OrderId, t.PointsDelta, t.Reason, t.CreatedAt))
                .ToListAsync(ct)
            : new List<CustomerPointTransactionDetails>();

        return new CustomerDetails(
            customer.Id,
            customer.FullName,
            customer.Phone,
            customer.Email,
            customer.IsActive,
            level?.Code ?? "BRONZE",
            level?.Name ?? "Hạng Đồng",
            account?.Balance ?? 0,
            orderStats?.Count ?? 0,
            orderStats?.TotalSpent ?? 0m,
            customer.CreatedAt,
            transactions
        );
    }

    public async Task<CustomerDetails> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken ct)
    {
        await EnsureMembershipLevelsAsync(ct);

        var customer = new Customer
        {
            FullName = request.FullName.Trim(),
            Phone = request.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            IsActive = true
        };

        dbContext.Customers.Add(customer);

        if (!string.IsNullOrWhiteSpace(request.Address))
        {
            dbContext.CustomerAddresses.Add(new CustomerAddress
            {
                CustomerId = customer.Id,
                RecipientName = customer.FullName,
                RecipientPhone = customer.Phone,
                AddressLine = request.Address.Trim(),
                IsDefault = true
            });
        }

        var levels = await dbContext.CustomerMembershipLevels.OrderByDescending(x => x.MinimumPoints).ToListAsync(ct);
        var eligibleLevel = levels.FirstOrDefault(l => request.InitialPoints >= l.MinimumPoints) ?? levels.Last();

        var account = new CustomerLoyaltyAccount
        {
            CustomerId = customer.Id,
            MembershipLevelId = eligibleLevel.Id,
            Balance = Math.Max(0, request.InitialPoints)
        };
        dbContext.CustomerLoyaltyAccounts.Add(account);

        if (request.InitialPoints > 0)
        {
            dbContext.CustomerPointTransactions.Add(new CustomerPointTransaction
            {
                LoyaltyAccountId = account.Id,
                PointsDelta = request.InitialPoints,
                Reason = "Điểm thưởng đăng ký thành viên mới"
            });
        }

        await dbContext.SaveChangesAsync(ct);
        return (await GetCustomerAsync(customer.Id, ct))!;
    }

    public async Task<CustomerDetails?> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request, CancellationToken ct)
    {
        var customer = await dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null) return null;

        customer.FullName = request.FullName.Trim();
        customer.Phone = request.Phone.Trim();
        customer.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        customer.IsActive = request.IsActive;

        await dbContext.SaveChangesAsync(ct);
        return await GetCustomerAsync(id, ct);
    }

    public async Task<CustomerDetails?> AdjustPointsAsync(Guid id, AdjustCustomerPointsRequest request, CancellationToken ct)
    {
        var account = await dbContext.CustomerLoyaltyAccounts.FirstOrDefaultAsync(a => a.CustomerId == id, ct);
        if (account is null) return null;

        account.Balance = Math.Max(0, account.Balance + request.PointsDelta);

        // Check if member level up
        var levels = await dbContext.CustomerMembershipLevels.OrderByDescending(x => x.MinimumPoints).ToListAsync(ct);
        var eligible = levels.FirstOrDefault(l => account.Balance >= l.MinimumPoints) ?? levels.Last();
        account.MembershipLevelId = eligible.Id;

        dbContext.CustomerPointTransactions.Add(new CustomerPointTransaction
        {
            LoyaltyAccountId = account.Id,
            OrderId = request.OrderId,
            PointsDelta = request.PointsDelta,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? "Điều chỉnh điểm tích lũy" : request.Reason.Trim()
        });

        await dbContext.SaveChangesAsync(ct);
        return await GetCustomerAsync(id, ct);
    }
}
