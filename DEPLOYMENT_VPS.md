# Panduan Deploy Production di VPS (Ringan & Aman)

Arsitektur production aplikasi **Hospitality PMS by AProject** dirancang khusus agar sangat ringan (**total konsumsi RAM ~200–300 MB**) sehingga lancar dijalankan pada VPS hemat biaya (**1 vCPU / 1–2 GB RAM**), namun tetap aman untuk model bisnis **SaaS Multi-Tenant** (banyak pemilik hotel dalam 1 sistem dengan isolasi data ketat).

## Komponen Production (Hanya 3 Container Ringan)
1. **`pms_postgres` (`postgres:16-alpine`)**: Database utama terpusat (isolasi per `propertyId`), menggantikan kebutuhan `localStorage`.
2. **`pms_api` (`node:22-alpine`)**: Backend NestJS dengan JWT Rotation, RBAC Staff, Rate Limiting in-memory (tanpa Redis), kompresi logo di DB (tanpa MinIO), dan Audit Log dengan sensor otomatis data sensitif.
3. **`pms_web_caddy` (`caddy:2-alpine`)**: Web server super ringan (~20 MB RAM) yang menyajikan hasil static build Next.js, mengaktifkan **HTTPS SSL gratis otomatis** (Let's Encrypt), dan meneruskan `/api/*` ke backend.

---

## Langkah Deploy di VPS Ubuntu/Debian

### 1. Siapkan VPS & Firewall
```bash
sudo apt update && sudo apt install -y git curl
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
# Buka hanya port SSH (22), HTTP (80), dan HTTPS (443)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Clone Repositori & Buat `.env` Production
```bash
git clone https://github.com/bakhtiar19/hospitality.git
cd hospitality
cp .env.production.example .env
```

Generate secret JWT yang kuat di VPS:
```bash
openssl rand -hex 32   # Masukkan ke JWT_ACCESS_SECRET di .env
openssl rand -hex 32   # Masukkan ke JWT_REFRESH_SECRET di .env
```
Edit `.env` (`nano .env`) dan isi `APP_DOMAIN`, `CORS_ORIGIN`, `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, dan `JWT_REFRESH_SECRET`.

### 3. Jalankan Production Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. (Opsional) Isi Data Awal Demo
```bash
docker exec -it pms_api sh -c "cd /app/packages/database && npx prisma db seed"
```
Setelah itu, setiap pembeli hotel baru cukup membuka `https://domainanda.com/register` untuk mendaftarkan hotelnya sendiri secara otomatis.

### 5. Backup Database PostgreSQL Harian (Otomatis)
Tambahkan cron job (`crontab -e`) untuk backup harian pukul 02.00 WIB:
```bash
0 2 * * * docker exec pms_postgres pg_dump -U postgres hospitality_pms | gzip > /root/backup_pms_$(date +\%F).sql.gz
```
