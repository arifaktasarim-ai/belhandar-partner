const PartnerDashboardPage = {
  async render(container) {
    const user = Auth.getUser();
    const slot = Layout.renderShell(container, { title: 'Ana Sayfa' });
    slot.innerHTML = `<div class="card card-pad" style="text-align:center; padding:50px;"><div class="spinner" style="margin:0 auto"></div></div>`;

    try {
      const [{ data: stats }, { data: earnings }] = await Promise.all([
        Api.get('/dashboard/partner'),
        Api.get('/earnings/me/summary'),
      ]);
      this.renderContent(slot, user, stats, earnings);
    } catch (err) {
      slot.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  renderContent(slot, user, stats, earnings) {
    const maxUnits = Math.max(1, ...stats.last7Days.map((d) => d.units));
    const changeLabel = earnings.changePct === null ? '' : `
      <div class="stat-sub ${earnings.changePct >= 0 ? 'positive' : 'negative'}">
        ${earnings.changePct >= 0 ? '+' : ''}${earnings.changePct}% gecen aya gore
      </div>
    `;

    slot.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Bugunku Satis</div><div class="stat-value">${stats.todaySalesUnits}</div><div class="stat-sub">adet</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ay Satilan</div><div class="stat-value">${stats.monthSalesUnits}</div><div class="stat-sub">adet</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ay Kazanc</div><div class="stat-value">${this.fmtTl(earnings.thisMonthCents)}</div>${changeLabel}</div>
        <div class="stat-card"><div class="stat-label">Toplam Kazanc</div><div class="stat-value">${this.fmtTl(earnings.totalEarnedCents)}</div></div>
        <div class="stat-card"><div class="stat-label">Mevcut Stok</div><div class="stat-value">${stats.currentStock}</div><div class="stat-sub">adet</div></div>
        <div class="stat-card"><div class="stat-label">Bekleyen Siparis</div><div class="stat-value">${stats.pendingOrders}</div></div>
        <div class="stat-card"><div class="stat-label">Hazirlanan Siparis</div><div class="stat-value">${stats.preparingOrders}</div></div>
        <div class="stat-card"><div class="stat-label">Kargodaki Siparis</div><div class="stat-value">${stats.shippedOrders}</div></div>
      </div>

      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="section-title">Son 7 Gun Satis</div>
        <div style="display:flex; align-items:flex-end; gap:10px; height:120px; padding-top:10px;">
          ${stats.last7Days.map((d) => `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;">
              <div style="width:100%; max-width:36px; height:${Math.max(4, (d.units / maxUnits) * 90)}px; background:linear-gradient(180deg, var(--gold-light), var(--gold)); border-radius:4px 4px 0 0;"></div>
              <span class="text-muted" style="font-size:10.5px;">${new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card card-pad">
        <div class="section-title">Hos geldiniz, ${user.firstName} ${user.lastName}</div>
        <p class="text-muted">
          Odenen: <strong>${this.fmtTl(earnings.paidCents)}</strong> ·
          Bekleyen: <strong style="color:var(--amber);">${this.fmtTl(earnings.pendingCents)}</strong>
        </p>
      </div>
    `;
  },
};
