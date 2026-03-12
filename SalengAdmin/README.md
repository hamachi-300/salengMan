# SalengMan Admin Console

The management web dashboard for the SalengMan system, built with React, Vite, and Lucide icons.

## Features

- **User Management**: View and manage customer and driver accounts.
- **System Monitoring**: Overview of system status and active services.
- **Data Inspection**: Direct view into orders, posts, and system history.
- **Configuration**: Management of recycling centers and system parameters.

## Prerequisites

- **Node.js** (v18+)
- **NPM** or **PNPM**

## Development Setup

### 1. Configure Environment
```bash
cp .env.example .env
```
Update any API URLs if necessary (usually points to the port 3000 backend).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
```bash
npm run dev
```
The console is typically available at `http://localhost:5173`.

## Deployment
The Admin console can be built as a static site:
```bash
npm run build
```
The output will be in the `dist/` folder, ready for hosting via Nginx or any static web host.

## Tech Stack
- **Framework**: React 19
- **Routing**: React Router 7
- **Icons**: Lucide React
- **API Client**: Axios
