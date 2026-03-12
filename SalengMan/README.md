# SalengMan App

The primary user application for waste collection and recycling management, built with React, Vite, and Tauri.

## Features

- **Waste Posting**: Take photos of iron/waste and post them for collection.
- **Real-time Tracking**: Monitor driver locations on the map.
- **Image Recognition**: Integrated with Teachable Machine for initial item classification.
- **Desktop & Mobile**: Shared codebase for target platforms.

## Prerequisites

- **Node.js** (v18+)
- **Rust** (for Tauri builds)
- Mobile SDKs (Xcode for iOS, Android Studio for Android)

## Development Setup

### 1. Configure Environment
```bash
cp .env.example .env
```
Update `VITE_API_URL` to point to your backend (IP or localhost).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
```bash
# Web browser
npm run dev

# Tauri Desktop
npm run tauri dev
```

## Build Instructions

### iOS Build
```bash
npm run tauri ios build -- --open
```

### Android Build
```bash
npm run tauri android build -- --debug
```

### Desktop Build
```bash
npm run tauri build
```

## Project Highlights
- **Framework**: React 19 + TypeScript
- **Mapping**: Leaflet + React-Leaflet
- **Styling**: CSS Modules
- **Desktop Bridge**: Tauri 2.0
