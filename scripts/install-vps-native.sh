#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hospitality}"
WEB_ROOT="/var/www/apro.web.id"
DOMAIN="${DOMAIN:-apro.web.id}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@apro.web.id}"
DB_NAME="hospitality_pms"
DB_USER="postgres"

echo "=== [1/8] Memastikan DNS, Swap, dan Membersihkan Service Berat ==="
getent hosts github.com >/dev/null 2>&1 || printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /etc/resolv.conf

if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

systemctl disable --now snapd snapd.socket unattended-upgrades 2>/dev/null || true

echo "=== [2/8] Install PostgreSQL, Nginx, Certbot, Git, dan Build Tools ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git gnupg ca-certificates openssl postgresql postgresql-contrib nginx certbot python3-certbot-nginx

echo "=== [3/8] Install Node.js 22 LTS, pnpm 12.23.0, dan PM2 ==="
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
corepack enable 2>/dev/null || true
corepack prepare pnpm@12.23.0 --activate 2>/dev/null || npm install -g pnpm@12.23.0
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

echo "=== [4/8] Menyiapkan Source Code di ${APP_DIR} ==="
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" pull --ff-only
else
  rm -rf "${APP_DIR}"
  git clone https://github.com/bakhtiar19/hospitality.git "${APP_DIR}"
fi
cd "${APP_DIR}"

echo "=== [5/8] Menyiapkan Database PostgreSQL & File .env Production ==="
systemctl enable --now postgresql

if [ ! -f "${APP_DIR}/.env" ]; then
  PG_PASS="$(openssl rand -hex 16)"
  JWT_ACCESS="$(openssl rand -hex 32)"
  JWT_REFRESH="$(openssl rand -hex 32)"
  cat > "${APP_DIR}/.env" <<EOF
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${PG_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://${DOMAIN},https://www.${DOMAIN}
ENABLE_SWAGGER=false
DEFAULT_PROPERTY_CODE=WINOTOSASTRO-SOLO
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_CURRENCY=IDR
DEFAULT_LOCALE=id
EOF
  chmod 600 "${APP_DIR}/.env"
  su - postgres -c "psql -c \"ALTER USER ${DB_USER} WITH PASSWORD '${PG_PASS}';\""
fi

su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 || psql -c \"CREATE DATABASE ${DB_NAME};\""

echo "=== [6/8] Install Dependencies & Build Aplikasi ==="
export NODE_OPTIONS="--max-old-space-size=1536"
pnpm install --frozen-lockfile
pnpm --filter @hospitality/shared-types build
pnpm --filter @hospitality/database build
pnpm --filter @hospitality/api build

NEXT_PUBLIC_API_URL="/api/v1" pnpm --filter @hospitality/web build

mkdir -p "${WEB_ROOT}"
rm -rf "${WEB_ROOT:?}"/*
cp -r "${APP_DIR}/apps/web/out/"* "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"
chmod -R a+rX "${WEB_ROOT}"

echo "=== [7/8] Push Schema Prisma, Seed Awal, dan Jalankan API via PM2 ==="
set -a
# shellcheck disable=SC1091
source "${APP_DIR}/.env"
set +a

(cd "${APP_DIR}/packages/database" && npx prisma db push --accept-data-loss && npm run db:seed)

pm2 delete hospitality-api 2>/dev/null || true
pm2 start "${APP_DIR}/apps/api/dist/main.js" \
  --name hospitality-api \
  --cwd "${APP_DIR}/apps/api" \
  --max-memory-restart 450M
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "=== [8/8] Konfigurasi Nginx + SSL HTTPS (${DOMAIN}) ==="
cat > "/etc/nginx/sites-available/${DOMAIN}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${WEB_ROOT};
    index index.html;
    client_max_body_size 5m;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~ ^/book/[^/]+/?$ {
        try_files /book/winotosastro/index.html =404;
    }

    location / {
        try_files \$uri \$uri/index.html /index.html;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if command -v ufw >/dev/null 2>&1 && ufw status | grep -qi "Status: active"; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi

certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect || \
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect || \
  echo "[PERINGATAN] Certbot belum berhasil otomatis, jalankan ulang: certbot --nginx -d ${DOMAIN}"

mkdir -p /var/backups/hospitality
CRON_CMD="0 2 * * * su - postgres -c 'pg_dump ${DB_NAME}' | gzip > /var/backups/hospitality/pms_\$(date +\%F).sql.gz && find /var/backups/hospitality -mtime +7 -delete"
(crontab -l 2>/dev/null | grep -v "hospitality"; echo "${CRON_CMD}") | crontab -

echo ""
echo "=================================================================="
echo "SELESAI! Aplikasi Hospitality PMS aktif di: https://${DOMAIN}"
echo "Cek status API  : pm2 status"
echo "Cek penggunaan RAM: free -h"
echo "=================================================================="
