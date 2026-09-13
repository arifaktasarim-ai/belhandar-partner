const AdminReportsPage = {
  PALETTE: ['#b08d3f', '#4c6146', '#7a2f3f', '#9c6b1f', '#6f6a5e', '#2d2a21', '#d8be86', '#8a6f30', '#3f6b7a', '#7a3f6b'],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Raporlar' });
    slot.innerHTML = `
      <div class="section-title">Excel / CSV Raporları</div>
      <p class="text-muted" style="margin-bottom:18px;">
        İndirdiğiniz dosyalar Excel'de doğrudan açılabilir (CSV formatında, Türkçe karakter uyumlu).
      </p>
      <div class="stat-grid" id="reports-grid" style="margin-bottom:28px;"></div>

      <div class="section-title">Analiz ve İstatistikler</div>
      <p class="text-muted" style="margin-bottom:16px;">
        Kartlara veya listedeki bir satıra tıklayarak ilgili yönetim sayfasına, o kayda odaklanmış şekilde geçebilirsiniz.
      </p>
      <div id="analytics-wrap"><div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div></div>
    `;

    const csvReports = [
      { key: 'sales', title: 'Satış Raporu', desc: 'Tüm satışlar, paydaş, ürün, kazanç detayıyla.' },
      { key: 'partners', title: 'Paydaş Raporu', desc: 'Paydaş performans özeti, ciro ve kazanç.' },
      { key: 'stock', title: 'Stok Raporu', desc: 'Merkez ve paydaş bazında stok durumu.' },
      { key: 'payments', title: 'Ödeme Raporu', desc: 'Yapılan tüm ödemeler ve kim tarafından yapıldığı.' },
      { key: 'monthly-earnings', title: 'Aylık Kazanç Raporu', desc: 'Bu ay paydaş bazında kazanç dökümü.' },
    ];

    const grid = slot.querySelector('#reports-grid');
    grid.innerHTML = csvReports.map((r) => `
      <div class="card card-pad">
        <div style="font-weight:700; margin-bottom:6px;">${r.title}</div>
        <div class="text-muted" style="font-size:12.5px; margin-bottom:14px;">${r.desc}</div>
        <button class="btn btn-outline btn-block" data-download="${r.key}">İndir (CSV)</button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-download]').forEach((btn) => {
      btn.addEventListener('click', () => this.download(btn));
    });

    await this.loadAnalytics(slot.querySelector('#analytics-wrap'));
  },

  async download(btn) {
    const key = btn.dataset.download;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Hazırlanıyor...';
    try {
      const res = await fetch(`${window.BELHANDAR_CONFIG.API_BASE_URL}/reports/${key}`, {
        headers: { Authorization: `Bearer ${Api.getAccessToken()}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Rapor indirilemedi.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `belhandar-${key}-raporu.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Toast.success('Rapor indirildi.');
    } catch (err) {
      Toast.error(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadAnalytics(wrap) {
    try {
      const { data } = await Api.get('/reports/analytics');
      wrap.innerHTML = `<div class="reports-grid"></div>`;
      const grid = wrap.querySelector('.reports-grid');

      grid.appendChild(this.buildTableCard(
        'En Çok Satan Paydaşlar', data.topPartners,
        (p) => ({ primary: p.name, secondary: `${p.unitsSold} adet`, value: this.fmtTl(p.revenueCents) }),
        (p) => ReportNav.goTo('/admin/sales', ReportNav.KEYS.SALES_PARTNER, { id: p.partnerProfileId, name: p.name }),
      ));

      grid.appendChild(this.buildTableCard(
        'En Çok Satılan Ürünler', data.topProducts,
        (p) => ({ primary: p.name, secondary: `${p.unitsSold} adet`, value: this.fmtTl(p.revenueCents) }),
        (p) => ReportNav.goTo('/admin/products', ReportNav.KEYS.PRODUCTS_SEARCH, p.name),
      ));

      grid.appendChild(this.buildTableCard(
        'En Çok Alışveriş Yapan Müşteriler', data.topCustomers,
        (c) => ({ primary: c.name, secondary: `${c.totalOrders} sipariş`, value: this.fmtTl(c.totalSpentCents) }),
        (c) => ReportNav.goTo('/admin/customers', ReportNav.KEYS.CUSTOMERS_SEARCH, c.name),
      ));

      grid.appendChild(this.buildDonutCard(
        'Satış Kanalı Dağılımı (Kargo / Elden)', data.channelDistribution,
        (item) => ReportNav.goTo('/admin/sales', ReportNav.KEYS.SALES_CHANNEL, item.key),
      ));

      grid.appendChild(this.buildDonutCard(
        'Sipariş Durumu Dağılımı', data.orderStatusDistribution,
        (item) => ReportNav.goTo('/admin/orders', ReportNav.KEYS.ORDERS_STATUS, item.key),
      ));

      grid.appendChild(this.buildDonutCard(
        'Ödeme Durumu Dağılımı', data.paymentStatusDistribution,
        () => ReportNav.goTo('/admin/payments'),
      ));

      grid.appendChild(this.buildDonutCard(
        'Komisyon Planı Dağılımı', data.commissionPlanDistribution,
        () => ReportNav.goTo('/admin/partners'),
      ));

      grid.appendChild(this.buildDonutCard(
        'İade Durumu Dağılımı', data.returnStatusDistribution,
        (item) => ReportNav.goTo('/admin/returns', ReportNav.KEYS.RETURNS_STATUS, item.key),
      ));

      grid.appendChild(this.buildDonutCard(
        'Satış Durumu Dağılımı (Tamamlandı/İptal)', data.saleStatusDistribution,
        (item) => ReportNav.goTo('/admin/sales', ReportNav.KEYS.SALES_STATUS, item.key),
      ));

      grid.appendChild(this.buildDonutCard(
        'Stok Durumu Dağılımı', data.stockLevelDistribution,
        () => ReportNav.goTo('/admin/stocks'),
      ));
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  // --- Tablo tipi kart (en cok satan paydas/urun/musteri) ---
  buildTableCard(title, items, mapRow, onRowClick) {
    const card = document.createElement('div');
    card.className = 'report-card';
    const bodyHtml = !items || !items.length
      ? `<div class="report-empty">Henüz veri yok</div>`
      : items.map((item, i) => {
          const row = mapRow(item);
          return `
            <div class="report-table-row" data-idx="${i}">
              <span class="report-rank">${i + 1}</span>
              <span style="flex:1; min-width:0;">
                <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${row.primary}</div>
                <div class="text-muted" style="font-size:11px;">${row.secondary}</div>
              </span>
              <span style="font-weight:700; flex-shrink:0;">${row.value}</span>
            </div>
          `;
        }).join('');

    card.innerHTML = `<div class="report-card-title">${title}</div><div class="report-card-body">${bodyHtml}</div>`;

    if (items && items.length) {
      card.querySelectorAll('[data-idx]').forEach((el) => {
        el.addEventListener('click', () => onRowClick(items[Number(el.dataset.idx)]));
      });
    }
    return card;
  },

  // --- Donut (pasta) grafik karti ---
  buildDonutCard(title, items, onSliceClick) {
    const card = document.createElement('div');
    card.className = 'report-card';
    const total = (items || []).reduce((s, i) => s + i.count, 0);

    if (!total) {
      card.innerHTML = `<div class="report-card-title">${title}</div><div class="report-card-body"><div class="report-empty">Henüz veri yok</div></div>`;
      return card;
    }

    let cumulative = 0;
    const gradientParts = items.map((item, i) => {
      const start = (cumulative / total) * 360;
      cumulative += item.count;
      const end = (cumulative / total) * 360;
      return `${this.PALETTE[i % this.PALETTE.length]} ${start}deg ${end}deg`;
    });

    const legendHtml = items.map((item, i) => `
      <div class="legend-item" data-idx="${i}">
        <span class="legend-dot" style="background:${this.PALETTE[i % this.PALETTE.length]};"></span>
        <span class="legend-label">${item.label}</span>
        <span class="legend-count">${item.count}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="report-card-title">${title}</div>
      <div class="report-card-body">
        <div class="donut-wrap">
          <div style="position:relative;">
            <div class="donut" style="background: conic-gradient(${gradientParts.join(', ')});"></div>
            <div class="donut-total">${total}</div>
          </div>
        </div>
        <div class="legend-list">${legendHtml}</div>
      </div>
    `;

    card.querySelectorAll('[data-idx]').forEach((el) => {
      el.addEventListener('click', () => onSliceClick(items[Number(el.dataset.idx)]));
    });
    return card;
  },
};
