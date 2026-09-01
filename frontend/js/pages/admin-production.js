const AdminProductionPage = {
  STAGES: [
    { status: 'APPROVED', label: 'Onaylandı', next: 'IN_PRODUCTION_QUEUE' },
    { status: 'IN_PRODUCTION_QUEUE', label: 'Üretim Bekliyor', next: 'IN_PRODUCTION' },
    { status: 'IN_PRODUCTION', label: 'Üretimde', next: 'QUALITY_CHECK' },
    { status: 'QUALITY_CHECK', label: 'Kalite Kontrol', next: 'READY' },
    { status: 'READY', label: 'Hazır', next: 'SHIPPED' },
    { status: 'SHIPPED', label: 'Kargoya Verildi', next: 'DELIVERED' },
  ],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Üretim' });
    slot.innerHTML = `
      <p class="text-muted" style="margin-bottom:16px;">
        Bir siparişi bir sonraki aşamaya taşımak için kart üzerindeki oku kullanın.
      </p>
      <div id="production-board" style="display:flex; gap:14px; overflow-x:auto; padding-bottom:12px;"></div>
    `;
    await this.load(slot.querySelector('#production-board'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async load(board) {
    board.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px; flex:1;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const results = await Promise.all(this.STAGES.map((s) => Api.get(`/orders?status=${s.status}`)));
      board.innerHTML = this.STAGES.map((stage, i) => {
        const orders = results[i].data;
        return `
          <div style="min-width:250px; flex-shrink:0;">
            <div style="font-weight:700; font-size:13px; margin-bottom:10px; display:flex; justify-content:space-between;">
              <span>${stage.label}</span>
              <span class="badge badge-neutral">${orders.length}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${orders.length ? orders.map((o) => this.cardHtml(o, stage)).join('') : `<div class="card card-pad text-muted" style="font-size:12px; text-align:center;">Boş</div>`}
            </div>
          </div>
        `;
      }).join('');
      this.bindActions(board);
    } catch (err) {
      board.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  cardHtml(o, stage) {
    return `
      <div class="card card-pad" style="padding:12px 14px;">
        <div class="mono" style="font-weight:600; font-size:12.5px;">${o.orderNumber}</div>
        <div style="font-size:12.5px; margin:4px 0;">${o.partnerProfile.user.firstName} ${o.partnerProfile.user.lastName}</div>
        <div class="text-muted" style="font-size:11.5px; margin-bottom:8px;">
          ${o.items.map((i) => `${i.variant.product.name} x${i.quantity}${i.testerQuantity > 0 ? ` (+${i.testerQuantity} tester)` : ''}`).join(', ')}
        </div>
        <div class="text-muted" style="font-size:11.5px; margin-bottom:8px;">${this.fmtTl(o.totalAmountCents)}</div>
        ${stage.next ? `<button class="btn btn-outline btn-block" data-advance="${o.id}" data-next="${stage.next}" style="padding:6px; min-height:auto; font-size:12px;">${stage.next === 'DELIVERED' ? 'Teslim Edildi →' : 'Sonraki Aşama →'}</button>` : ''}
      </div>
    `;
  },

  bindActions(board) {
    board.querySelectorAll('[data-advance]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.advance;
        const next = btn.dataset.next;
        if (next === 'DELIVERED' && !confirm('Bu siparişi "Teslim Edildi" yaparsanız ürünler otomatik olarak paydaşın stoğuna eklenecek. Devam edilsin mi?')) return;
        btn.disabled = true;
        try {
          await Api.patch(`/orders/${id}/status`, { status: next });
          Toast.success('Sipariş ilerletildi.');
          this.load(board);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
  },
};
