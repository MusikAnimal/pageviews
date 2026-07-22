# Developing Pageviews

## Prerequisites

- Docker (with Compose)
- The [Symfony CLI](https://symfony.com/download) on your host (used for
  the replica tunnels)
- A [Toolforge](https://toolforge.org) account with
  [database credentials](https://wikitech.wikimedia.org/wiki/Help:Toolforge/Database),
  placed in `.env.local`:

  ```
  REPLICAS_USERNAME=s12345
  REPLICAS_PASSWORD=...
  ```

## Running the app

```bash
docker compose up
```

- App: <http://localhost:8091> (override with `HTTP_PORT=9000 docker compose up`)
- Vite dev server (HMR): port 5173, used automatically

## Toolforge replica tunnels

Features backed by the database replicas (`/projects.json`, edit data,
and therefore every app page) need SSH tunnels to the Toolforge
replicas, run on your **host**:

```bash
symfony console toolforge:ssh -b 172.17.0.1
```

The `-b 172.17.0.1` (the Docker bridge IP) is required: containers reach
your host through `host.docker.internal`, which routes over the Docker
bridge — a tunnel bound to the default `127.0.0.1` is invisible to them.
If your bridge IP differs, check `ip addr show docker0`.

Verify the tunnels are listening with `ss -tln | grep 471`, and note the
`REPLICAS_HOST_S*`/`REPLICAS_PORT_S*` values in `.env` /`.env.local` must
match the ports the command opens (compose overrides the hosts to
`host.docker.internal` automatically).

## Local AQS rate limiting

The Wikimedia metrics REST API (AQS) throttles external IPs to small
per-IP bursts. Cloud Services production is not subject to the same
limits, but locally, large fan-outs (e.g. "Include redirects" on pages
with many redirects) will be slow: the server waits out AQS's
`Retry-After` between waves, and the dev PHP container allows up to
5 minutes per request (`docker/php/app.dev.ini`) to accommodate that.
This is expected — grab a coffee, or test with fewer pages.

## Simulating the loading state

To style the loading UI without it disappearing when data arrives, add
to `.env.local`:

```
VITE_SIMULATE_LOADING=1
```

Every data load then freezes in the loading state (progress bar shown
mid-way, no requests fired). The Vite dev server picks up `.env.local`
changes automatically; remove the line (or set anything other than `1`)
to restore normal behavior.

## Tests and linting

Run all tooling through the containers — the JS and PHP toolchains live
there:

```bash
docker exec pageviews-node-1 npm test              # Vitest
docker exec pageviews-node-1 npm run lint          # ESLint + Stylelint
docker exec pageviews-node-1 npm run lint:fix
docker exec pageviews-node-1 npx vite build

docker exec pageviews-php-1 composer test          # PHPUnit
docker exec pageviews-php-1 php bin/console ...
```

## Reference

- The legacy tool can be cloned to `var/pageviews-legacy/` (gitignored)
  as a reference during the port:
  `git clone --depth 1 https://github.com/MusikAnimal/pageviews.git var/pageviews-legacy`
- Conventions and architecture rules: see `CLAUDE.md`.
