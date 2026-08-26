const AdminDashboardPage = {
  async render(container) {
    const user = Auth.getUser();
    const slot = Layout.renderShell(container, { title: 'Dashboard' });
    slot.innerHTML = `<div class="card card-pad" style="text-align:center; padding:50px;"><div class="spinner" style="margin:0 auto"></div></div>`;

    try {
      const { data: stats } = await Api.get('/dashboard/admin');
      this.renderContent(slot, user, stats);
    } catch (err) {
      slot.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  renderContent(slot, user, stats) {
    slot.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Toplam Paydas</div><div class="stat-value">${stats.totalPartners}</div></div>
        <div class="stat-card"><div class="stat-label">Aktif Paydas</div><div class="stat-value">${stats.activePartners}</div></div>
        <div class="stat-card"><div class="stat-label">Bekleyen Paydas</div><div class="stat-value">${stats.pendingPartners}</div>
          ${stats.pendingPartners > 0 ? `<div class="stat-sub"><a href="#/admin/partners" style="color:var(--gold-dim); font-weight:600;">Incelemek icin tikla &rarr;</a></div>` : ''}
        </div>
        <div class="stat-card"><div class="stat-label">Aktif Urun (Varyant)</div><div class="stat-value">${stats.totalProducts}</div></div>
        <div class="stat-card"><div class="stat-label">Toplam Merkez Stok</div><div class="stat-value">${stats.totalCentralStock}</div></div>
        <div class="stat-card"><div class="stat-label">Bugunku Satis</div><div class="stat-value">${this.fmtTl(stats.todaySalesRevenueCents)}</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ayki Satis</div><div class="stat-value">${this.fmtTl(stats.monthSalesRevenueCents)}</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ay Odenecek Kazanc</div><div class="stat-value">${this.fmtTl(stats.monthPayableEarningsCents)}</div></div>
        <div class="stat-card"><div class="stat-label">Bekleyen Siparis</div><div class="stat-value">${stats.pendingOrders}</div></div>
        <div class="stat-card"><div class="stat-label">Uretimdeki Siparis</div><div class="stat-value">${stats.inProductionOrders}</div></div>
        <div class="stat-card"><div class="stat-label">Kargodaki Siparis</div><div class="stat-value">${stats.shippedOrders}</div></div>
      </div>
      <div class="card card-pad">
        <div class="section-title">Hos geldiniz, ${user.firstName} ${user.lastName}</div>
        <p class="text-muted">
          Aktif moduller: Paydas Yonetimi, Urun + Komisyon, Siparis, Stok, Satis + Kazanc.
          Odeme ve raporlama ekranlari sonraki asamalarda eklenecek.
        </p>
      </div>
    `;
  },
};
