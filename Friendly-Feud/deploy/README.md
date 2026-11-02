# Hosting on a Google Cloud e2-micro (m0usetrap.ee)

The stack is two containers: the app (nginx + Go + Next) and Caddy, which gets the HTTPS certificate.
Rooms are stored in SQLite under `~/feud/data`, so games survive restarts.

Costs: the e2-micro VM and 30 GB standard disk are in Google's Always Free tier, but only in
`us-west1`, `us-central1` or `us-east1`. Free outbound traffic is just 1 GB per month, and Google
charges a few dollars a month for an external IPv4 address. Check the current
[pricing page](https://cloud.google.com/free/docs/free-cloud-features#compute) and set a budget alert.
Latency from Estonia is about 100-150 ms, which is fine for this game.

## 1. Create the VM (run on your PC, after `gcloud auth login`)

```bash
gcloud compute instances create feud \
  --zone=us-central1-a --machine-type=e2-micro \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=30GB --boot-disk-type=pd-standard \
  --tags=http-server,https-server

gcloud compute firewall-rules create feud-web \
  --allow=tcp:80,tcp:443 --target-tags=http-server,https-server

gcloud compute instances describe feud --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

The last command prints the IP. It changes when the VM is stopped; to keep it, reserve it with
`gcloud compute addresses create feud-ip --addresses=<that IP> --region=us-central1`.

## 2. Point the domain

At your registrar add an **A record**: `m0usetrap.ee` -> the IP above. Verify with `dig +short m0usetrap.ee`.
Caddy can only get a certificate once this resolves to the VM.

## 3. Prepare the server (once)

```bash
gcloud compute ssh feud --zone=us-central1-a
```

On the VM:

```bash
# 2 GB swap, because the VM only has 1 GB of RAM
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out and back in afterwards

mkdir -p ~/feud/data
```

Create `~/feud/.env` from `deploy/.env.example` (`nano ~/feud/.env`), with your own
`ADMIN_CONSOLE_PASSWORD` and an `ADMIN_SESSION_SECRET` from `openssl rand -hex 32`.

## 4. Deploy (from your PC, repo root `Friendly-Feud/`)

```bash
deploy/ship.sh <your-user>@<server-ip>
```

`gcloud compute config-ssh` makes plain `ssh feud.us-central1-a.<project>` work if you prefer names.
The script builds the image locally, copies it over, and starts the stack. Then open
https://m0usetrap.ee and https://m0usetrap.ee/admin.

Re-run the same command to update. `NEXT_PUBLIC_*` values are baked in at build time,
so changing them means re-running `ship.sh`.

## Operating it

| Task | Command (on the VM, in `~/feud`) |
| --- | --- |
| Logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Restart | `docker compose -f docker-compose.prod.yml restart` |
| Stop taking new games | Admin console -> pause room creation |
| Back up games | `cp data/famf.db ~/famf-$(date +%F).db` |
| Change limits | edit `MAX_ROOMS` / `ROOM_CREATE_LIMIT_PER_HOUR` in `.env`, then `up -d` |

Limits: `MAX_ROOMS` caps live rooms, and `ROOM_CREATE_LIMIT_PER_HOUR` caps rooms per IP address.
Rooms expire after 24 hours by default (`ROOM_TIMEOUT_SECONDS`).
Everyone with the host password has full admin access, so keep it private.
