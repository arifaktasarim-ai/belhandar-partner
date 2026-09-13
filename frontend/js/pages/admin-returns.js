const AdminReturnsPage = {
  state: { status: '' },

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'İadeler' });
    slot.innerHTML = `
      <div class="card card-pad" style="margin-bottom:18px; display:flex; gap:12px; align-items:end; flex-wrap:wrap;">
        <div class="field" style="margin:0; min-width:220px;">
          <label>Durum</label>
          <select id="r-status">
            <option value="">Tümü</option>
            <option value="PENDING" selected>Onay Bekliyor</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="REJECTED">Reddedildi</option>
            <option value="REFUND_PENDING">Para İadesi Bekleyenler</option>
          </select>
        </div>
      </div>
      <div id="returns-wrap"></div>
    `;

    this.state.status = 'PENDING';
    const prefillStatus = ReportNav.consume(ReportNav.KEYS.RETURNS_STATUS);
    if (prefillStatus) {
      this.state.status = prefillStatus;
      slot.querySelector('#r-status').value = prefillStatus;
    }

    slot.querySelector('#r-status').addEventListener('change', (e) => {
      this.state.status = e.target.value;
      this.load(slot.querySelector('#returns-wrap'));
    });

    await this.load(slot.querySelector('#returns-wrap'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
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

  refundBadge(refundStatus) {
    const map = {
      NOT_REQUIRED: ['badge-neutral', '—'],
      PENDING: ['badge-gold', 'Para İadesi Bekliyor'],
      COMPLETED: ['badge-sage', 'Para İadesi Yapıldı'],
    };
    const [cls, label] = map[refundStatus] || ['badge-neutral', refundStatus];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  async load(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    const isRefundFilter = this.state.status === 'REFUND_PENDING';
    const params = new URLSearchParams();
    if (this.state.status && !isRefundFilter) params.set('status', this.state.status);
    if (isRefundFilter) params.set('status', 'APPROVED');

    try {
      const { data: allReturns } = await Api.get(`/returns?${params.toString()}`);
      const returns = isRefundFilter ? allReturns.filter((r) => r.refundStatus === 'PENDING') : allReturns;

      if (!returns.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">↩️</div><h3>${isRefundFilter ? 'Bekleyen para iadesi yok' : 'İade talebi bulunamadı'}</h3></div></div>`;
        return;
      }
      wrap.innerHTML = returns.map((r) => this.cardHtml(r)).join('');
      this.bindActions(wrap);
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  cardHtml(r) {
    const partnerName = `${r.partnerProfile.user.firstName} ${r.partnerProfile.user.lastName}`;
    return `
      <div class="card card-pad" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:start; gap:10px; flex-wrap:wrap;">
          <div>
            <p style="margin:0; font-size:14px; line-height:1.6;">
              <strong style="color:var(--gold-dim);">${partnerName}</strong>,
              <strong>${r.saleItem.variant.product.name} (${r.saleItem.variant.volumeMl}ml)</strong>
              için <strong>${r.quantity} adet</strong> iade talep etti.
            </p>
            <p class="text-muted" style="font-size:12.5px; margin:4px 0 0;">Gerekçe: "${r.reason}"</p>
            ${r.sale.customerName ? `<p class="text-muted" style="font-size:12px; margin:2px 0 0;">Müşteri: ${r.sale.customerName} ${r.sale.customerPhone ? `· ${r.sale.customerPhone}` : ''}</p>` : ''}
          </div>
          <div style="text-align:right; flex-shrink:0;">
            ${this.statusBadge(r.status)}
            <div class="text-muted mono" style="font-size:11.5px; margin-top:4px;">${new Date(r.createdAt).toLocaleDateString('tr-TR')}</div>
            <div style="font-weight:700; margin-top:4px;">${this.fmtTl(r.refundAmountCents)}</div>
          </div>
        </div>
        ${r.status === 'PENDING' ? `
          <div style="display:flex; gap:8px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
            <button class="btn btn-gold" data-approve="${r.id}" style="padding:7px 14px; min-height:auto;">Onayla (Stok + Kazanç Güncelle)</button>
            <button class="btn btn-danger" data-reject="${r.id}" style="padding:7px 14px; min-height:auto;">Reddet</button>
          </div>
        ` : ''}
        ${r.status === 'APPROVED' ? `
          <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="font-size:12.5px;">
              ${this.refundBadge(r.refundStatus)}
              ${r.refundStatus === 'COMPLETED' ? `<span class="text-muted"> · ${new Date(r.refundedAt).toLocaleDateString('tr-TR')}${r.refundedBy ? ` · ${r.refundedBy.firstName} ${r.refundedBy.lastName}` : ''}</span>` : ''}
              ${r.refundIban ? `<div class="mono text-muted" style="font-size:11px; margin-top:3px;">IBAN: ${r.refundIban}</div>` : ''}
              ${r.refundNote ? `<div class="text-muted" style="font-size:11px; font-style:italic;">${r.refundNote}</div>` : ''}
            </div>
            ${r.refundStatus === 'PENDING' ? `<button class="btn btn-gold" data-complete-refund="${r.id}" data-iban="${r.refundIban || ''}" style="padding:7px 14px; min-height:auto;">Para İadesi Yapıldı Olarak İşaretle</button>` : ''}
          </div>
        ` : ''}
        ${r.status === 'REJECTED' && r.reviewNote ? `<div class="text-muted" style="font-size:11.5px; margin-top:8px; font-style:italic;">Not: ${r.reviewNote}</div>` : ''}
      </div>
    `;
  },

  bindActions(wrap) {
    wrap.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu iadeyi onaylarsanız ürün paydaşın stoğuna geri eklenecek ve kazancından düşülecek. Devam edilsin mi?')) return;
        btn.disabled = true;
        try {
          await Api.patch(`/returns/${btn.dataset.approve}/approve`);
          Toast.success('İade onaylandı.');
          this.load(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
    wrap.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reviewNote = prompt('Red gerekçesi (opsiyonel):') || undefined;
        btn.disabled = true;
        try {
          await Api.patch(`/returns/${btn.dataset.reject}/reject`, { reviewNote });
          Toast.success('İade talebi reddedildi.');
          this.load(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
    wrap.querySelectorAll('[data-complete-refund]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const defaultIban = btn.dataset.iban || '';
        const refundIban = prompt('Para gönderilen IBAN (değiştirmek isterseniz düzenleyin):', defaultIban);
        if (refundIban === null) return;
        const refundNote = prompt('Not (opsiyonel, örn. "Müşteriye elden iade edildi"):') || undefined;
        btn.disabled = true;
        try {
          await Api.patch(`/returns/${btn.dataset.completeRefund}/complete-refund`, { refundIban: refundIban || undefined, refundNote });
          Toast.success('Para iadesi tamamlandı olarak işaretlendi.');
          this.load(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
  },
};
