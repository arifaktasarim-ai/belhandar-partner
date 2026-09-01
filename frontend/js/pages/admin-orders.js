const AdminOrdersPage = {
  state: { status: '' },

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Siparişler' });
    slot.innerHTML = `
      <div class="card card-pad" style="margin-bottom:16px; display:flex; gap:12px; align-items:end; flex-wrap:wrap;">
        <div class="field" style="margin:0; min-width:220px;">
          <label>Durum</label>
          <select id="o-status">
            <option value="">Tümü</option>
            <option value="PENDING_APPROVAL">Onay Bekliyor</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="IN_PRODUCTION_QUEUE">Üretim Bekliyor</option>
            <option value="IN_PRODUCTION">Üretimde</option>
            <option value="QUALITY_CHECK">Kalite Kontrol</option>
            <option value="READY">Hazır</option>
            <option value="SHIPPED">Kargoda</option>
            <option value="DELIVERED">Teslim Edildi</option>
            <option value="REJECTED">Reddedildi</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </div>
      </div>
      <div id="orders-wrap"></div>
    `;

    slot.querySelector('#o-status').addEventListener('change', (e) => {
      this.state.status = e.target.value;
      this.load(slot.querySelector('#orders-wrap'));
    });

    await this.load(slot.querySelector('#orders-wrap'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  statusMeta(status) {
    const map = {
      PENDING_APPROVAL: ['badge-gold', 'Onay Bekliyor'],
      APPROVED: ['badge-sage', 'Onaylandı'],
      REJECTED: ['badge-wine', 'Reddedildi'],
      IN_PRODUCTION_QUEUE: ['badge-gold', 'Üretim Bekliyor'],
      IN_PRODUCTION: ['badge-gold', 'Üretimde'],
      QUALITY_CHECK: ['badge-gold', 'Kalite Kontrol'],
      READY: ['badge-sage', 'Hazır'],
      SHIPPED: ['badge-sage', 'Kargoda'],
      DELIVERED: ['badge-sage', 'Teslim Edildi'],
      CANCELLED: ['badge-neutral', 'İptal'],
    };
    return map[status] || ['badge-neutral', status];
  },

  STATUS_OPTIONS: [
    ['PENDING_APPROVAL', 'Onay Bekliyor'], ['APPROVED', 'Onayla'], ['REJECTED', 'Reddet'],
    ['IN_PRODUCTION_QUEUE', 'Üretim Bekliyor'], ['IN_PRODUCTION', 'Üretimde'],
    ['QUALITY_CHECK', 'Kalite Kontrol'], ['READY', 'Hazır'], ['SHIPPED', 'Kargoya Verildi'],
    ['DELIVERED', 'Teslim Edildi'], ['CANCELLED', 'İptal'],
  ],

  async load(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    const params = new URLSearchParams();
    if (this.state.status) params.set('status', this.state.status);
    try {
      const { data: orders } = await Api.get(`/orders?${params.toString()}`);
      if (!orders.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">📋</div><h3>Sipariş bulunamadı</h3></div></div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Sipariş No</th><th>Paydaş</th><th>Ürünler</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>${orders.map((o) => this.rowHtml(o)).join('')}</tbody>
          </table>
        </div>
        <div class="record-cards">${orders.map((o) => this.cardHtml(o)).join('')}</div>
      `;
      this.bindActions(wrap);
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  statusSelectHtml(o) {
    return `
      <select data-status-select data-id="${o.id}" style="padding:6px 8px; border:1px solid var(--border-strong); border-radius:6px; font-size:12.5px;">
        ${this.STATUS_OPTIONS.map(([val, label]) => `<option value="${val}" ${val === o.status ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      <button class="btn btn-gold" data-apply="${o.id}" style="padding:6px 10px; min-height:auto; font-size:12px; margin-left:6px;">Uygula</button>
    `;
  },

  rowHtml(o) {
    const [cls, label] = this.statusMeta(o.status);
    return `
      <tr>
        <td class="mono">${o.orderNumber}</td>
        <td>${o.partnerProfile.user.firstName} ${o.partnerProfile.user.lastName}</td>
        <td style="max-width:260px;">${o.items.map((i) => `${i.variant.product.name} (${i.variant.volumeMl}ml) x${i.quantity}${i.testerQuantity > 0 ? ` <span class="text-muted">(+${i.testerQuantity} tester)</span>` : ''}`).join(', ')}</td>
        <td>${this.fmtTl(o.totalAmountCents)}</td>
        <td><span class="badge ${cls}">${label}</span></td>
        <td style="white-space:nowrap;">${this.statusSelectHtml(o)}</td>
      </tr>
    `;
  },

  cardHtml(o) {
    const [cls, label] = this.statusMeta(o.status);
    return `
      <div class="record-card">
        <div style="display:flex; justify-content:space-between;">
          <span class="mono" style="font-weight:600">${o.orderNumber}</span>
          <span class="badge ${cls}">${label}</span>
        </div>
        <div style="font-weight:600; margin-top:6px;">${o.partnerProfile.user.firstName} ${o.partnerProfile.user.lastName}</div>
        <div class="text-muted" style="font-size:12.5px; margin:4px 0;">${o.items.map((i) => `${i.variant.product.name} x${i.quantity}${i.testerQuantity > 0 ? ` (+${i.testerQuantity} tester)` : ''}`).join(', ')}</div>
        <div class="record-card-row"><span class="label">Tutar</span><span>${this.fmtTl(o.totalAmountCents)}</span></div>
        <div style="margin-top:8px;">${this.statusSelectHtml(o)}</div>
      </div>
    `;
  },

  bindActions(wrap) {
    wrap.querySelectorAll('[data-apply]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.apply;
        const select = wrap.querySelector(`[data-status-select][data-id="${id}"]`);
        const status = select.value;
        if (status === 'DELIVERED' && !confirm('Bu siparişi "Teslim Edildi" yaparsanız ürünler otomatik olarak paydaşın stoğuna eklenecek. Onaylıyor musunuz?')) return;

        btn.disabled = true;
        try {
          await Api.patch(`/orders/${id}/status`, { status });
          Toast.success('Sipariş durumu güncellendi.');
          this.load(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
  },
};
