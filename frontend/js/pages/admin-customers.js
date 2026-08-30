const AdminCustomersPage = {
  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Müşteriler' });
    slot.innerHTML = `
      <p class="text-muted" style="margin-bottom:16px;">
        Bu liste, paydaşların satış kaydı sırasında girdiği müşteri adı/telefon bilgilerinden otomatik
        oluşturulur. Ayrı bir müşteri kayıt formu yoktur — her satışta girilen bilgiler burada birleşir.
      </p>
      <div class="card card-pad" style="margin-bottom:18px;">
        <div class="field" style="margin:0; max-width:340px;">
          <label>Ara</label>
          <input type="text" id="c-search" placeholder="Müşteri adı veya telefon..." />
        </div>
      </div>
      <div class="stat-grid" id="customers-summary"></div>
      <div id="customers-wrap"></div>
    `;

    let allCustomers = [];
    const wrap = slot.querySelector('#customers-wrap');
    const summary = slot.querySelector('#customers-summary');

    const renderFiltered = (search) => {
      const filtered = search
        ? allCustomers.filter((c) => c.name.toLowerCase().includes(search) || (c.phone || '').toLowerCase().includes(search))
        : allCustomers;
      this.renderList(wrap, filtered);
    };

    slot.querySelector('#c-search').addEventListener('input', (e) => {
      renderFiltered(e.target.value.trim().toLowerCase());
    });

    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data } = await Api.get('/admin/customers');
      allCustomers = data;

      const totalSpent = data.reduce((s, c) => s + c.totalSpentCents, 0);
      const totalOrders = data.reduce((s, c) => s + c.totalOrders, 0);
      summary.innerHTML = `
        <div class="stat-card"><div class="stat-label">Toplam Müşteri</div><div class="stat-value">${data.length}</div></div>
        <div class="stat-card"><div class="stat-label">Toplam Sipariş</div><div class="stat-value">${totalOrders}</div></div>
        <div class="stat-card"><div class="stat-label">Toplam Ciro</div><div class="stat-value">${this.fmtTl(totalSpent)}</div></div>
      `;

      renderFiltered('');
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  renderList(wrap, customers) {
    if (!customers.length) {
      wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">👥</div><h3>Müşteri bulunamadı</h3><p>Paydaşlar satış kaydederken müşteri bilgisi girdikçe burası dolacak.</p></div></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Müşteri</th><th>Telefon</th><th>Sipariş</th><th>Toplam Harcama</th><th>Son Alışveriş</th><th>Satın Aldığı Paydaş(lar)</th><th></th></tr></thead>
          <tbody>
            ${customers.map((c) => `
              <tr>
                <td style="font-weight:600">${c.name}</td>
                <td class="mono">${c.phone || '—'}</td>
                <td>${c.totalOrders}</td>
                <td>${this.fmtTl(c.totalSpentCents)}</td>
                <td class="mono">${new Date(c.lastPurchaseDate).toLocaleDateString('tr-TR')}</td>
                <td class="text-muted" style="font-size:12px; max-width:220px;">${c.partners.join(', ')}</td>
                <td><button class="btn btn-outline" data-detail="${encodeURIComponent(c.key)}" style="padding:5px 10px; min-height:auto; font-size:12px;">Detay</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="record-cards">
        ${customers.map((c) => `
          <div class="record-card">
            <div style="font-weight:600">${c.name}</div>
            <div class="text-muted mono" style="font-size:12px;">${c.phone || '—'}</div>
            <div class="record-card-row"><span class="label">Sipariş</span><span>${c.totalOrders}</span></div>
            <div class="record-card-row"><span class="label">Toplam</span><span>${this.fmtTl(c.totalSpentCents)}</span></div>
            <div class="record-card-row"><span class="label">Son Alışveriş</span><span>${new Date(c.lastPurchaseDate).toLocaleDateString('tr-TR')}</span></div>
            <button class="btn btn-outline btn-block" data-detail="${encodeURIComponent(c.key)}" style="margin-top:8px;">Detay</button>
          </div>
        `).join('')}
      </div>
    `;

    wrap.querySelectorAll('[data-detail]').forEach((btn) => {
      btn.addEventListener('click', () => this.openDetail(btn.dataset.detail));
    });
  },

  async openDetail(encodedKey) {
    const root = document.createElement('div');
    root.id = 'customer-modal-root';
    root.style.cssText = 'position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; background:rgba(22,20,15,0.55); padding:20px;';
    root.innerHTML = `
      <div class="card" style="max-width:560px; width:100%; max-height:88vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border-bottom:1px solid var(--border);">
          <div class="section-title" style="margin:0;">Müşteri Satış Geçmişi</div>
          <button id="modal-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text-muted);">×</button>
        </div>
        <div style="padding:22px;"><div class="spinner" style="margin:20px auto"></div></div>
      </div>
    `;
    document.body.appendChild(root);
    root.addEventListener('click', (e) => { if (e.target === root) root.remove(); });
    root.querySelector('#modal-close').addEventListener('click', () => root.remove());

    try {
      const { data: sales } = await Api.get(`/admin/customers/${encodedKey}/sales`);
      const body = root.querySelector('div[style*="padding:22px"]');
      body.innerHTML = sales.map((s) => `
        <div style="padding:10px 0; border-bottom:1px solid var(--border); font-size:13px;">
          <div style="display:flex; justify-content:space-between;">
            <strong>${s.partnerProfile.user.firstName} ${s.partnerProfile.user.lastName}</strong>
            <span class="mono text-muted">${new Date(s.saleDate).toLocaleDateString('tr-TR')}</span>
          </div>
          <div class="text-muted" style="margin:3px 0;">${s.items.map((i) => `${i.variant.product.name} x${i.quantity}`).join(', ')}</div>
          <div>${this.fmtTl(s.totalAmountCents)}</div>
        </div>
      `).join('') || `<p class="text-muted">Kayıt bulunamadı.</p>`;
    } catch (err) {
      root.querySelector('div[style*="padding:22px"]').innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },
};
