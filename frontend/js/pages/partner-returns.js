const PartnerReturnsPage = {
  sales: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'İadeler' });
    slot.innerHTML = `
      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="section-title">Yeni İade Talebi</div>
        <form id="return-form">
          <div class="field">
            <label>Satış Seçin</label>
            <select id="return-sale" required><option value="">Seçiniz...</option></select>
          </div>
          <div class="field">
            <label>Ürün / Kalem</label>
            <select id="return-item" required disabled><option value="">Önce satış seçin</option></select>
          </div>
          <div class="field-row">
            <div class="field"><label>İade Edilecek Adet</label><input id="return-qty" type="number" min="1" value="1" required /></div>
            <div class="field"><label>Tahmini İade Tutarı</label><input id="return-amount" disabled /></div>
          </div>
          <div class="field"><label>İade Gerekçesi</label><textarea id="return-reason" rows="2" placeholder="Örn: Müşteri kokuyu beğenmedi, ürün hasarlı geldi vb." required></textarea></div>
          <div id="return-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold" id="return-submit">İade Talebi Oluştur</button>
        </form>
      </div>
      <div class="section-title">İade Geçmişim</div>
      <div id="returns-list"></div>
    `;

    await this.loadSales(slot);
    slot.querySelector('#return-sale').addEventListener('change', () => this.onSaleChange(slot));
    slot.querySelector('#return-item').addEventListener('change', () => this.onItemChange(slot));
    slot.querySelector('#return-qty').addEventListener('input', () => this.onItemChange(slot));
    slot.querySelector('#return-form').addEventListener('submit', (e) => this.submitReturn(e, slot));

    await this.loadReturns(slot.querySelector('#returns-list'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadSales(slot) {
    const select = slot.querySelector('#return-sale');
    try {
      const { data: sales } = await Api.get('/sales/me');
      this.sales = sales.filter((s) => s.status === 'COMPLETED');
      if (!this.sales.length) {
        select.innerHTML = `<option value="">İade edilebilir satışınız yok</option>`;
        return;
      }
      select.innerHTML = `<option value="">Seçiniz...</option>` + this.sales.map((s) => `
        <option value="${s.id}">${new Date(s.saleDate).toLocaleDateString('tr-TR')} — ${s.items.map((i) => i.variant.product.name).join(', ')} ${s.customerName ? `(${s.customerName})` : ''}</option>
      `).join('');
    } catch (_e) {
      select.innerHTML = `<option value="">Yüklenemedi</option>`;
    }
  },

  onSaleChange(slot) {
    const saleId = slot.querySelector('#return-sale').value;
    const itemSelect = slot.querySelector('#return-item');
    const sale = this.sales.find((s) => s.id === saleId);

    if (!sale) {
      itemSelect.innerHTML = `<option value="">Önce satış seçin</option>`;
      itemSelect.disabled = true;
      slot.querySelector('#return-amount').value = '';
      return;
    }

    itemSelect.disabled = false;
    itemSelect.innerHTML = sale.items.map((i) => `
      <option value="${i.id}" data-unit-price="${i.unitPriceCents}" data-max-qty="${i.quantity}">
        ${i.variant.product.name} (${i.variant.volumeMl}ml) — satılan: ${i.quantity} adet
      </option>
    `).join('');
    this.onItemChange(slot);
  },

  onItemChange(slot) {
    const opt = slot.querySelector('#return-item').selectedOptions[0];
    const qtyInput = slot.querySelector('#return-qty');
    const amountInput = slot.querySelector('#return-amount');
    if (!opt || !opt.dataset.unitPrice) {
      amountInput.value = '';
      return;
    }
    const maxQty = Number(opt.dataset.maxQty);
    qtyInput.max = maxQty;
    const qty = Math.min(Number(qtyInput.value) || 1, maxQty);
    const amountCents = Number(opt.dataset.unitPrice) * qty;
    amountInput.value = this.fmtTl(amountCents);
  },

  async submitReturn(e, slot) {
    e.preventDefault();
    const errorBox = slot.querySelector('#return-form-error');
    errorBox.style.display = 'none';

    const saleId = slot.querySelector('#return-sale').value;
    const saleItemId = slot.querySelector('#return-item').value;
    const quantity = Number(slot.querySelector('#return-qty').value);
    const reason = slot.querySelector('#return-reason').value.trim();

    if (!saleId || !saleItemId) {
      errorBox.textContent = 'Lütfen satış ve ürün seçin.';
      errorBox.style.display = 'block';
      return;
    }

    const btn = slot.querySelector('#return-submit');
    btn.disabled = true;
    try {
      await Api.post('/returns', { saleId, saleItemId, quantity, reason });
      Toast.success('İade talebiniz oluşturuldu, admin onayı bekleniyor.');
      slot.querySelector('#return-form').reset();
      slot.querySelector('#return-item').innerHTML = `<option value="">Önce satış seçin</option>`;
      slot.querySelector('#return-item').disabled = true;
      await this.loadReturns(slot.querySelector('#returns-list'));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  statusBadge(status) {
    const map = {
      PENDING: ['badge-gold', 'Onay Bekliyor'],
      APPROVED: ['badge-sage', 'Onaylandı'],
      REJECTED: ['badge-wine', 'Reddedildi'],
    };
    const [cls, label] = map[status] || ['badge-neutral', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  async loadReturns(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:24px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: returns } = await Api.get('/returns/me');
      if (!returns.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">↩️</div><h3>Henüz iade talebiniz yok</h3></div></div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Ürün</th><th>Adet</th><th>Tutar</th><th>Gerekçe</th><th>Durum</th></tr></thead>
            <tbody>
              ${returns.map((r) => `
                <tr>
                  <td class="mono">${new Date(r.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>${r.saleItem.variant.product.name} <span class="text-muted">(${r.saleItem.variant.volumeMl}ml)</span></td>
                  <td>${r.quantity}</td>
                  <td>${this.fmtTl(r.refundAmountCents)}</td>
                  <td class="text-muted" style="font-size:12.5px; max-width:200px;">${r.reason}${r.reviewNote ? `<div style="font-style:italic;">Not: ${r.reviewNote}</div>` : ''}</td>
                  <td>${this.statusBadge(r.status)}</td>
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
