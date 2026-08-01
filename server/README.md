# beam-server

Backend API for the beam QR file-transfer app. This is the foundational
scaffold — CORS, logging, config, error handling, and health checks are
wired up. File upload/download endpoints are intentionally **not**
implemented yet.

## Getting started

```bash
cd server
npm install
cp .env.example .env
npm run dev      # nodemon, restarts on file change
# or
npm start        # plain node
```

Server boots on `http://localhost:5000` by default. Confirm it's alive:

```bash
curl http://localhost:5000/api/health
```

## Folder structure

```
server/
├── server.js                  # process entry point (loads env, calls app.listen)
├── src/
│   ├── app.js                 # Express app: middleware stack + route mounting
│   ├── config/
│   │   ├── env.js             # centralized process.env reader with defaults
│   │   └── multer.js          # disk storage config, ready but not wired to a route
│   ├── controllers/
│   │   └── health.controller.js
│   ├── routes/
│   │   ├── index.js           # aggregates all feature routers under /api
│   │   └── health.routes.js
│   └── middlewares/
│       ├── notFound.js        # 404 JSON response for unmatched routes
│       └── errorHandler.js    # centralized error handler (last middleware)
├── uploads/                   # empty, gitignored; destination for future uploads
├── .env.example
├── .gitignore
└── package.json
```

## Why it's laid out this way

- **`server.js` vs `src/app.js`** — `app.js` builds the Express app but never
  calls `.listen()`. `server.js` is the only file that binds a port. This
  keeps the app importable in tests without opening a real socket.
- **`config/`** — every environment variable is read in one place
  (`env.js`), so there's a single source of truth instead of `process.env`
  scattered across the codebase.
- **`routes/` + `controllers/`** — routes describe *what URL maps to what
  handler*; controllers hold the actual logic. Splitting them keeps route
  files readable as the API grows.
- **`middlewares/`** — cross-cutting concerns (404s, error formatting) live
  outside any single route, applied globally in `app.js`.
- **`config/multer.js`** — the storage engine (UUID-named files on disk) is
  pre-configured so the upload route, when built, can `require` it directly
  instead of revisiting storage strategy.

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable    | Purpose                                      |
| ----------- | --------------------------------------------- |
| `PORT`        | Port the server listens on                  |
| `CLIENT_URL`  | Frontend origin allowed by CORS             |
| `UPLOAD_DIR`  | Destination folder for future uploads       |

## Endpoints

| Method | Path          | Description                          |
| ------ | ------------- | ------------------------------------- |
| GET    | `/api/health` | Returns process status, uptime, env  |

Upload/download endpoints will be added in a future pass.
