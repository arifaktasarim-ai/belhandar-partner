const AdminProductsPage = {
  plans: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Ürünler' });
    slot.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div class="section-title" style="margin:0">Ürün Kataloğu</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" id="btn-plans">Komisyon Planları</button>
          <button class="btn btn-gold" id="btn-new-product">+ Yeni Ürün</button>
        </div>
      </div>
      <div id="products-wrap"></div>

      <!-- Yeni urun formu (modal benzeri panel) -->
      <div id="product-form-panel" class="card card-pad" style="display:none; margin-top:16px;">
        <div class="section-title">Yeni Ürün Ekle</div>
        <form id="product-form">
          <div class="field-row">
            <div class="field"><label>Ürün Adı</label><input name="name" required /></div>
            <div class="field"><label>Ürün Kodu</label><input name="productCode" placeholder="BH-NOIR" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Parfüm Tipi</label><input name="perfumeType" placeholder="Eau de Parfum" /></div>
            <div class="field"><label>Görsel URL <span class="text-muted">(opsiyonel)</span></label><input name="imageUrl" type="url" /></div>
          </div>
          <div class="field"><label>Açıklama</label><textarea name="description" rows="2"></textarea></div>

          <div class="section-title" style="font-size:14px; margin-top:20px;">İlk Varyant</div>
          <div class="field-row">
            <div class="field"><label>Hacim (ml)</label><input name="volumeMl" type="number" min="1" required /></div>
            <div class="field"><label>SKU</label><input name="sku" placeholder="BH-NOIR-50" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Barkod <span class="text-muted">(opsiyonel)</span></label><input name="barcode" /></div>
            <div class="field"><label>Merkez Stok</label><input name="centralStock" type="number" min="0" value="0" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Satış Fiyatı (TL)</label><input name="retailPrice" type="number" step="0.01" min="0" required /></div>
            <div class="field"><label>Paydaş Fiyatı (TL)</label><input name="partnerPrice" type="number" step="0.01" min="0" required /></div>
          </div>
          <div class="field" style="max-width:220px;"><label>Minimum Stok Seviyesi</label><input name="minStockLevel" type="number" min="0" value="10" required /></div>

          <div id="product-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <div style="display:flex; gap:8px;">
            <button type="submit" class="btn btn-gold">Ürünü Kaydet</button>
            <button type="button" class="btn btn-ghost" id="btn-cancel-product">Vazgeç</button>
          </div>
        </form>
      </div>

      <!-- Komisyon planlari paneli -->
      <div id="plans-panel" class="card card-pad" style="display:none; margin-top:16px;">
        <div class="section-title">Komisyon Planları</div>
        <div id="plans-list"></div>
        <hr style="border:none; border-top:1px solid var(--border); margin:18px 0;" />
        <div class="section-title" style="font-size:14px;">Yeni Plan Ekle</div>
        <form id="plan-form">
          <div class="field-row">
            <div class="field"><label>Plan Adı</label><input name="name" placeholder="orn. Kidemli %30" required /></div>
            <div class="field">
              <label>Tip</label>
              <select name="type">
                <option value="PERCENTAGE">Yüzde bazlı</option>
                <option value="FIXED">Sabit TL bazlı</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Değer <span class="text-muted">(yüzde ise "25", sabit ise TL tutar)</span></label><input name="value" type="number" step="0.01" min="0" required /></div>
            <div class="field checkbox-row" style="align-items:center; margin-top:22px;">
              <input type="checkbox" id="plan-default" name="isDefault" /><label for="plan-default" style="margin:0">Varsayılan plan yap</label>
            </div>
          </div>
          <div id="plan-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Planı Kaydet</button>
        </form>
      </div>
    `;

    slot.querySelector('#btn-new-product').addEventListener('click', () => {
      slot.querySelector('#product-form-panel').style.display = 'block';
      slot.querySelector('#plans-panel').style.display = 'none';
      slot.querySelector('#product-form-panel').scrollIntoView({ behavior: 'smooth' });
    });
    slot.querySelector('#btn-cancel-product').addEventListener('click', () => {
      slot.querySelector('#product-form-panel').style.display = 'none';
    });
    slot.querySelector('#btn-plans').addEventListener('click', async () => {
      const panel = slot.querySelector('#plans-panel');
      const willShow = panel.style.display === 'none';
      panel.style.display = willShow ? 'block' : 'none';
      slot.querySelector('#product-form-panel').style.display = 'none';
      if (willShow) await this.loadPlans(slot);
    });

    slot.querySelector('#product-form').addEventListener('submit', (e) => this.submitProduct(e, slot));
    slot.querySelector('#plan-form').addEventListener('submit', (e) => this.submitPlan(e, slot));

    await this.loadProducts(slot.querySelector('#products-wrap'));
  },

  async loadProducts(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: products } = await Api.get('/products?all=true');
      if (!products.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🧴</div><h3>Henüz ürün yok</h3><p>"Yeni Ürün" ile ilk ürününüzü ekleyin.</p></div></div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr>
              <th>Ürün</th><th>Varyant</th><th>Satış Fiyatı</th><th>Paydaş Fiyatı</th><th>Kâr</th><th>Stok</th><th>Durum</th>
            </tr></thead>
            <tbody>
              ${products.map((p) => p.variants.map((v, i) => this.rowHtml(p, v, i)).join('')).join('')}
            </tbody>
          </table>
        </div>
        <div class="record-cards">
          ${products.map((p) => p.variants.map((v) => this.cardHtml(p, v)).join('')).join('')}
        </div>
      `;
      this.bindToggles(wrap);
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  rowHtml(product, variant, i) {
    const profit = variant.retailPriceCents - variant.partnerPriceCents;
    const lowStock = variant.centralStock <= variant.minStockLevel;
    return `
      <tr>
        <td>${i === 0 ? `<div style="font-weight:600">${product.name}</div><div class="text-muted" style="font-size:12px">${product.productCode}</div>` : ''}</td>
        <td class="mono">${variant.volumeMl} ml <span class="text-muted">(${variant.sku})</span></td>
        <td>${this.fmtTl(variant.retailPriceCents)}</td>
        <td>${this.fmtTl(variant.partnerPriceCents)}</td>
        <td style="color:var(--sage); font-weight:600;">${this.fmtTl(profit)}</td>
        <td>
          ${variant.centralStock} ${lowStock ? '<span class="badge badge-wine" style="margin-left:4px;">Düşük</span>' : ''}
        </td>
        <td>
          <button class="btn ${variant.isActive ? 'btn-outline' : 'btn-gold'}" data-toggle="${variant.id}" data-active="${variant.isActive}" style="padding:5px 10px; min-height:auto; font-size:12px;">
            ${variant.isActive ? 'Aktif' : 'Pasif'}
          </button>
        </td>
      </tr>
    `;
  },

  cardHtml(product, variant) {
    const profit = variant.retailPriceCents - variant.partnerPriceCents;
    return `
      <div class="record-card">
        <div style="font-weight:600">${product.name} — ${variant.volumeMl} ml</div>
        <div class="text-muted" style="font-size:12px">${variant.sku}</div>
        <div class="record-card-row"><span class="label">Satış</span><span>${this.fmtTl(variant.retailPriceCents)}</span></div>
        <div class="record-card-row"><span class="label">Paydaş</span><span>${this.fmtTl(variant.partnerPriceCents)}</span></div>
        <div class="record-card-row"><span class="label">Kâr</span><span style="color:var(--sage)">${this.fmtTl(profit)}</span></div>
        <div class="record-card-row"><span class="label">Stok</span><span>${variant.centralStock}</span></div>
        <button class="btn ${variant.isActive ? 'btn-outline' : 'btn-gold'}" data-toggle="${variant.id}" data-active="${variant.isActive}" style="margin-top:8px; width:100%;">
          ${variant.isActive ? 'Aktif — Pasife Al' : 'Pasif — Aktif Et'}
        </button>
      </div>
    `;
  },

  bindToggles(wrap) {
    wrap.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === 'true';
        btn.disabled = true;
        try {
          await Api.put(`/products/variants/${btn.dataset.toggle}`, { isActive: !isActive });
          Toast.success('Güncellendi.');
          this.loadProducts(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
  },

  async submitProduct(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#product-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

if (!payload.imageUrl) {
  delete payload.imageUrl;
}

if (!payload.barcode) {
  delete payload.barcode;
}

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Api.post('/products', payload);
      Toast.success('Ürün eklendi.');
      form.reset();
      slot.querySelector('#product-form-panel').style.display = 'none';
      await this.loadProducts(slot.querySelector('#products-wrap'));
    } catch (err) {
      const details = err.details ? Object.values(err.details).flat().join(' ') : '';
      errorBox.textContent = details || err.message;
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  },

  async loadPlans(slot) {
    const list = slot.querySelector('#plans-list');
    list.innerHTML = `<div class="spinner" style="margin:10px auto"></div>`;
    try {
      const { data: plans } = await Api.get('/admin/commission-plans');
      this.plans = plans;
      if (!plans.length) {
        list.innerHTML = `<p class="text-muted">Henüz komisyon planı yok.</p>`;
        return;
      }
      list.innerHTML = plans.map((p) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
          <div>
            <strong>${p.name}</strong>
            <span class="text-muted" style="margin-left:8px;">${p.type === 'PERCENTAGE' ? `%${p.displayValue}` : this.fmtTl(p.value)}</span>
            ${p.isDefault ? '<span class="badge badge-gold" style="margin-left:8px;">Varsayılan</span>' : ''}
          </div>
          <span class="text-muted" style="font-size:12px">${p._count.partners} paydaş kullanıyor</span>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  async submitPlan(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#plan-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form); 
	const payload = Object.fromEntries(fd.entries()); 
	if (!payload.imageUrl) { delete payload.imageUrl; } 
	if (!payload.barcode) { delete payload.barcode; }
    payload.isDefault = form.querySelector('#plan-default').checked;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Api.post('/admin/commission-plans', payload);
      Toast.success('Komisyon planı eklendi.');
      form.reset();
      await this.loadPlans(slot);
    } catch (err) {
      const details = err.details ? Object.values(err.details).flat().join(' ') : '';
      errorBox.textContent = details || err.message;
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  },
};
