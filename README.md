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

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Environment Setup

### 1. Create `.env` file

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Or create `.env` manually in the project root:

```env
VITE_API_URL=http://YOUR_VM_IP:3000
```

### 2. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API server URL | `http://20.123.45.67:3000` |

### 3. Important Notes

- Never commit `.env` file to git (it's already in `.gitignore`)
- All environment variables must start with `VITE_` to be accessible in the app
- Restart the dev server after changing `.env` values

## Getting Started

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

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
