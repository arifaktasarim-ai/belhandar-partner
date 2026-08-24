# Belhandar Partner — Frontend (Sade HTML/CSS/JS)

Bu klasör **build aracı, npm bağımlılığı veya derleme gerektirmez**. Saf
HTML/CSS/JS ile yazıldı; herhangi bir statik dosya sunucusuyla servis edilir
ve tarayıcıda çalışır. App Store / Play Store'a yükleme gerekmez.

## Neden `file://` ile değil de bir sunucu ile açmalısınız?

Tarayıcılar güvenlik nedeniyle `file://` üzerinden açılan sayfalardan yapılan
`fetch` isteklerini ve çerezleri (refresh token için gerekli) kısıtlar. Bu
yüzden klasörü basit bir statik sunucu ile çalıştırın:

```bash
cd frontend
npx serve -l 5173
# veya
python3 -m http.server 5173
```

Sonra tarayıcıdan `http://localhost:5173` adresini açın.

Backend'i de ayrı bir terminalde çalıştırmayı unutmayın (bkz. `backend/README.md`).
Backend `.env` dosyasındaki `CLIENT_URL` değeri, frontend'i hangi adresten
açtığınızla **birebir aynı** olmalıdır (CORS için).

## Telefona kurulum (App Store olmadan)

1. `http://sunucu-adresiniz:5173` adresini telefonun tarayıcısında açın.
2. **Chrome (Android):** sağ üst menü → "Ana ekrana ekle"
   **Safari (iOS):** paylaş butonu → "Ana Ekrana Ekle"
3. Uygulama artık telefonun ana ekranında, tam ekran (adres çubuğu olmadan)
   bir uygulama gibi açılır. Apple Developer hesabına veya App Store'a
   ihtiyaç yoktur.

## Yapı

```
frontend/
  index.html          Tek giris noktasi (SPA kabugu)
  manifest.json        PWA manifesti ("ana ekrana ekle" icin)
  sw.js                Basit service worker (temel offline cache)
  css/styles.css        Tasarim sistemi (renkler, tipografi, bilesenler)
  js/
    config.js           API adresi ayari — DEGISTIRMENIZ GEREKEN TEK DOSYA
    api.js               fetch tabanli API istemcisi + otomatik token yenileme
    auth.js               Oturum durumu yonetimi
    router.js             Hash tabanli sayfa yonlendirme (#/admin/dashboard vb.)
    layout.js              Sidebar / topbar / mobil alt navigasyon kabugu
    toast.js                Bildirim (toast) yardimcisi
    app.js                    Route tanimlari + baslatma
    pages/                     Her ekran icin ayri dosya
```

## Şu an çalışan ekranlar (Aşama F1)

- `#/login` — giriş
- `#/register` — paydaş başvurusu
- `#/pending` — onay bekliyor / reddedildi / askıda durumu
- `#/admin/partners` — **tam işlevsel**: paydaş listeleme, arama, durum
  filtreleme, onayla/reddet/askıya al/aktif et (gerçek API'ye bağlı)
- `#/admin/dashboard`, `#/partner/dashboard` — temel karşılama ekranı
  (istatistik kartları, ilgili API uçları eklendiğinde dolacak)
- Diğer tüm menü öğeleri "yakında" yer tutucusu gösterir — link kırık değildir,
  sadece o modülün backend'i henüz yazılmadı.

## Yeni bir sayfa eklemek istediğinizde

1. `js/pages/` altına yeni dosya oluşturun (var olanları örnek alın).
2. `index.html`'e `<script>` etiketini ekleyin.
3. `js/app.js` içine `Router.register('/yol', { requiresAuth, roles, render })`
   satırını ekleyin.

Tasarım tokenleri (`css/styles.css` en üstündeki `:root` bloğu) tek noktadan
değiştirilebilir; marka rengi, tipografi vb. oradan yönetilir.
