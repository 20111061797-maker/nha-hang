# Restaurant Management

Production-ready ASP.NET Core Web API foundation for a restaurant management system. This step establishes the platform only; restaurant business modules are intentionally not included.

## Architecture

The solution follows Clean Architecture and dependency inversion:

`Domain <- Application <- Infrastructure <- API`

- **Domain**: entities, value objects, enums, domain contracts and `BaseEntity`.
- **Application**: CQRS-ready MediatR pipeline, FluentValidation, application contracts and feature folders.
- **Infrastructure**: EF Core/PostgreSQL, migrations, JWT configuration, Redis connection and external services.
- **API**: HTTP concerns, controllers, Swagger, middleware, authentication, CORS, health checks and SignalR endpoint hosting.
- **Tests**: focused Domain and API foundation tests.

## Technology Stack

- .NET 10 and C# with nullable reference types
- ASP.NET Core Web API and Swagger/OpenAPI
- Entity Framework Core 10 with Npgsql PostgreSQL provider
- MediatR and FluentValidation
- JWT Bearer authentication infrastructure
- PostgreSQL 17 and Redis 7 via Docker Compose
- SignalR infrastructure, with no realtime business features yet
- xUnit and FluentAssertions

## Requirements

- .NET SDK 10
- PostgreSQL 17 or Docker Desktop
- Redis 7 or Docker Desktop
- Optional: `dotnet-ef` tool for migrations

## Local Development

From the repository root:

```bash
export ConnectionStrings__DefaultConnection='Host=localhost;Port=5432;Database=restaurant_management;Username=postgres;Password=postgres'
export ConnectionStrings__Redis='localhost:6379'
export Jwt__SecretKey='use-a-long-random-development-secret'
dotnet restore
dotnet build RestaurantManagement.sln
dotnet test RestaurantManagement.sln
dotnet run --project src/RestaurantManagement.API
```

Swagger is available at `https://localhost:<https-port>/swagger` in Development. The health response is available at `/api/health`, and the infrastructure health probe is `/healthz`.

For local development, prefer `dotnet user-secrets` for the JWT secret instead of storing it in a file:

```bash
dotnet user-secrets --project src/RestaurantManagement.API init
dotnet user-secrets --project src/RestaurantManagement.API set Jwt:SecretKey 'use-a-long-random-development-secret'
```

## Docker

The default Compose configuration starts the API, PostgreSQL and Redis. Only the API is published to the host:

```bash
docker compose up --build
```

- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger`
- Health: `http://localhost:8080/api/health`

Set production values in a local `.env` file (which is ignored by Git):

```dotenv
POSTGRES_DB=restaurant_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-me
JWT_SECRET_KEY=replace-me-with-a-long-random-secret
```

PostgreSQL data is stored in the `postgres_data` named volume. Redis uses `redis_data` so the infrastructure is ready for future caching, but no caching is implemented.

## EF Core Migrations

Install the tool once:

```bash
dotnet tool install --global dotnet-ef --version 10.0.12
```

Create and apply a migration:

```bash
dotnet ef migrations add InitialCreate \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API \
  --output-dir Persistence/Migrations

dotnet ef database update \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API
```

No restaurant-specific tables are defined yet, so the initial migration is intentionally empty until the domain is designed.

## Environment Variables

Configuration uses the standard ASP.NET Core environment-variable mapping:

- `ConnectionStrings__DefaultConnection`
- `ConnectionStrings__Redis`
- `Jwt__SecretKey`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__ExpirationMinutes`
- `Jwt__RefreshTokenExpirationDays`
- `Cors__AllowedOrigins__0`

Passwords, JWT secrets and customer data must not be logged. JSON console logging is enabled for structured request and exception logs.

## Project Structure

```text
RestaurantManagement/
├── RestaurantManagement.sln
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── RestaurantManagement.API/
│   │   ├── Controllers/
│   │   ├── Extensions/
│   │   ├── Filters/
│   │   ├── Hubs/
│   │   └── Middleware/
│   ├── RestaurantManagement.Application/
│   │   ├── Behaviors/
│   │   ├── Common/
│   │   └── Features/
│   ├── RestaurantManagement.Domain/
│   │   ├── Common/
│   │   ├── Entities/
│   │   ├── Enums/
│   │   ├── Interfaces/
│   │   └── ValueObjects/
│   └── RestaurantManagement.Infrastructure/
│       ├── Authentication/
│       ├── Persistence/
│       ├── Repositories/
│       └── Services/
└── tests/
    └── RestaurantManagement.Tests/
