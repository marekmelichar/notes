# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage — runs as the built-in 'app' user (UID 1654) on
# mcr.microsoft.com/dotnet/* images since .NET 8.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy published output with ownership pre-set so the non-root user can read
# it (and write next to it for temp files if the app ever needs to).
COPY --from=build --chown=app:app /app/publish .

# Pre-create the uploads directory with correct ownership. Fresh Docker
# volumes inherit this on first mount. For the existing production volume
# a one-time `chown -R 1654:1654 /app/uploads` is required after deploy —
# documented in the PR description.
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads

USER $APP_UID

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "EpoznamkyApi.dll"]
