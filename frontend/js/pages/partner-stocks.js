const PartnerStocksPage = {
  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Stok' });
    slot.innerHTML = `
      <div class="stat-grid" id="stock-summary"></div>
      <div class="section-title">Mevcut Stoğunuz</div>
      <div id="stock-list"></div>
      <div class="section-title" style="margin-top:24px;">Stok Hareketleri</div>
      <div id="stock-movements"></div>
    `;
    await Promise.all([this.loadStocks(slot), this.loadMovements(slot)]);
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadStocks(slot) {
    const listWrap = slot.querySelector('#stock-list');
    const summaryWrap = slot.querySelector('#stock-summary');
    listWrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: stocks } = await Api.get('/stocks/me');
      const totalUnits = stocks.reduce((s, x) => s + x.quantity, 0);
      const lowStockCount = stocks.filter((x) => x.quantity <= (x.variant.minStockLevel || 10) && x.quantity > 0).length;
      const outOfStockCount = stocks.filter((x) => x.quantity === 0).length;

      summaryWrap.innerHTML = `
        <div class="stat-card"><div class="stat-label">Toplam Ürün Adedi</div><div class="stat-value">${totalUnits}</div></div>
        <div class="stat-card"><div class="stat-label">Düşük Stok</div><div class="stat-value">${lowStockCount}</div></div>
        <div class="stat-card"><div class="stat-label">Tükenen</div><div class="stat-value">${outOfStockCount}</div></div>
      `;

      if (!stocks.length) {
        listWrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">📦</div><h3>Stoğunuz boş</h3><p>Sipariş verip ürün geldiğinde burada görünecek.</p></div></div>`;
        return;
      }

      listWrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Ürün</th><th>Varyant</th><th>Adet</th><th>Durum</th></tr></thead>
            <tbody>
              ${stocks.map((s) => `
                <tr>
                  <td style="font-weight:600">${s.variant.product.name}</td>
                  <td class="mono">${s.variant.volumeMl} ml</td>
                  <td>${s.quantity}</td>
                  <td>${this.stockBadge(s)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="record-cards">
          ${stocks.map((s) => `
            <div class="record-card">
              <div style="font-weight:600">${s.variant.product.name} — ${s.variant.volumeMl} ml</div>
              <div class="record-card-row"><span class="label">Adet</span><span>${s.quantity}</span></div>
              <div class="record-card-row"><span class="label">Durum</span><span>${this.stockBadge(s)}</span></div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      listWrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  stockBadge(s) {
    if (s.quantity === 0) return `<span class="badge badge-wine">Tükendi</span>`;
    if (s.quantity <= (s.variant.minStockLevel || 10)) return `<span class="badge badge-gold">Düşük</span>`;
    return `<span class="badge badge-sage">Yeterli</span>`;
  },

  async loadMovements(slot) {
    const wrap = slot.querySelector('#stock-movements');
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: movements } = await Api.get('/stocks/me/movements');
      if (!movements.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🕓</div><h3>Henüz hareket yok</h3></div></div>`;
        return;
      }
      const typeLabel = {
        ORDER_RECEIVED: 'Sipariş Girişi', SALE: 'Satış', RETURN_OUT: 'İade (Çıkış)',
        RETURN_IN: 'İade Kabul', ADJUSTMENT: 'Düzeltme', CANCELLED_REVERT: 'İptal Geri Alma',
      };
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Ürün</th><th>Tür</th><th>Değişim</th><th>Not</th></tr></thead>
            <tbody>
              ${movements.map((m) => `
                <tr>
                  <td class="mono">${new Date(m.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>${m.variant.product.name} <span class="text-muted">(${m.variant.volumeMl} ml)</span></td>
                  <td>${typeLabel[m.type] || m.type}</td>
                  <td style="color:${m.quantityChange > 0 ? 'var(--sage)' : 'var(--wine)'}; font-weight:600;">
                    ${m.quantityChange > 0 ? '+' : ''}${m.quantityChange}
                  </td>
                  <td class="text-muted" style="font-size:12.5px;">${m.reason || '—'}</td>
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
