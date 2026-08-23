/**
 * Belhandar Partner - Uygulama giris noktasi.
 * Route tanimlari burada yapilir, Router.init ile calisir.
 */
(function bootstrap() {
  Router.register('/login', {
    requiresAuth: false,
    render: (c) => LoginPage.render(c),
  });
  Router.register('/register', {
    requiresAuth: false,
    render: (c) => RegisterPage.render(c),
  });
  Router.register('/pending', {
    requiresAuth: true,
    render: (c) => PendingPage.render(c),
  });

  // --- Paydas rotalari ---
  Router.register('/partner/dashboard', {
    requiresAuth: true, roles: ['PARTNER'],
    render: (c) => PartnerDashboardPage.render(c),
  });
  Router.register('/partner/sales', {
    requiresAuth: true, roles: ['PARTNER'],
    render: ComingSoonPage.render('Satis', 'Satis kaydi ekrani Asama 5te eklenecek.'),
  });
  Router.register('/partner/stocks', {
    requiresAuth: true, roles: ['PARTNER'],
    render: ComingSoonPage.render('Stok', 'Paydas stok ekrani Asama 4te eklenecek.'),
  });
  Router.register('/partner/orders', {
    requiresAuth: true, roles: ['PARTNER'],
    render: ComingSoonPage.render('Siparis', 'Siparis olusturma/takip ekrani Asama 6da eklenecek.'),
  });
  Router.register('/partner/profile', {
    requiresAuth: true, roles: ['PARTNER'],
    render: ComingSoonPage.render('Profil', 'Profil duzenleme ekrani yakinda eklenecek.'),
  });

  // --- Admin rotalari ---
  Router.register('/admin/dashboard', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminDashboardPage.render(c),
  });
  Router.register('/admin/partners', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminPartnersPage.render(c),
  });
  Router.register('/admin/products', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Urunler', 'Urun ve komisyon yonetimi Asama 4te eklenecek.'),
  });
  Router.register('/admin/orders', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Siparisler', 'Siparis onay/red ekrani Asama 6da eklenecek.'),
  });
  Router.register('/admin/production', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Uretim', 'Uretim durumu takip ekrani Asama 7de eklenecek.'),
  });
  Router.register('/admin/stocks', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Stok', 'Merkezi stok ekrani Asama 4te eklenecek.'),
  });
  Router.register('/admin/payments', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Odemeler', 'Odeme/kazanc takip ekrani Asama 8de eklenecek.'),
  });
  Router.register('/admin/reports', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Raporlar', 'Raporlama ekrani Asama 9da eklenecek.'),
  });
  Router.register('/admin/settings', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: ComingSoonPage.render('Ayarlar', 'Sistem ayarlari ekrani yakinda eklenecek.'),
  });

  Router.init(document.getElementById('app'));

  // PWA: service worker (Asama 10'da genisletilecek, simdilik pasif kayit)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* service worker opsiyonel, sessiz gec */
      });
    });
  }
})();
