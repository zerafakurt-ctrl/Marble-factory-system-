# Marble Factory Mobile Scanning System

Ready-to-upload React + Vite project for Vercel.

## Deploy on Vercel
1. Create a GitHub repository.
2. Upload all files from this folder to the repository.
3. Sign in to Vercel.
4. Click **Add New Project**.
5. Import the GitHub repository.
6. Vercel will detect Vite automatically.
7. Click **Deploy**.

## Local development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Current features
- Manual QR/slab ID lookup
- Slab register
- Cut logging
- Reusable offcut logging
- JSON backup export
- Local device storage

## Important note
This version stores data in each device's browser using localStorage.
If you want all factory tablets to stay synced together, the next step is a shared cloud database.
