const PartnerSalesPage = {
  stocks: [],
  shippingRates: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Satış' });
    slot.innerHTML = `
      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="section-title">Yeni Satış Kaydı</div>
        <form id="sale-form">
          <div class="field-row">
            <div class="field">
              <label>Ürün</label>
              <select name="variantId" id="sale-variant" required>
                <option value="">Seçiniz...</option>
              </select>
            </div>
            <div class="field"><label>Adet</label><input name="quantity" type="number" min="1" value="1" id="sale-qty" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Satış Fiyatı (TL)</label><input name="unitPrice" id="sale-price" type="number" step="0.01" min="0" required /></div>
            <div class="field">
              <label>Teslimat</label>
              <select name="channel" id="sale-channel" required>
                <option value="ELDEN">Elden</option>
                <option value="KARGO">Kargo</option>
              </select>
            </div>
          </div>
          <div id="shipping-options" style="display:none; margin-bottom:14px;">
            <div class="checkbox-row">
              <input type="checkbox" id="shipping-paid-by-admin" name="shippingPaidByAdmin" />
              <label for="shipping-paid-by-admin" style="margin:0">Kargo ücretini Belhandar karşılasın (müşteriden alınmayacak)</label>
            </div>
          </div>
          <div id="shipping-preview" style="display:none; background:var(--ivory); border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px 14px; margin-bottom:16px; font-size:13px;"></div>
          <div class="field-row">
            <div class="field"><label>Müşteri Adı <span class="text-muted">(opsiyonel)</span></label><input name="customerName" /></div>
            <div class="field"><label>Müşteri Telefonu <span class="text-muted">(opsiyonel)</span></label><input name="customerPhone" /></div>
          </div>
          <div class="field"><label>Not <span class="text-muted">(opsiyonel)</span></label><input name="note" /></div>
          <div id="sale-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold" id="sale-submit">Satışı Kaydet</button>
        </form>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div class="section-title" style="margin:0">Satış Geçmişi</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select id="sales-year-filter" style="padding:7px 10px; border:1px solid var(--border-strong); border-radius:6px; font-size:13px;"></select>
          <select id="sales-month-filter" style="padding:7px 10px; border:1px solid var(--border-strong); border-radius:6px; font-size:13px;">
            <option value="">Tüm Yıl</option>
            <option value="1">Ocak</option><option value="2">Şubat</option><option value="3">Mart</option>
            <option value="4">Nisan</option><option value="5">Mayıs</option><option value="6">Haziran</option>
            <option value="7">Temmuz</option><option value="8">Ağustos</option><option value="9">Eylül</option>
            <option value="10">Ekim</option><option value="11">Kasım</option><option value="12">Aralık</option>
          </select>
        </div>
      </div>
      <div id="sales-period-summary" style="margin-bottom:16px;"></div>
      <div id="sales-list"></div>
    `;

    this.populateYearFilter(slot);

    await this.loadStockOptions(slot);
    await this.loadShippingRates();
    this.bindShippingPreview(slot);
    slot.querySelector('#sale-form').addEventListener('submit', (e) => this.submitSale(e, slot));

    const reload = () => this.loadSales(slot);
    slot.querySelector('#sales-year-filter').addEventListener('change', reload);
    slot.querySelector('#sales-month-filter').addEventListener('change', reload);
    await this.loadSales(slot);
  },

  populateYearFilter(slot) {
    const select = slot.querySelector('#sales-year-filter');
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);
    select.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
  },

  async loadShippingRates() {
    try {
      const { data } = await Api.get('/shipping-rates');
      this.shippingRates = data;
    } catch (_e) {
      this.shippingRates = [];
    }
  },

  calcShippingFee(amountCents) {
    const match = this.shippingRates
      .filter((r) => r.minAmountCents <= amountCents && (r.maxAmountCents === null || amountCents <= r.maxAmountCents))
      .sort((a, b) => b.minAmountCents - a.minAmountCents)[0];
    return match ? match.feeCents : 0;
  },

  bindShippingPreview(slot) {
    const update = () => {
      const channel = slot.querySelector('#sale-channel').value;
      const qty = Number(slot.querySelector('#sale-qty').value) || 0;
      const price = Number(slot.querySelector('#sale-price').value) || 0;
      const preview = slot.querySelector('#shipping-preview');
      const optionsWrap = slot.querySelector('#shipping-options');
      const paidByAdmin = slot.querySelector('#shipping-paid-by-admin').checked;

      optionsWrap.style.display = channel === 'KARGO' ? 'block' : 'none';

      if (channel !== 'KARGO' || qty <= 0 || price <= 0) {
        preview.style.display = 'none';
        return;
      }

      const amountCents = Math.round(price * qty * 100);
      const feeCents = this.calcShippingFee(amountCents);
      const customerTotal = paidByAdmin ? amountCents : amountCents + feeCents;

      preview.style.display = 'block';
      preview.innerHTML = `
        <div style="display:flex; justify-content:space-between;"><span class="text-muted">Ürün Tutarı</span><span>${this.fmtTl(amountCents)}</span></div>
        <div style="display:flex; justify-content:space-between;">
          <span class="text-muted">Kargo Ücreti</span>
          <span>${this.fmtTl(feeCents)} ${paidByAdmin ? '<span class="text-muted">(Belhandar karşılıyor)</span>' : '<span class="text-muted">(karşı ödemeli)</span>'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700; margin-top:4px; padding-top:4px; border-top:1px solid var(--border);">
          <span>Müşteriden İstenecek Toplam</span><span>${this.fmtTl(customerTotal)}</span>
        </div>
        ${feeCents === 0 ? '<div class="text-muted" style="font-size:11px; margin-top:4px;">Bu tutar aralığı için henüz kargo ücreti tanımlanmamış.</div>' : ''}
      `;
    };

    ['#sale-channel', '#sale-qty', '#sale-price', '#shipping-paid-by-admin'].forEach((sel) => {
      slot.querySelector(sel).addEventListener('input', update);
      slot.querySelector(sel).addEventListener('change', update);
    });
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadStockOptions(slot) {
    const select = slot.querySelector('#sale-variant');
    try {
      const { data: stocks } = await Api.get('/stocks/me');
      this.stocks = stocks.filter((s) => s.quantity > 0);
      if (!this.stocks.length) {
        select.innerHTML = `<option value="">Satılabilir stoğunuz yok</option>`;
        return;
      }
      select.innerHTML = `<option value="">Seçiniz...</option>` + this.stocks.map((s) => `
        <option value="${s.variant.id}" data-retail="${s.variant.retailPriceCents / 100}" data-max="${s.quantity}">
          ${s.variant.product.name} (${s.variant.volumeMl}ml) — stok: ${s.quantity}
        </option>
      `).join('');

      select.addEventListener('change', () => {
        const opt = select.selectedOptions[0];
        const priceInput = slot.querySelector('#sale-price');
        if (opt && opt.dataset.retail) priceInput.value = opt.dataset.retail;
      });
    } catch (err) {
      select.innerHTML = `<option value="">Yüklenemedi</option>`;
    }
  },

  async submitSale(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#sale-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = {
      channel: fd.get('channel'),
      customerName: fd.get('customerName') || undefined,
      customerPhone: fd.get('customerPhone') || undefined,
      note: fd.get('note') || undefined,
      shippingPaidByAdmin: slot.querySelector('#shipping-paid-by-admin').checked,
      items: [{
        variantId: fd.get('variantId'),
        quantity: Number(fd.get('quantity')),
        unitPrice: Number(fd.get('unitPrice')),
      }],
    };

    if (!payload.items[0].variantId) {
      errorBox.textContent = 'Lütfen bir ürün seçin.';
      errorBox.style.display = 'block';
      return;
    }

    const btn = slot.querySelector('#sale-submit');
    btn.disabled = true;
    try {
      await Api.post('/sales', payload);
      Toast.success('Satış kaydedildi.');
      form.reset();
      await this.loadStockOptions(slot);
      await this.loadSales(slot);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  async loadSales(slot) {
    const wrap = slot.querySelector('#sales-list');
    const summaryWrap = slot.querySelector('#sales-period-summary');
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    summaryWrap.innerHTML = '';

    const year = slot.querySelector('#sales-year-filter').value;
    const month = slot.querySelector('#sales-month-filter').value;
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);

    try {
      const { data: sales } = await Api.get(`/sales/me?${params.toString()}`);
      const completed = sales.filter((s) => s.status === 'COMPLETED');
      const totalUnits = completed.reduce((sum, s) => sum + s.items.reduce((u, i) => u + i.quantity, 0), 0);
      const totalRevenue = completed.reduce((sum, s) => sum + s.totalAmountCents, 0);
      const totalProfit = completed.reduce((sum, s) => sum + s.totalProfitCents, 0);
      const periodLabel = month
        ? `${['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][month]} ${year}`
        : `${year} (Tüm Yıl)`;

      summaryWrap.innerHTML = `
        <div class="stat-grid" style="margin-bottom:0;">
          <div class="stat-card"><div class="stat-label">${periodLabel} — Satılan Adet</div><div class="stat-value">${totalUnits}</div></div>
          <div class="stat-card"><div class="stat-label">${periodLabel} — Ciro</div><div class="stat-value">${this.fmtTl(totalRevenue)}</div></div>
          <div class="stat-card"><div class="stat-label">${periodLabel} — Kazanç</div><div class="stat-value">${this.fmtTl(totalProfit)}</div></div>
        </div>
      `;

      if (!sales.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🧾</div><h3>Bu dönemde satış kaydınız yok</h3></div></div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Ürün</th><th>Tutar</th><th>Kargo</th><th>Kazanç</th><th>Müşteri</th><th>Kanal</th><th>Durum</th><th></th></tr></thead>
            <tbody>
              ${sales.map((s) => `
                <tr>
                  <td class="mono">${new Date(s.saleDate).toLocaleDateString('tr-TR')}</td>
                  <td>${s.items.map((i) => `${i.variant.product.name} x${i.quantity}`).join(', ')}</td>
                  <td>${this.fmtTl(s.totalAmountCents)}</td>
                  <td>${s.channel === 'KARGO' ? `${this.fmtTl(s.shippingFeeCents || 0)} ${s.shippingPaidByAdmin ? '<span class="badge badge-gold" style="font-size:9.5px;">Belhandar öder</span>' : ''}<div class="text-muted" style="font-size:10.5px;">Müşteri toplamı: ${this.fmtTl(s.totalAmountCents + (s.shippingPaidByAdmin ? 0 : (s.shippingFeeCents || 0)))}</div>` : '—'}</td>
                  <td style="color:var(--sage); font-weight:600;">${this.fmtTl(s.totalProfitCents)}</td>
                  <td style="font-size:12.5px;">
                    ${s.customerName ? `<div style="font-weight:600;">${s.customerName}</div>` : '<span class="text-muted">—</span>'}
                    ${s.customerPhone ? `<div class="text-muted mono" style="font-size:11px;">${s.customerPhone}</div>` : ''}
                    ${s.note ? `<div class="text-muted" style="font-size:11px; font-style:italic;">"${s.note}"</div>` : ''}
                  </td>
                  <td>${s.channel === 'KARGO' ? 'Kargo' : 'Elden'}</td>
                  <td>${s.status === 'VOID' ? '<span class="badge badge-wine">İptal</span>' : '<span class="badge badge-sage">Tamamlandı</span>'}</td>
                  <td>${s.status === 'COMPLETED' ? `<button class="btn btn-outline" data-void="${s.id}" style="padding:5px 10px; min-height:auto; font-size:12px;">İptal Et</button>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      wrap.querySelectorAll('[data-void]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const reason = prompt('İptal gerekçesi:');
          if (!reason) return;
          btn.disabled = true;
          try {
            await Api.patch(`/sales/${btn.dataset.void}/void`, { reason });
            Toast.success('Satış iptal edildi, stok ve kazanç geri alındı.');
            this.loadSales(slot);
          } catch (err) {
            Toast.error(err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },
};
