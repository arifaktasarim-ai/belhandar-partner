/**
 * Belhandar Partner - Kimlik dogrulanmis sayfalar icin ortak kabuk (shell).
 * Sidebar (masaustu) + alt navigasyon (mobil) + topbar.
 */
const Layout = (() => {
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    sale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18l-1.5 11a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 7Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>',
    stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></svg>',
    order: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    partners: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13.5 20a4.5 4.5 0 0 1 8.3-2.4"/></svg>',
    products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3v3M15 3v3"/><rect x="6" y="6" width="12" height="15" rx="2"/><path d="M9 12h6M9 16h4"/></svg>',
    production: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 20V9l5 4V9l5 4V9l5 4v7Z"/></svg>',
    payments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.14.44.75.99 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  };

  const PARTNER_NAV = [
    { path: '/partner/dashboard', label: 'Ana Sayfa', icon: 'dashboard' },
    { path: '/partner/sales', label: 'Satis', icon: 'sale' },
    { path: '/partner/stocks', label: 'Stok', icon: 'stock' },
    { path: '/partner/orders', label: 'Siparis', icon: 'order' },
    { path: '/partner/profile', label: 'Profil', icon: 'profile' },
  ];

  const ADMIN_NAV = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/partners', label: 'Paydaslar', icon: 'partners' },
    { path: '/admin/products', label: 'Urunler', icon: 'products' },
    { path: '/admin/orders', label: 'Siparisler', icon: 'order' },
    { path: '/admin/production', label: 'Uretim', icon: 'production' },
    { path: '/admin/stocks', label: 'Stok', icon: 'stock' },
    { path: '/admin/payments', label: 'Odemeler', icon: 'payments' },
    { path: '/admin/reports', label: 'Raporlar', icon: 'reports' },
    { path: '/admin/settings', label: 'Ayarlar', icon: 'settings' },
  ];

  // Mobil alt navigasyon icin kisitli, en sik kullanilan 5 ogeye indirgenmis liste (madde 22)
  const PARTNER_BOTTOM = PARTNER_NAV;
  const ADMIN_BOTTOM = [
    ADMIN_NAV[0], ADMIN_NAV[1], ADMIN_NAV[3], ADMIN_NAV[6],
    { path: '/admin/settings', label: 'Ayarlar', icon: 'settings' },
  ];

  function initials(user) {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }

  function roleLabel(role) {
    return { SUPER_ADMIN: 'Super Admin', ADMIN: 'Yonetici', PARTNER: 'Paydas' }[role] || role;
  }

  function renderShell(container, { title }) {
    const user = Auth.getUser();
    const isAdmin = Auth.isAdmin();
    const nav = isAdmin ? ADMIN_NAV : PARTNER_NAV;
    const bottomNav = isAdmin ? ADMIN_BOTTOM : PARTNER_BOTTOM;

    container.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <img class="brand-logo" src="./assets/branding/belhandar-wordmark-gold.png" alt="Belhandar Parfümleri" />
          </div>
          <div class="sidebar-subtitle">Paydaş / Bayi Sistemi</div>
          <nav class="sidebar-nav" data-nav-root>
            ${nav.map((n) => `
              <a class="nav-item" data-path="${n.path}" href="#${n.path}">
                ${ICONS[n.icon]}<span>${n.label}</span>
              </a>`).join('')}
          </nav>
          <div class="sidebar-foot">
            <div class="avatar">${initials(user)}</div>
            <div>
              <div class="sidebar-user-name">${user.firstName} ${user.lastName}</div>
              <div class="sidebar-user-role">${roleLabel(user.role)}</div>
            </div>
            <button class="logout-btn" data-action="logout" title="Cikis yap">${ICONS.logout}</button>
          </div>
        </aside>

        <div class="main">
          <header class="topbar">
            <div class="topbar-title">${title}</div>
            <div class="topbar-actions">
              <span class="text-muted" style="font-size:13px">${user.firstName} ${user.lastName}</span>
              <div class="avatar" style="width:30px;height:30px;font-size:11px">${initials(user)}</div>
              <button class="btn btn-outline" data-action="logout-top" title="Cikis yap" style="padding:7px 12px; min-height:auto; gap:6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
                <span>Çıkış</span>
              </button>
            </div>
          </header>
          <div class="page" data-page-slot></div>
        </div>

        <nav class="bottom-nav" data-bottom-nav-root>
          ${bottomNav.map((n) => `
            <a class="bottom-nav-item" data-path="${n.path}" href="#${n.path}">
              ${ICONS[n.icon]}<span>${n.label}</span>
            </a>`).join('')}
        </nav>
      </div>
    `;

    container.querySelector('[data-action="logout"]').addEventListener('click', async () => {
      await Auth.logout();
      Router.navigate('/login');
    });
    container.querySelector('[data-action="logout-top"]').addEventListener('click', async () => {
      await Auth.logout();
      Router.navigate('/login');
    });

    return container.querySelector('[data-page-slot]');
  }

  function highlightActiveNav(path) {
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  return { renderShell, highlightActiveNav };
})();
