# Chore Tracker

A small chore-and-rewards kiosk app for a family dashboard, designed to run locally first and then deploy cleanly in Docker for Synology and Home Assistant embedding.

## What It Does

- Shows unassigned chores and chores per child
- Tracks points through an immutable ledger
- Supports recurring weekday chores
- Lets kids redeem rewards against current point totals
- Stores data in SQLite

## Local Development

Requirements:

- Node.js 22+
- npm

Install:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

- App: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001/api/health](http://localhost:3001/api/health)

Build:

```bash
npm run build
```

Tests:

```bash
npm test
npm run test:e2e
```

## Runtime Configuration

Supported environment variables:

- `PORT`: API/server port. Default: `3001`
- `DATA_DIR`: directory for the SQLite file. Default: `<repo>/data`
- `DATABASE_PATH`: explicit SQLite file path. Overrides `DATA_DIR`
- `TZ`: container/server timezone. Recommended for Docker deployments
- `API_PORT`: dev-only Vite proxy target
- `VITE_PORT`: dev-only Vite port

## Docker

Build the image:

```bash
docker build -t chore-tracker .
```

Build and tag it for a local registry:

```bash
docker build -t <local-registry-host>:5050/chore-tracker:latest .
```

Push it to the local registry:

```bash
docker push <local-registry-host>:5050/chore-tracker:latest
```

Run it:

```bash
docker run -d \
  --name chore-tracker \
  -p 3200:3001 \
  -e TZ=America/Los_Angeles \
  -e DATA_DIR=/data \
  -v chore_tracker_data:/data \
  chore-tracker
```

Open:

- App: [http://localhost:3200](http://localhost:3200)
- Health: [http://localhost:3200/api/health](http://localhost:3200/api/health)

Stop:

```bash
docker stop chore-tracker
docker rm chore-tracker
```

## Docker Compose

Run:

```bash
docker compose up --build -d
```

Stop:

```bash
docker compose down
```

The included compose file stores SQLite in a named Docker volume mounted at `/data`.

## Getting The Image To Synology

You do not have to publish the image, but publishing is the cleanest option if you want repeatable updates.

### Option 1: Push To A Registry

Best for long-term use.

Tag and push the image:

```bash
docker tag chore-tracker:test yourname/chore-tracker:latest
docker push yourname/chore-tracker:latest
```

For this local registry, the equivalent commands are:

```bash
docker build -t <local-registry-host>:5050/chore-tracker:latest .
docker push <local-registry-host>:5050/chore-tracker:latest
```

Then on Synology:

- open Container Manager
- pull `yourname/chore-tracker:latest` or `<local-registry-host>:5050/chore-tracker:latest`
- create the container from that image

### Option 2: Export And Import A Tar

Best for one-off private deployment without using a registry.

Export:

```bash
docker save chore-tracker:test -o chore-tracker.tar
```

Copy `chore-tracker.tar` to the NAS, then import/load it there before creating the container.

### Option 3: Build On Synology

Best if you want the Synology to build directly from the project files.

- copy the project to the NAS
- use Container Manager project support or SSH
- run `docker compose up --build -d`

## Synology Container Manager

Recommended setup:

1. Build the image locally or pull it from your registry once you publish it.
2. Create a container from the image.
3. Map container port `3001` to host port `3200`.
4. Mount a persistent folder or volume to `/data`.
5. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATA_DIR=/data`
   - `TZ=America/Los_Angeles` or your household timezone
6. Enable restart policy `unless-stopped` or equivalent.
7. Open `http://<synology-ip>:3200` from another device on your network and confirm the app loads.

Important:

- The SQLite file should live on the mounted `/data` path, not inside the container filesystem.
- `DATA_DIR` and `DATABASE_PATH` are paths inside the container, not Synology host paths.
- Recommended folder mount: map the Synology folder containing the DB to `/data`, then set `DATA_DIR=/data`.
- If using `DATABASE_PATH`, set it to the container path of the file, usually `/data/chore-tracker.db`.
- Runtime startup never creates, seeds, or migrates database content. Start new installations by copying `sample.db` to the configured database path.
- If the timezone matters for chore schedule boundaries, set `TZ` explicitly.
- If you are using an older Synology setup that still calls the package "Docker" or "Container Station", the same core settings still apply: image source, port mapping, `/data` volume mount, and restart policy.

## Home Assistant Embedding

Once the app is reachable on your network, add it to Home Assistant with a Webpage/Iframe-style card pointing at:

```text
http://<your-host-ip>:3200
```

Notes:

- This app assumes trusted in-home usage and has no auth in v1.
- Make sure the device running Home Assistant can reach the container host over the local network.
- Use a stable host IP or hostname so the iframe URL does not drift.
- If Home Assistant is using HTTPS while the app is served over plain HTTP, mixed-content/browser policy can matter depending on your setup. If that happens, serve the container through a local reverse proxy with HTTPS.

## Deployment Verification

After deploying to Synology, verify:

1. `http://<synology-ip>:3200/api/health` responds
2. `http://<synology-ip>:3200` loads the board
3. A newly created chore still exists after container restart
4. The SQLite file is being written under the mounted `/data` path
5. Home Assistant iframe loads the app without clipping or reachability issues

## Data and Persistence

- Primary data store: SQLite
- Default local DB path: `data/chore-tracker.db`
- Empty schema-only starter DB: `data/sample.db`
- Recommended container DB path: `/data/chore-tracker.db`

For a new installation, copy `sample.db` to `chore-tracker.db` in the mounted data folder before starting the container.

Back up the SQLite file by copying the DB file from the mounted data directory while the app is stopped, or by using your normal volume/folder backup workflow.

## Verification

See [MANUAL_QA_CHECKLIST.md](./MANUAL_QA_CHECKLIST.md) for a concise manual verification pass.
See [REMAINING_ROADMAP.md](./REMAINING_ROADMAP.md) for the post-MVP roadmap.
