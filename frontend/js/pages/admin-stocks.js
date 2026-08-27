const AdminStocksPage = {
  partners: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Stok' });
    slot.innerHTML = `
      <div class="section-title">Düşük Stok Uyarıları</div>
      <div id="low-stock-wrap" style="margin-bottom:24px;"></div>

      <div class="section-title">Merkez Stok (Tüm Ürünler)</div>
      <div id="central-stock-wrap" style="margin-bottom:24px;"></div>

      <div class="section-title">Paydaş Bazında Stok</div>
      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="field" style="margin:0; max-width:340px;">
          <label>Paydaş seçin</label>
          <select id="partner-select"><option value="">Seçiniz...</option></select>
        </div>
      </div>
      <div id="partner-stock-wrap"></div>
    `;

    await this.loadCentralStock(slot);
    await this.loadPartners(slot);

    slot.querySelector('#partner-select').addEventListener('change', (e) => {
      if (e.target.value) this.loadPartnerStock(slot, e.target.value);
      else slot.querySelector('#partner-stock-wrap').innerHTML = '';
    });
  },

  async loadCentralStock(slot) {
    const lowWrap = slot.querySelector('#low-stock-wrap');
    const centralWrap = slot.querySelector('#central-stock-wrap');
    lowWrap.innerHTML = centralWrap.innerHTML = `<div class="spinner" style="margin:14px auto"></div>`;
    try {
      const { data: products } = await Api.get('/products?all=true');
      const variants = products.flatMap((p) => p.variants.map((v) => ({ ...v, productName: p.name })));
      const lowStock = variants.filter((v) => v.centralStock <= v.minStockLevel);

      lowWrap.innerHTML = lowStock.length
        ? `<div class="card">${lowStock.map((v) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 18px; border-bottom:1px solid var(--border);">
              <div>⚠️ <strong>${v.productName}</strong> <span class="text-muted">(${v.volumeMl}ml)</span> stok seviyesi kritik.</div>
              <div class="text-muted">Mevcut: <strong style="color:var(--wine)">${v.centralStock}</strong> · Minimum: ${v.minStockLevel}</div>
            </div>
          `).join('')}</div>`
        : `<div class="card card-pad text-muted">Kritik stok seviyesinde ürün yok.</div>`;

      centralWrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Ürün</th><th>Varyant</th><th>Merkez Stok</th><th>Minimum</th><th>Durum</th></tr></thead>
            <tbody>
              ${variants.map((v) => `
                <tr>
                  <td style="font-weight:600">${v.productName}</td>
                  <td class="mono">${v.volumeMl} ml</td>
                  <td>${v.centralStock}</td>
                  <td class="text-muted">${v.minStockLevel}</td>
                  <td>${v.centralStock <= v.minStockLevel ? '<span class="badge badge-wine">Düşük</span>' : '<span class="badge badge-sage">Yeterli</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      lowWrap.innerHTML = centralWrap.innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  async loadPartners(slot) {
    const select = slot.querySelector('#partner-select');
    try {
      const { data: partners } = await Api.get('/admin/partners?status=ACTIVE');
      this.partners = partners;
      select.innerHTML = `<option value="">Seçiniz...</option>` + partners
        .filter((p) => p.partnerProfile)
        .map((p) => `<option value="${p.partnerProfile.id}">${p.firstName} ${p.lastName}</option>`)
        .join('');
    } catch (_e) {
      select.innerHTML = `<option value="">Yüklenemedi</option>`;
    }
  },

  async loadPartnerStock(slot, partnerProfileId) {
    const wrap = slot.querySelector('#partner-stock-wrap');
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: stocks } = await Api.get(`/stocks/partner/${partnerProfileId}`);
      if (!stocks.length) {
        wrap.innerHTML = `<div class="card card-pad text-muted">Bu paydaşın stoğu bulunmuyor.</div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Ürün</th><th>Varyant</th><th>Adet</th></tr></thead>
            <tbody>
              ${stocks.map((s) => `
                <tr>
                  <td style="font-weight:600">${s.variant.product.name}</td>
                  <td class="mono">${s.variant.volumeMl} ml</td>
                  <td>${s.quantity}</td>
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
