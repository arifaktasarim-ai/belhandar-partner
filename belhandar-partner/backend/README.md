# Belhandar Partner — Backend (Aşama 1)

Bu aşamada kurulanlar: **PostgreSQL + Prisma şeması (tüm sistem) + Authentication + User/Role sistemi**.

## Kurulum

```bash
cd backend
cp .env.example .env
# .env içinde DATABASE_URL ve JWT secret'larını kendi ortamınıza göre düzenleyin

npm install
npx prisma migrate dev --name init      # veritabanı tablolarını oluşturur
npm run prisma:seed                     # örnek verileri yükler
npm run dev                             # http://localhost:4000
```

> Not: Bu kod bu sandbox ortamında `binaries.prisma.sh` adresine ağ erişimi
> olmadığı için `prisma generate` burada test edilemedi. Kendi
> makinenizde/CI'nızda normal internet erişimiyle sorunsuz çalışacaktır.

## Seed sonrası giriş bilgileri

| Kullanıcı | Şifre | Rol | Durum |
|---|---|---|---|
| superadmin | SuperAdmin123! | SUPER_ADMIN | ACTIVE |
| admin | Admin123! | ADMIN | ACTIVE |
| ahmet.yilmaz | Partner123! | PARTNER | ACTIVE |
| zeynep.kaya | Partner123! | PARTNER | ACTIVE |
| can.arslan | Partner123! | PARTNER | **PENDING_APPROVAL** (onay akışını test etmek için) |

## Aşama 1 kapsamındaki uç noktalar

```
GET  /health

POST /api/auth/register        Paydaş kaydı (durum: PENDING_APPROVAL)
POST /api/auth/login            { identifier, password } → accessToken + refreshToken (httpOnly cookie)
POST /api/auth/refresh          Refresh token rotation
POST /api/auth/logout
GET  /api/auth/me               (Bearer token gerekli)

GET  /api/admin/partners                  (ADMIN/SUPER_ADMIN) liste + arama + status filtresi
PATCH /api/admin/partners/:id/status      { action: approve|reject|suspend|activate, reason? }
```

## Bu aşamada uygulanan güvenlik önlemleri

- Şifreler **bcryptjs** ile hash'lenir, hiçbir zaman plain text saklanmaz.
- **Access token** (JWT, 15 dk) + **Refresh token** (opak random string, DB'de hash'lenmiş, rotate edilir, httpOnly cookie).
- Login/register uçlarında **rate limiting**, genel API'de ikinci bir rate limit katmanı.
- `helmet`, `cors` (yalnızca `CLIENT_URL`'e izin), request body boyutu sınırı.
- Tüm giriş verileri **zod** ile doğrulanır; hatalı istekler 400 ile reddedilir.
- Rol bazlı yetkilendirme (`requireAuth` + `requireRole`) — paydaşlar admin uçlarına erişemez.
- Kritik işlemler (kayıt, durum değişikliği) `AuditLog` tablosuna otomatik yazılır.
- Hassas alanlar (`passwordHash`) API yanıtlarından her zaman ayıklanır (`_omit` pattern).

## Sırada ne var (Aşama 2+)

Aşama 2: Admin paneli API'leri (ürün/komisyon/sipariş/üretim yönetimi uçları)
Aşama 3: Paydaş paneli API'leri
... (madde 38'deki plana göre devam edilecek)
