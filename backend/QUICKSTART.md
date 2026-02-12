# Quick Start

## 1. Create .env file

```bash
cp .env.example .env
```

## 2. Edit .env with your passwords

```bash
nano .env
```

Set these values:
```
POSTGRES_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_min_32_chars
MINIO_ROOT_PASSWORD=your_minio_password
```

## 3. Start all services

```bash
docker compose up -d
```

## 4. Verify

```bash
# Check status
docker compose ps

# Test API
curl http://localhost:3000/health
```

## Services

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| PostgREST | http://localhost:3001 |
| Realtime | ws://localhost:4000 |
| MinIO Console | http://localhost:9001 |

## Commands

```bash
# View logs
docker compose logs -f

# View specific service
docker compose logs -f backend

# Stop
docker compose down

# Reset (delete all data)
docker compose down -v

# Rebuild
docker compose up -d --build
```
