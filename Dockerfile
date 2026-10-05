FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["RestaurantManagement.sln", "."]
COPY ["src/RestaurantManagement.API/RestaurantManagement.API.csproj", "src/RestaurantManagement.API/"]
COPY ["src/RestaurantManagement.Application/RestaurantManagement.Application.csproj", "src/RestaurantManagement.Application/"]
COPY ["src/RestaurantManagement.Domain/RestaurantManagement.Domain.csproj", "src/RestaurantManagement.Domain/"]
COPY ["src/RestaurantManagement.Infrastructure/RestaurantManagement.Infrastructure.csproj", "src/RestaurantManagement.Infrastructure/"]
RUN dotnet restore "src/RestaurantManagement.API/RestaurantManagement.API.csproj"
COPY . .
RUN dotnet publish "src/RestaurantManagement.API/RestaurantManagement.API.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 curl && rm -rf /var/lib/apt/lists/*
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RestaurantManagement.API.dll"]