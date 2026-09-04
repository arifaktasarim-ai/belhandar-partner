const AdminSalesPage = {
  partners: [],
  state: { partnerId: '', status: '', search: '', year: '', month: '' },

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
        <div class="field" style="margin:0; min-width:120px;">
          <label>Yıl</label>
          <select id="s-year"></select>
        </div>
        <div class="field" style="margin:0; min-width:140px;">
          <label>Ay</label>
          <select id="s-month">
            <option value="">Tüm Yıl</option>
            <option value="1">Ocak</option><option value="2">Şubat</option><option value="3">Mart</option>
            <option value="4">Nisan</option><option value="5">Mayıs</option><option value="6">Haziran</option>
            <option value="7">Temmuz</option><option value="8">Ağustos</option><option value="9">Eylül</option>
            <option value="10">Ekim</option><option value="11">Kasım</option><option value="12">Aralık</option>
          </select>
        </div>
      </div>
      <div id="sales-period-summary" style="margin-bottom:16px;"></div>
      <div id="sales-feed"></div>
    `;

    this.populateYearFilter(slot);
    await this.loadPartnerOptions(slot);

    const reload = () => this.load(slot);
    slot.querySelector('#s-partner').addEventListener('change', (e) => { this.state.partnerId = e.target.value; reload(); });
    slot.querySelector('#s-status').addEventListener('change', (e) => { this.state.status = e.target.value; reload(); });
    slot.querySelector('#s-year').addEventListener('change', (e) => { this.state.year = e.target.value; reload(); });
    slot.querySelector('#s-month').addEventListener('change', (e) => { this.state.month = e.target.value; reload(); });
    let debounceTimer;
    slot.querySelector('#s-search').addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { this.state.search = e.target.value.trim().toLowerCase(); reload(); }, 300);
    });

    await reload();
  },

  populateYearFilter(slot) {
    const select = slot.querySelector('#s-year');
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);
    select.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
    this.state.year = String(currentYear);
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

  async load(slot) {
    const wrap = slot.querySelector('#sales-feed');
    const summaryWrap = slot.querySelector('#sales-period-summary');
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;

    const params = new URLSearchParams();
    if (this.state.year) params.set('year', this.state.year);
    if (this.state.month) params.set('month', this.state.month);
    if (this.state.partnerId) params.set('partnerProfileId', this.state.partnerId);

    try {
      const { data: sales } = await Api.get(`/sales?${params.toString()}`);
      let filtered = sales;
      if (this.state.status) filtered = filtered.filter((s) => s.status === this.state.status);
      if (this.state.search) {
        filtered = filtered.filter((s) =>
          (s.customerName || '').toLowerCase().includes(this.state.search) ||
          (s.customerPhone || '').toLowerCase().includes(this.state.search),
        );
      }

      const completed = filtered.filter((s) => s.status === 'COMPLETED');
      const totalUnits = completed.reduce((sum, s) => sum + s.items.reduce((u, i) => u + i.quantity, 0), 0);
      const totalRevenue = completed.reduce((sum, s) => sum + s.totalAmountCents, 0);
      const totalProfit = completed.reduce((sum, s) => sum + s.totalProfitCents, 0);
      const periodLabel = this.state.month
        ? `${['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][this.state.month]} ${this.state.year}`
        : `${this.state.year} (Tüm Yıl)`;

      summaryWrap.innerHTML = `
        <div class="stat-grid" style="margin-bottom:0;">
          <div class="stat-card"><div class="stat-label">${periodLabel} — Satılan Adet</div><div class="stat-value">${totalUnits}</div></div>
          <div class="stat-card"><div class="stat-label">${periodLabel} — Toplam Ciro</div><div class="stat-value">${this.fmtTl(totalRevenue)}</div></div>
          <div class="stat-card"><div class="stat-label">${periodLabel} — Toplam Kazanç</div><div class="stat-value">${this.fmtTl(totalProfit)}</div></div>
        </div>
      `;

      if (!filtered.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🧾</div><h3>Bu dönemde satış bulunamadı</h3><p>Filtreleri değiştirip tekrar deneyin.</p></div></div>`;
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
