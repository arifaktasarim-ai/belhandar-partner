const AdminPaymentsPage = {
  partners: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Ödemeler' });
    slot.innerHTML = `
      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="section-title">Yeni Ödeme Kaydet</div>
        <form id="payment-form">
          <div class="field-row">
            <div class="field">
              <label>Paydaş</label>
              <select name="partnerProfileId" id="pay-partner" required><option value="">Seçiniz...</option></select>
            </div>
            <div class="field"><label>Tutar (TL)</label><input name="amount" type="number" step="0.01" min="0" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>IBAN <span class="text-muted">(boş bırakılırsa paydaşın kayıtlı IBAN'ı kullanılır)</span></label><input name="iban" id="pay-iban" /></div>
            <div class="field"><label>Açıklama</label><input name="description" placeholder="orn. Ağustos ayı ödemesi" /></div>
          </div>
          <div id="payment-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Ödemeyi Kaydet</button>
        </form>
      </div>
      <div class="section-title">Ödeme Geçmişi</div>
      <div id="payments-list"></div>
    `;

    await this.loadPartners(slot);
    slot.querySelector('#payment-form').addEventListener('submit', (e) => this.submitPayment(e, slot));
    await this.loadPayments(slot.querySelector('#payments-list'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadPartners(slot) {
    const select = slot.querySelector('#pay-partner');
    try {
      const { data: partners } = await Api.get('/admin/partners?status=ACTIVE');
      this.partners = partners;
      select.innerHTML = `<option value="">Seçiniz...</option>` + partners
        .filter((p) => p.partnerProfile)
        .map((p) => `<option value="${p.partnerProfile.id}" data-iban="${p.partnerProfile.iban}">${p.firstName} ${p.lastName}</option>`)
        .join('');
      select.addEventListener('change', () => {
        const opt = select.selectedOptions[0];
        if (opt && opt.dataset.iban) slot.querySelector('#pay-iban').placeholder = opt.dataset.iban;
      });
    } catch (_e) {
      select.innerHTML = `<option value="">Yüklenemedi</option>`;
    }
  },

  async submitPayment(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#payment-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.iban) delete payload.iban;
    if (!payload.description) delete payload.description;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Api.post('/payments', payload);
      Toast.success('Ödeme kaydedildi.');
      form.reset();
      await this.loadPayments(slot.querySelector('#payments-list'));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  async loadPayments(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: payments } = await Api.get('/payments');
      if (!payments.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">💳</div><h3>Henüz ödeme kaydı yok</h3></div></div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Paydaş</th><th>Tutar</th><th>IBAN</th><th>Açıklama</th></tr></thead>
            <tbody>
              ${payments.map((p) => `
                <tr>
                  <td class="mono">${new Date(p.paidAt).toLocaleDateString('tr-TR')}</td>
                  <td style="font-weight:600">${p.partnerProfile.user.firstName} ${p.partnerProfile.user.lastName}</td>
                  <td>${this.fmtTl(p.amountCents)}</td>
                  <td class="mono" style="font-size:11.5px;">${p.iban}</td>
                  <td class="text-muted">${p.description || '—'}</td>
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
