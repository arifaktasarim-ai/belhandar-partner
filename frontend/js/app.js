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
    render: (c) => PartnerSalesPage.render(c),
  });
  Router.register('/partner/stocks', {
    requiresAuth: true, roles: ['PARTNER'],
    render: (c) => PartnerStocksPage.render(c),
  });
  Router.register('/partner/orders', {
    requiresAuth: true, roles: ['PARTNER'],
    render: (c) => PartnerOrdersPage.render(c),
  });
  Router.register('/partner/returns', {
    requiresAuth: true, roles: ['PARTNER'],
    render: (c) => PartnerReturnsPage.render(c),
  });
  Router.register('/partner/profile', {
    requiresAuth: true, roles: ['PARTNER'],
    render: (c) => PartnerProfilePage.render(c),
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
    render: (c) => AdminProductsPage.render(c),
  });
  Router.register('/admin/orders', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminOrdersPage.render(c),
  });
  Router.register('/admin/production', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminProductionPage.render(c),
  });
  Router.register('/admin/stocks', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminStocksPage.render(c),
  });
  Router.register('/admin/sales', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminSalesPage.render(c),
  });
  Router.register('/admin/returns', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminReturnsPage.render(c),
  });
  Router.register('/admin/customers', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminCustomersPage.render(c),
  });
  Router.register('/admin/payments', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminPaymentsPage.render(c),
  });
  Router.register('/admin/reports', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminReportsPage.render(c),
  });
  Router.register('/admin/settings', {
    requiresAuth: true, roles: ['ADMIN', 'SUPER_ADMIN'],
    render: (c) => AdminSettingsPage.render(c),
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
