# SalengMan

A waste collection and recycling management application built with React, TypeScript, and self-hosted backend services.

## Technology Stack

### Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type-safe JavaScript |
| Vite | 6.x | Build tool & dev server |
| React Router | 7.x | Client-side routing |
| Tauri | 2.x | Desktop app framework |
| CSS Modules | - | Scoped styling |

### Backend

| Technology | Description |
|------------|-------------|
| Node.js | Runtime environment |
| Express | Web framework |
| PostgreSQL | Relational database |
| PostgREST | Auto-generated REST API |
| JWT | Authentication tokens |
| bcrypt | Password hashing |

### Infrastructure

| Technology | Description |
|------------|-------------|
| Docker | Container platform |
| Docker Compose | Multi-container orchestration |
| PM2 | Node.js process manager |
| Azure VM | Cloud hosting |

### Storage & Realtime

| Technology | Description |
|------------|-------------|
| MinIO | S3-compatible file storage |
| Supabase Realtime | WebSocket for live updates |
| PostGIS | Geospatial database extension |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React + TypeScript)                                │
│  - Authentication UI                                        │
│  - Order management                                         │
│  - Real-time tracking                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure VM (Ubuntu)                                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Node.js Backend │  │ PostgREST       │                   │
│  │ Port 3000       │  │ Port 3001       │                   │
│  │ - Auth (JWT)    │  │ - Auto REST API │                   │
│  │ - Business logic│  │ - CRUD ops      │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│           └──────────┬─────────┘                            │
│                      ▼                                      │
│  ┌─────────────────────────────────────────┐                │
│  │ PostgreSQL + PostGIS                    │                │
│  │ Port 5432                               │                │
│  │ - Users, Orders, Driver locations       │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Supabase        │  │ MinIO           │                   │
│  │ Realtime        │  │ Port 9000/9001  │                   │
│  │ Port 4000       │  │ - File uploads  │                   │
│  │ - WebSocket     │  │ - Image storage │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/) (v18+)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/salengMan.git
cd salengMan
```

### 2. Generate Secure Passwords

```bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 24)"
```

Save these values for the next step.

### 3. Setup Backend Environment

Create `backend/.env`:

```bash
nano backend/.env
```

Add the following (replace with your generated passwords):

```env
# Database
POSTGRES_USER=salengman
POSTGRES_PASSWORD=<your-generated-postgres-password>
POSTGRES_DB=salengman

# Authentication
JWT_SECRET=<your-generated-jwt-secret>

# MinIO Storage
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=<your-generated-minio-password>
```

### 4. Start Backend Services

```bash
cd backend
docker compose up -d
```

Verify all services are running:

```bash
docker compose ps
```

### 5. Setup Frontend Environment

Create `.env` in project root:

```bash
cd ..
nano .env
```

Add:

```env
VITE_API_URL=http://localhost:3000
```

### 6. Install & Run Frontend

```bash
npm install
npm run dev
```

### 7. Verify Setup

```bash
curl http://localhost:3000/health
```

Open http://localhost:5173 in your browser.

---

## Deploy to SSH Server

### 1. Connect and Clone

```bash
ssh user@your-server-ip
git clone https://github.com/your-username/salengMan.git
cd salengMan
```

### 2. Setup Backend Environment

```bash
nano backend/.env
```

Add the same environment variables (use different passwords for production):

```env
POSTGRES_USER=salengman
POSTGRES_PASSWORD=<production-postgres-password>
POSTGRES_DB=salengman
JWT_SECRET=<production-jwt-secret>
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=<production-minio-password>
```

### 3. Start Backend Services

```bash
cd backend
docker compose up -d
```

### 4. Open Firewall Ports

```bash
sudo ufw allow 3000   # Backend API
sudo ufw allow 3001   # PostgREST
sudo ufw allow 4000   # Realtime WebSocket
sudo ufw allow 9000   # MinIO API
sudo ufw allow 9001   # MinIO Console
```

### 5. Update Frontend Environment

On your local machine, update `.env`:

```env
VITE_API_URL=http://<your-server-ip>:3000
```

---

## Access MinIO Dashboard

MinIO provides a web console for managing file storage.

| Environment | URL |
|-------------|-----|
| Local | http://localhost:9001 |
| Remote | http://\<your-server-ip\>:9001 |

**Login:** Use `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from your `.env`

**Features:**
- Browse uploaded files in `salengman` bucket
- Upload/download files manually
- Monitor storage usage

---

## Useful Commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart

# Build for production
npm run build
```

---

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## Backend Services

The app connects to the following backend services:

| Service | Port | Description |
|---------|------|-------------|
| Node.js API | 3000 | Authentication & business logic |
| PostgREST | 3001 | Auto-generated REST API |
| Supabase Realtime | 4000 | WebSocket connections |
| PostgreSQL | 5432 | Database with PostGIS |
| MinIO API | 9000 | S3-compatible file storage |
| MinIO Console | 9001 | File management UI |

## API Endpoints

### Authentication (Node.js - Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Create new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user (requires token) |
| POST | `/upload` | Upload image (requires token) |

### Database (PostgREST - Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/orders` | List all orders |
| POST | `/orders` | Create order |
| PATCH | `/orders?id=eq.{id}` | Update order |

## Project Structure

```
SalengMan/
├── src/
│   ├── assets/          # Images, icons
│   ├── config/          # API configuration
│   ├── pages/           # Page components
│   ├── services/        # Auth & API services
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── src-tauri/           # Tauri (desktop) config
├── .env.example         # Environment template
├── package.json
└── README.md
```

## Quick Start (App)
### 1. add .env
``` bash
cp .env.example .env
nano .env
```

```
# Backend API URL
# Replace with your actual server IP address
VITE_API_URL=http://YOUR_VM_IP:3000
```
#### change YOUR_VM_IP to server ip address or localhost if run in local


## Quick Start (Server)

### 1. update & install git
``` bash
sudo apt-get update
sudo apt install git
```

### 2. pull this repository
``` bash
git clone https://github.com/hamachi-300/salengMan.git
```

### 3. install docker
``` bash
sudo snap install docker
docker compose up
```

### 4. add .env file in /backend folder
``` bash
cp .env.example .env
nano .env
```

```
# PostgreSQL Configuration
POSTGRES_USER=salengman
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=salengman

# JWT Secret (min 32 characters)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# MinIO Configuration
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_minio_password_here

# Supabase Realtime
SECRET_KEY_BASE=your_secret_key_base_for_realtime_min_64_chars_recommended

# Optional: Public URLs (for production)
# MINIO_PUBLIC_URL=http://your-server-ip:9000
# API_URL=http://your-server-ip:3000
```

#### POSTGRES_PASSWORD and MINIO_ROOT_PASSWORD
```
openssl rand -base64 24
```

#### JWT_SECRET
```
openssl rand -base64 48
```

#### SECRET_KEY_BASE
```
openssl rand -base64 64 | tr -d '\n'
```

#### MINIO_PUBLIC_URL
```
MINIO_PUBLIC_URL=http://your-server-ip:9000
```