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

      <div class="section-title" style="margin-top:28px;">Sistem Kayıtları (Son 200 İşlem)</div>
      <div id="audit-log-wrap"></div>
    `;

    slot.querySelector('#settings-form').addEventListener('submit', (e) => this.submit(e, slot));
    this.loadAuditLogs(slot.querySelector('#audit-log-wrap'));
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
