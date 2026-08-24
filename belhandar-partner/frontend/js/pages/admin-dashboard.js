const AdminDashboardPage = {
  async render(container) {
    const user = Auth.getUser();
    const slot = Layout.renderShell(container, { title: 'Dashboard' });

    let pendingCount = '—';
    try {
      const { data } = await Api.get('/admin/partners?status=PENDING_APPROVAL');
      pendingCount = data.length;
    } catch (_e) {
      // sessiz gec
    }

    slot.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Bekleyen Paydas</div><div class="stat-value">${pendingCount}</div>
          ${pendingCount > 0 ? `<div class="stat-sub"><a href="#/admin/partners" style="color:var(--gold-dim); font-weight:600;">Incelemek icin tikla →</a></div>` : ''}
        </div>
        <div class="stat-card"><div class="stat-label">Toplam Paydas</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Bugunku Satis</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ayki Satis</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Bekleyen Siparis</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Uretimdeki Siparis</div><div class="stat-value">—</div></div>
      </div>
      <div class="card card-pad">
        <div class="section-title">Hos geldiniz, ${user.firstName} ${user.lastName}</div>
        <p class="text-muted">
          Su an aktif olan modul: <strong>Paydas Yonetimi</strong> (onay/red/askiya alma).
          Urun, siparis, uretim, stok, odeme ve rapor ekranlari sonraki asamalarda eklenecek.
        </p>
      </div>
    `;
  },
};
