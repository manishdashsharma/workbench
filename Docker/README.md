# Docker Setup for Workbench

This directory contains Docker configuration for running PostgreSQL and Redis locally.

## Services

- **postgres-primary**: PostgreSQL 16 on port 5432 (write database)
- **postgres-read**: PostgreSQL 16 on port 5433 (read replica)
- **redis**: Redis 7 on port 6379 with password authentication
- **workbench-server**: Node.js application on port 5000

## Prerequisites

Create the external proxy network if it doesn't exist:

```bash
docker network create proxy-network
```

## Quick Start

### Start All Services (Databases + Application)

```bash
cd Docker
cp .env.example .env
# Edit .env and set:
# - JWT_SECRET (required)
# - JWT_REFRESH_SECRET (required)
# - RESEND_API_KEY (optional, for email)
# - RESEND_FROM_EMAIL (optional, for email)
docker-compose up -d
```

Note: Database connection strings are automatically configured to use the internal Docker network hostnames.

This will start:
- PostgreSQL Primary (port 5432)
- PostgreSQL Read Replica (port 5433)
- Redis (port 6379)
- Workbench Application (port 5000)

### Start Databases Only

```bash
cd Docker
docker-compose up -d postgres-primary postgres-read redis
```

### View Application Logs

```bash
docker-compose logs -f workbench-server
```

## Stop Services

```bash
docker-compose down
```

## Stop and Remove Data

```bash
docker-compose down -v
```

## View Logs

```bash
docker-compose logs -f
```

## Check Status

```bash
docker-compose ps
```

## Connection Details

### PostgreSQL Primary (Write)
- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres123
- Database: mydb
- Connection String: `postgresql://postgres:postgres123@localhost:5432/mydb`

### PostgreSQL Read Replica
- Host: localhost
- Port: 5433
- User: postgres
- Password: postgres123
- Database: mydb
- Connection String: `postgresql://postgres:postgres123@localhost:5433/mydb`

### Redis
- Host: localhost
- Port: 6379
- Password: redis123
- Connection String: `redis://:redis123@localhost:6379`

## Run Prisma Migrations

### Option 1: Run migrations inside the container

```bash
docker-compose exec workbench-server npx prisma migrate deploy
```

### Option 2: Run migrations from your local machine

```bash
npx prisma migrate dev
```

Note: Make sure databases are running before running migrations.

## Connect to PostgreSQL

```bash
docker exec -it workbench-postgres-primary psql -U postgres -d mydb
```

## Connect to Redis

```bash
docker exec -it workbench-redis redis-cli
AUTH redis123
```