```

## Current TODOs

- Add authentication commands, users and refresh-token persistence.
- Design restaurant-specific entities and feature modules.
- Add production observability/exporters and database readiness checks.
- Add authorization policies and integration tests with containerized dependencies.

## Authentication

Authentication uses JWT bearer access tokens and hashed, rotating refresh tokens.

Endpoints:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Access tokens are short-lived. Refresh tokens are stored only as SHA-256 hashes, expire, can be revoked, and rotate on every refresh. Reuse of a revoked token invalidates its token family.

Swagger supports JWT testing. Call `/api/auth/login`, copy the returned access token, click **Authorize**, and enter `Bearer <access-token>`.

Authorization is database-driven through `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`. Dynamic permission policies use the `permission:<code>` policy name and the `RequirePermissionAttribute`.

For development, configure the seed administrator through environment variables:

```bash
export JWT_SECRET_KEY='a-long-random-secret-at-least-32-characters'
export ADMIN_USERNAME='admin'
export ADMIN_EMAIL='admin@example.com'
export ADMIN_PASSWORD='ChangeThisPassword123!'
```

The seed is idempotent. It creates system roles and permissions and creates the administrator only when all three admin variables are configured. Passwords, password hashes, access tokens and refresh tokens are never logged.

To create development accounts for every operational role, enable demo users with one shared password through environment variables:

```bash
export DEMO_USERS_ENABLED=true
export DEMO_USERS_PASSWORD='DemoPassword123!'
docker compose up -d --build api
```

The following accounts are then available:

```text
owner@example.com    Owner
manager@example.com  Manager
cashier@example.com  Cashier
waiter@example.com   Waiter
kitchen@example.com  Kitchen
delivery@example.com Delivery
```

The usernames are `owner`, `manager`, `cashier`, `waiter`, `kitchen` and `delivery`. The demo password is never stored in source code or logs. Disable the accounts after development with `DEMO_USERS_ENABLED=false` and use real managed accounts for production.

Authentication-related migration:

```bash
dotnet ef database update \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API
```

The migration is named `AddAuthenticationAndAuthorization`.

## Branch, Area and Dining Table Management

Step 4 adds branch-scoped management for branches, areas and dining tables. Controllers are thin; business rules, branch isolation, status transitions and audit writes live in the application/infrastructure service boundary.

Endpoints:

- `GET/POST /api/branches`
- `GET/PUT /api/branches/{id}`
- `PATCH /api/branches/{id}/status`
- `GET/POST /api/branches/{branchId}/areas`
- `GET/PUT/PATCH /api/areas/{id}`
- `GET/POST /api/branches/{branchId}/tables`
- `GET/PUT /api/tables/{id}`
- `PATCH /api/tables/{id}/status`
- `PATCH /api/tables/{id}/active-status`
- `GET /api/public/tables/{qrCodeIdentifier}`

The public QR endpoint returns only branch name, area name and table display information. It does not expose internal IDs, users, credentials or audit data.

Branch and area access is checked server-side. Administrators can access all branches. Other users need an active `user_branch_access` mapping or an active employee assignment for the branch. Client-supplied branch identifiers are never trusted without checking the resource relationship.

Table status changes append to `table_status_histories` with old status, new status, actor, reason and UTC creation time. Order/POS workflows do not control table status yet.

Step 4 migration:

```bash
dotnet ef database update \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API
```

The migration is named `AddBranchAreaTableManagement`.

## Category, Product and Menu Management

Step 5 adds global catalog management and branch-specific selling configuration. Categories, products, variants and images are global catalog records. `branch_products` stores each branch's selling price, active state and availability.

Endpoints:

- `GET/POST /api/categories`
- `GET/PUT /api/categories/{id}`
- `PATCH /api/categories/{id}/status`
- `GET/POST /api/products`
- `GET/PUT /api/products/{id}`
- `PATCH /api/products/{id}/status`
- `PUT /api/products/{id}/categories`
- `GET/POST /api/products/{productId}/variants`
- `GET/PUT/PATCH /api/product-variants/{id}`
- `GET/POST /api/products/{productId}/images`
- `PUT/DELETE /api/product-images/{id}`
- `GET/POST /api/branches/{branchId}/products`
- `GET/PUT /api/branch-products/{id}`
- `PATCH /api/branch-products/{id}/status`
- `PATCH /api/branch-products/{id}/availability`
- `GET /api/branches/{branchId}/menu`

The menu query returns only active categories, active products, active branch mappings and available branch products. Inactive variants are excluded. Branch access is checked server-side before branch product and menu reads.

Step 5 migration:

```bash
dotnet ef database update \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API
```

The migration is named `AddCategoryProductMenuManagement`.

## Modifier, Combo and Pricing Management

Step 6 completes the existing modifier/combo tables from the original schema. No duplicate tables were created.

Endpoints:

- `GET/POST /api/modifier-groups`
- `GET/PUT /api/modifier-groups/{id}`
- `PATCH /api/modifier-groups/{id}/status`
- `GET/POST /api/modifier-groups/{groupId}/modifiers`
- `GET/PUT/PATCH /api/modifiers/{id}`
- `GET/PUT /api/products/{productId}/modifier-groups`
- `GET/POST /api/combos`
- `GET/PUT /api/combos/{id}`
- `PATCH /api/combos/{id}/status`
- `PUT /api/combos/{id}/items`
- `POST /api/pricing/product`

Modifier groups enforce selection limits on the server. Modifier prices are global by default, with the existing `product_modifier_options.price_override` available for product-specific pricing. Combos have independent catalog prices and relational combo items. Combo menu visibility also requires every item to be active and available in the requested branch.

The pricing service calculates base product/variant price plus selected modifier prices. It does not implement promotions, vouchers, taxes, discounts, orders or payments.

Step 6 migration:

```bash
dotnet ef database update \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API
```

The migration is named `AddModifierComboPricingManagement`.

## Order / POS Management

Step 7 adds command-oriented order management without implementing payments, kitchen, inventory deduction, promotions, customers or delivery workflows.

Endpoints:

- `POST /api/orders`
- `GET /api/orders/{id}`
- `GET /api/branches/{branchId}/orders`
- `POST /api/orders/{orderId}/items`
- `PUT /api/orders/{orderId}/items/{itemId}`
- `DELETE /api/orders/{orderId}/items/{itemId}`
- `PATCH /api/orders/{id}/status`
- `POST /api/orders/{id}/confirm`
- `POST /api/orders/{id}/complete`
- `POST /api/orders/{id}/cancel`

Order item prices are calculated server-side by reusing `IProductPricingService`. Product, variant, modifier and combo names/prices are snapshotted into order records. Order totals currently use `subtotal = total`, with discount and tax set to zero until later modules exist.

Dine-in orders validate branch/table ownership, allocate the table and mark it occupied. Completion or cancellation releases the allocation. Historical orders remain stored; no table/order uniqueness constraint prevents future historical orders.

Order updates support optimistic concurrency through the `orders.version` token and return `409 Conflict` when the supplied expected version is stale.

Step 7 migration:

```bash
dotnet ef database update \
  --project src/RestaurantManagement.Infrastructure \
  --startup-project src/RestaurantManagement.API
```

The migration is named `AddOrderPosManagement`.