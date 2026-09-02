const AdminSettingsPage = {
  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Ayarlar' });
    slot.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;

    try {
      const { data: settings } = await Api.get('/settings');
      this.renderForm(slot, settings);
    } catch (err) {
      slot.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  renderForm(slot, settings) {
    slot.innerHTML = `
      <div class="card card-pad" style="max-width:600px;">
        <div class="section-title">Genel Ayarlar</div>
        <form id="settings-form">
          <div class="field"><label>Marka Adı</label><input name="brandName" value="${settings.brandName}" required /></div>
          <div class="field"><label>Para Birimi</label><input name="currency" value="${settings.currency}" required /></div>

          <div class="field-row">
            <div class="field">
              <label>Varsayılan Komisyon Tipi</label>
              <select name="defaultCommissionType" id="dc-type">
                <option value="PERCENTAGE" ${settings.defaultCommissionType === 'PERCENTAGE' ? 'selected' : ''}>Yüzde bazlı</option>
                <option value="FIXED" ${settings.defaultCommissionType === 'FIXED' ? 'selected' : ''}>Sabit TL bazlı</option>
              </select>
            </div>
            <div class="field">
              <label>Değer</label>
              <input name="defaultCommissionValue" type="number" step="0.01" min="0" value="${settings.defaultCommissionDisplayValue}" required />
            </div>
          </div>

          <div class="field" style="max-width:220px;">
            <label>Varsayılan Minimum Stok Seviyesi</label>
            <input name="defaultMinStockLevel" type="number" min="0" value="${settings.defaultMinStockLevel}" required />
          </div>

          <div id="settings-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Kaydet</button>
        </form>
      </div>

      <div class="card card-pad" style="max-width:600px; margin-top:20px;">
        <div class="section-title">Şifre Değiştir</div>
        <form id="password-form">
          <div class="field"><label>Mevcut Şifre</label><input name="currentPassword" type="password" required /></div>
          <div class="field"><label>Yeni Şifre</label><input name="newPassword" type="password" required minlength="8" /></div>
          <div id="password-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-outline">Şifreyi Değiştir</button>
        </form>
      </div>

      <div class="card card-pad" style="max-width:600px; margin-top:20px;">
        <div class="section-title">Kargo Ücret Tarifesi</div>
        <p class="text-muted" style="font-size:12.5px; margin-top:-8px; margin-bottom:14px;">
          Paydaşlar "Kargo" seçeneğiyle satış girdiğinde, satış tutarına göre burada tanımladığınız
          ücret otomatik hesaplanır ve paydaşa gösterilir.
        </p>
        <div id="shipping-rates-list" style="margin-bottom:16px;"></div>
        <form id="shipping-rate-form">
          <div class="field-row">
            <div class="field"><label>Min. Tutar (TL)</label><input name="minAmount" type="number" step="0.01" min="0" required /></div>
            <div class="field"><label>Maks. Tutar (TL) <span class="text-muted">(boş=sınırsız)</span></label><input name="maxAmount" type="number" step="0.01" min="0" /></div>
          </div>
          <div class="field" style="max-width:200px;"><label>Kargo Ücreti (TL)</label><input name="fee" type="number" step="0.01" min="0" required /></div>
          <div id="shipping-rate-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Aralık Ekle</button>
        </form>
      </div>

      <div class="section-title" style="margin-top:28px;">Sistem Kayıtları (Son 200 İşlem)</div>
      <div id="audit-log-wrap"></div>
    `;

    slot.querySelector('#settings-form').addEventListener('submit', (e) => this.submit(e, slot));
    slot.querySelector('#password-form').addEventListener('submit', (e) => this.submitPassword(e, slot));
    slot.querySelector('#shipping-rate-form').addEventListener('submit', (e) => this.submitShippingRate(e, slot));
    this.loadShippingRates(slot);
    this.loadAuditLogs(slot.querySelector('#audit-log-wrap'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadShippingRates(slot) {
    const wrap = slot.querySelector('#shipping-rates-list');
    wrap.innerHTML = `<div class="spinner" style="margin:10px auto"></div>`;
    try {
      const { data: rates } = await Api.get('/shipping-rates?all=true');
      if (!rates.length) {
        wrap.innerHTML = `<p class="text-muted" style="font-size:13px;">Henüz kargo ücreti tanımlanmadı. Tanımlanana kadar kargolu satışlarda ücret 0 TL gösterilir.</p>`;
        return;
      }
      wrap.innerHTML = rates.map((r) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; gap:10px; flex-wrap:wrap;">
          <span>${this.fmtTl(r.minAmountCents)} ${r.maxAmountCents ? `– ${this.fmtTl(r.maxAmountCents)}` : 've üzeri'} arası</span>
          <span style="font-weight:600;">${this.fmtTl(r.feeCents)} kargo</span>
          <div style="display:flex; gap:6px; align-items:center;">
            ${!r.isActive ? '<span class="badge badge-neutral">Pasif</span>' : ''}
            <button class="btn btn-outline" data-toggle-rate="${r.id}" data-active="${r.isActive}" style="padding:4px 8px; min-height:auto; font-size:11px;">${r.isActive ? 'Pasife Al' : 'Aktif Et'}</button>
            <button class="btn btn-danger" data-delete-rate="${r.id}" style="padding:4px 8px; min-height:auto; font-size:11px;">Sil</button>
          </div>
        </div>
      `).join('');

      wrap.querySelectorAll('[data-toggle-rate]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const isActive = btn.dataset.active === 'true';
          btn.disabled = true;
          try {
            await Api.put(`/shipping-rates/${btn.dataset.toggleRate}`, { isActive: !isActive });
            this.loadShippingRates(slot);
          } catch (err) {
            Toast.error(err.message);
            btn.disabled = false;
          }
        });
      });
      wrap.querySelectorAll('[data-delete-rate]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Bu kargo ücret aralığını silmek istediğinize emin misiniz?')) return;
          btn.disabled = true;
          try {
            await Api.del(`/shipping-rates/${btn.dataset.deleteRate}`);
            Toast.success('Silindi.');
            this.loadShippingRates(slot);
          } catch (err) {
            Toast.error(err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      wrap.innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  async submitShippingRate(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#shipping-rate-error');
    errorBox.style.display = 'none';
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.maxAmount) delete payload.maxAmount;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Api.post('/shipping-rates', payload);
      Toast.success('Kargo ücret aralığı eklendi.');
      form.reset();
      this.loadShippingRates(slot);
    } catch (err) {
      const details = err.details ? Object.values(err.details).flat().join(' ') : '';
      errorBox.textContent = details || err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  async submitPassword(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#password-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Api.post('/users/me/change-password', payload);
      Toast.success('Şifreniz güncellendi.');
      form.reset();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  ACTION_LABELS: {
    PARTNER_REGISTERED: 'Paydaş kaydoldu',
    PARTNER_STATUS_APPROVE: 'Paydaş onaylandı',
    PARTNER_STATUS_REJECT: 'Paydaş reddedildi',
    PARTNER_STATUS_SUSPEND: 'Paydaş askıya alındı',
    PARTNER_STATUS_ACTIVATE: 'Paydaş aktif edildi',
    PARTNER_COMMISSION_CHANGED: 'Komisyon planı değiştirildi',
    PRODUCT_CREATED: 'Ürün oluşturuldu',
    PRODUCT_UPDATED: 'Ürün güncellendi',
    VARIANT_ADDED: 'Varyant eklendi',
    VARIANT_UPDATED: 'Varyant güncellendi',
    COMMISSION_PLAN_CREATED: 'Komisyon planı oluşturuldu',
    COMMISSION_PLAN_UPDATED: 'Komisyon planı güncellendi',
    SALE_VOIDED: 'Satış iptal edildi',
    PAYMENT_RECORDED: 'Ödeme kaydedildi',
    SETTINGS_UPDATED: 'Ayarlar güncellendi',
  },

  async loadAuditLogs(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:24px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: logs } = await Api.get('/admin/audit-logs');
      if (!logs.length) {
        wrap.innerHTML = `<div class="card card-pad text-muted">Henüz kayıt yok.</div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Kullanıcı</th><th>İşlem</th><th>Varlık</th></tr></thead>
            <tbody>
              ${logs.map((l) => `
                <tr>
                  <td class="mono" style="white-space:nowrap;">${new Date(l.createdAt).toLocaleString('tr-TR')}</td>
                  <td>${l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : 'Sistem'}</td>
                  <td>${this.ACTION_LABELS[l.action] || l.action}</td>
                  <td class="text-muted" style="font-size:12px;">${l.entityType}</td>
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

  async submit(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#settings-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const { data: settings } = await Api.put('/settings', payload);
      Toast.success('Ayarlar kaydedildi.');
      this.renderForm(slot, settings);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },
};
