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

      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="section-title">Cüzdanım</div>
        <div style="display:flex; gap:24px; flex-wrap:wrap; margin-bottom:16px;">
          <div><div class="text-muted" style="font-size:12px;">Ödenen</div><div style="font-weight:700; font-size:16px;">${this.fmtTl(earnings.paidCents)}</div></div>
          <div><div class="text-muted" style="font-size:12px;">Talep Edildi (Onay Bekliyor)</div><div style="font-weight:700; font-size:16px; color:var(--amber);">${this.fmtTl(earnings.requestedCents)}</div></div>
          <div><div class="text-muted" style="font-size:12px;">Talep Edebileceğiniz Tutar</div><div style="font-weight:700; font-size:16px; color:var(--sage);">${this.fmtTl(earnings.availableToRequestCents)}</div></div>
        </div>
        <button class="btn btn-gold" id="btn-request-payment" ${earnings.availableToRequestCents <= 0 ? 'disabled' : ''}>Ödeme Talep Et</button>
        <div id="request-payment-form" style="display:none; margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
          <div class="field" style="max-width:260px;">
            <label>Talep Tutarı (TL)</label>
            <input type="number" id="request-amount" step="0.01" min="0" max="${earnings.availableToRequestCents / 100}" value="${(earnings.availableToRequestCents / 100).toFixed(2)}" />
          </div>
          <div id="request-payment-error" class="field-error" style="display:none; margin-bottom:10px;"></div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-gold" id="btn-submit-request">Talebi Gönder</button>
            <button class="btn btn-ghost" id="btn-cancel-request">Vazgeç</button>
          </div>
        </div>
      </div>

      <div class="section-title" style="margin-top:24px;">Ödeme Geçmişi</div>
      <div id="payment-history"></div>
    `;

    const requestBtn = slot.querySelector('#btn-request-payment');
    const requestForm = slot.querySelector('#request-payment-form');
    requestBtn.addEventListener('click', () => {
      requestForm.style.display = requestForm.style.display === 'none' ? 'block' : 'none';
    });
    slot.querySelector('#btn-cancel-request').addEventListener('click', () => {
      requestForm.style.display = 'none';
    });
    slot.querySelector('#btn-submit-request').addEventListener('click', async () => {
      const errorBox = slot.querySelector('#request-payment-error');
      errorBox.style.display = 'none';
      const amount = parseFloat(slot.querySelector('#request-amount').value);
      if (!amount || amount <= 0) {
        errorBox.textContent = 'Geçerli bir tutar giriniz.';
        errorBox.style.display = 'block';
        return;
      }
      const btn = slot.querySelector('#btn-submit-request');
      btn.disabled = true;
      try {
        await Api.post('/payments/request', { amount });
        Toast.success('Ödeme talebiniz gönderildi.');
        const [{ data: freshStats }, { data: freshEarnings }] = await Promise.all([
          Api.get('/dashboard/partner'),
          Api.get('/earnings/me/summary'),
        ]);
        this.renderContent(slot, user, freshStats, freshEarnings);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
        btn.disabled = false;
      }
    });

    this.loadPaymentHistory(slot.querySelector('#payment-history'));
  },

  statusBadge(status) {
    const map = {
      PENDING: ['badge-gold', 'Onay Bekliyor'],
      PAID: ['badge-sage', 'Ödendi'],
      CANCELLED: ['badge-wine', 'Reddedildi'],
    };
    const [cls, label] = map[status] || ['badge-neutral', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  async loadPaymentHistory(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:20px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: payments } = await Api.get('/payments/me');
      if (!payments.length) {
        wrap.innerHTML = `<div class="card card-pad text-muted">Henüz ödeme talebiniz veya kaydınız yok.</div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Tutar</th><th>Durum</th><th>Açıklama</th></tr></thead>
            <tbody>
              ${payments.map((p) => `
                <tr>
                  <td class="mono">${new Date(p.paidAt || p.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>${this.fmtTl(p.amountCents)}</td>
                  <td>${this.statusBadge(p.status)}</td>
                  <td class="text-muted">${p.description || p.rejectionReason || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },
};
