const AdminSalesPage = {
  partners: [],
  state: { partnerId: '', status: '', search: '' },

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Paydaş Satışları' });
    slot.innerHTML = `
      <div class="card card-pad" style="margin-bottom:18px; display:flex; gap:12px; flex-wrap:wrap; align-items:end;">
        <div class="field" style="margin:0; min-width:220px; flex:1;">
          <label>Müşteri adı / telefon ara</label>
          <input type="text" id="s-search" placeholder="Müşteri adı veya telefon..." />
        </div>
        <div class="field" style="margin:0; min-width:200px;">
          <label>Paydaş</label>
          <select id="s-partner"><option value="">Tümü</option></select>
        </div>
        <div class="field" style="margin:0; min-width:160px;">
          <label>Durum</label>
          <select id="s-status">
            <option value="">Tümü</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="VOID">İptal</option>
          </select>
        </div>
      </div>
      <div id="sales-feed"></div>
    `;

    await this.loadPartnerOptions(slot);

    const reload = () => this.load(slot.querySelector('#sales-feed'));
    slot.querySelector('#s-partner').addEventListener('change', (e) => { this.state.partnerId = e.target.value; reload(); });
    slot.querySelector('#s-status').addEventListener('change', (e) => { this.state.status = e.target.value; reload(); });
    let debounceTimer;
    slot.querySelector('#s-search').addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { this.state.search = e.target.value.trim().toLowerCase(); reload(); }, 300);
    });

    await reload();
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadPartnerOptions(slot) {
    const select = slot.querySelector('#s-partner');
    try {
      const { data: partners } = await Api.get('/admin/partners?status=ACTIVE');
      this.partners = partners;
      select.innerHTML = `<option value="">Tümü</option>` + partners
        .filter((p) => p.partnerProfile)
        .map((p) => `<option value="${p.partnerProfile.id}">${p.firstName} ${p.lastName}</option>`)
        .join('');
    } catch (_e) { /* sessiz gec */ }
  },

  async load(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: sales } = await Api.get('/sales');
      let filtered = sales;
      if (this.state.partnerId) filtered = filtered.filter((s) => s.partnerProfileId === this.state.partnerId);
      if (this.state.status) filtered = filtered.filter((s) => s.status === this.state.status);
      if (this.state.search) {
        filtered = filtered.filter((s) =>
          (s.customerName || '').toLowerCase().includes(this.state.search) ||
          (s.customerPhone || '').toLowerCase().includes(this.state.search),
        );
      }

      if (!filtered.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🧾</div><h3>Satış bulunamadı</h3><p>Filtreleri değiştirip tekrar deneyin.</p></div></div>`;
        return;
      }

      wrap.innerHTML = filtered.map((s) => this.saleCardHtml(s)).join('');
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  saleCardHtml(s) {
    const partnerName = `${s.partnerProfile.user.firstName} ${s.partnerProfile.user.lastName}`;
    const itemsSentence = s.items
      .map((i) => `<strong>${i.variant.product.name} (${i.variant.volumeMl}ml)</strong> parfümünden ${i.quantity} adet`)
      .join(', ');
    const isVoid = s.status === 'VOID';

    return `
      <div class="card card-pad" style="margin-bottom:12px; ${isVoid ? 'opacity:0.65;' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:start; gap:10px; flex-wrap:wrap;">
          <p style="margin:0; font-size:14px; line-height:1.6; max-width:640px;">
            <strong style="color:var(--gold-dim);">${partnerName}</strong> isimli paydaş, ${itemsSentence} satış yaptı.
            <strong>${this.fmtTl(s.totalAmountCents)}</strong> sattı, kârı
            <strong style="color:var(--sage);">${this.fmtTl(s.totalProfitCents)}</strong>.
          </p>
          <div style="text-align:right; flex-shrink:0;">
            ${isVoid ? '<span class="badge badge-wine">İptal Edildi</span>' : '<span class="badge badge-sage">Tamamlandı</span>'}
            <div class="text-muted mono" style="font-size:11.5px; margin-top:4px;">${new Date(s.saleDate).toLocaleDateString('tr-TR')}</div>
          </div>
        </div>
        ${s.customerName || s.customerPhone || s.note || s.channel === 'KARGO' ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); font-size:12.5px; display:flex; gap:16px; flex-wrap:wrap;">
            ${s.customerName ? `<span><span class="text-muted">Müşteri:</span> <strong>${s.customerName}</strong></span>` : ''}
            ${s.customerPhone ? `<span><span class="text-muted">Telefon:</span> <span class="mono">${s.customerPhone}</span></span>` : ''}
            ${s.note ? `<span><span class="text-muted">Not:</span> <em>"${s.note}"</em></span>` : ''}
            <span><span class="text-muted">Kanal:</span> ${s.channel === 'KARGO' ? 'Kargo' : 'Elden'}</span>
            ${s.channel === 'KARGO' ? `<span><span class="text-muted">Kargo Ücreti:</span> ${this.fmtTl(s.shippingFeeCents || 0)} ${s.shippingPaidByAdmin ? '<span class="badge badge-gold" style="font-size:9.5px;">Belhandar öder</span>' : '<span class="text-muted" style="font-size:11px;">(karşı ödemeli)</span>'}</span>` : ''}
          </div>
        ` : ''}
        ${isVoid && s.voidReason ? `<div class="text-muted" style="font-size:11.5px; margin-top:6px;">İptal gerekçesi: ${s.voidReason}</div>` : ''}
      </div>
    `;
  },
};
