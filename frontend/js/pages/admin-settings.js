const AdminSettingsPage = {
  CHEVRON: '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Ayarlar' });
    slot.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;

    try {
      const { data: settings } = await Api.get('/settings');
      this.renderShell(slot, settings);
    } catch (err) {
      slot.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  renderShell(slot, settings) {
    const isSuperAdmin = Auth.getUser().role === 'SUPER_ADMIN';

    slot.innerHTML = `
      <div class="settings-grid">
        <details class="settings-card" open>
          <summary>Genel Ayarlar ${this.CHEVRON}</summary>
          <div class="settings-card-body" id="general-settings-body"></div>
        </details>

        <details class="settings-card">
          <summary>Kargo Ücret Tarifesi ${this.CHEVRON}</summary>
          <div class="settings-card-body" id="shipping-rates-body"></div>
        </details>

        <details class="settings-card">
          <summary>Şifre Değiştir ${this.CHEVRON}</summary>
          <div class="settings-card-body" id="password-body"></div>
        </details>

        <details class="settings-card">
          <summary>Yönetici Hesapları ${this.CHEVRON}</summary>
          <div class="settings-card-body" id="staff-body"></div>
        </details>

        <details class="settings-card settings-full">
          <summary>Sistem Kayıtları (Son 200 İşlem) ${this.CHEVRON}</summary>
          <div class="settings-card-body" id="audit-log-body"></div>
        </details>
      </div>
    `;

    this.renderGeneralSettings(slot, settings);
    this.renderShippingRates(slot);
    this.renderPasswordForm(slot);
    this.renderStaff(slot, isSuperAdmin);
    this.renderAuditLog(slot);
  },

  // --- Genel Ayarlar ---
  renderGeneralSettings(slot, settings) {
    const body = slot.querySelector('#general-settings-body');
    body.innerHTML = `
      <form id="settings-form">
        <div class="field"><label>Marka Adı</label><input name="brandName" value="${settings.brandName}" required /></div>
        <div class="field"><label>Para Birimi</label><input name="currency" value="${settings.currency}" required /></div>
        <div class="field-row">
          <div class="field">
            <label>Varsayılan Komisyon Tipi</label>
            <select name="defaultCommissionType">
              <option value="PERCENTAGE" ${settings.defaultCommissionType === 'PERCENTAGE' ? 'selected' : ''}>Yüzde bazlı</option>
              <option value="FIXED" ${settings.defaultCommissionType === 'FIXED' ? 'selected' : ''}>Sabit TL bazlı</option>
            </select>
          </div>
          <div class="field"><label>Değer</label><input name="defaultCommissionValue" type="number" step="0.01" min="0" value="${settings.defaultCommissionDisplayValue}" required /></div>
        </div>
        <div class="field" style="max-width:220px;"><label>Varsayılan Minimum Stok Seviyesi</label><input name="defaultMinStockLevel" type="number" min="0" value="${settings.defaultMinStockLevel}" required /></div>
        <div id="settings-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
        <button type="submit" class="btn btn-gold">Kaydet</button>
      </form>
    `;
    body.querySelector('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = body.querySelector('#settings-error');
      errorBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const { data: updated } = await Api.put('/settings', payload);
        Toast.success('Ayarlar kaydedildi.');
        this.renderGeneralSettings(slot, updated);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  },

  // --- Kargo Ücret Tarifesi ---
  renderShippingRates(slot) {
    const body = slot.querySelector('#shipping-rates-body');
    body.innerHTML = `
      <p class="text-muted" style="font-size:12.5px; margin-top:0; margin-bottom:14px;">
        Paydaşlar "Kargo" ile satış girdiğinde, tutara göre burada tanımladığınız ücret otomatik hesaplanır.
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
    `;
    body.querySelector('#shipping-rate-form').addEventListener('submit', (e) => this.submitShippingRate(e, body));
    this.loadShippingRates(body);
  },

  async loadShippingRates(body) {
    const wrap = body.querySelector('#shipping-rates-list');
    wrap.innerHTML = `<div class="spinner" style="margin:10px auto"></div>`;
    try {
      const { data: rates } = await Api.get('/shipping-rates?all=true');
      if (!rates.length) {
        wrap.innerHTML = `<p class="text-muted" style="font-size:13px;">Henüz kargo ücreti tanımlanmadı.</p>`;
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
            this.loadShippingRates(body);
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
            this.loadShippingRates(body);
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

  async submitShippingRate(e, body) {
    e.preventDefault();
    const form = e.target;
    const errorBox = body.querySelector('#shipping-rate-error');
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
      this.loadShippingRates(body);
    } catch (err) {
      const details = err.details ? Object.values(err.details).flat().join(' ') : '';
      errorBox.textContent = details || err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  // --- Şifre Değiştir ---
  renderPasswordForm(slot) {
    const body = slot.querySelector('#password-body');
    body.innerHTML = `
      <form id="password-form">
        <div class="field"><label>Mevcut Şifre</label><input name="currentPassword" type="password" required /></div>
        <div class="field"><label>Yeni Şifre</label><input name="newPassword" type="password" required minlength="8" /></div>
        <div id="password-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
        <button type="submit" class="btn btn-outline">Şifreyi Değiştir</button>
      </form>
    `;
    body.querySelector('#password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = body.querySelector('#password-form-error');
      errorBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await Api.post('/users/me/change-password', payload);
        Toast.success('Şifreniz güncellendi.');
        e.target.reset();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  },

  // --- Yönetici Hesapları ---
  renderStaff(slot, isSuperAdmin) {
    const body = slot.querySelector('#staff-body');
    body.innerHTML = `
      <div id="staff-list" style="margin-bottom:16px;"></div>
      ${isSuperAdmin ? `
        <p class="text-muted" style="font-size:12.5px; margin-bottom:10px;">Yeni bir yönetici (Admin) hesabı oluşturun.</p>
        <form id="staff-form">
          <div class="field-row">
            <div class="field"><label>Ad</label><input name="firstName" required /></div>
            <div class="field"><label>Soyad</label><input name="lastName" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Kullanıcı Adı</label><input name="username" required /></div>
            <div class="field"><label>E-posta</label><input name="email" type="email" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Telefon</label><input name="phone" required /></div>
            <div class="field"><label>Geçici Şifre</label><input name="password" type="password" minlength="8" required /></div>
          </div>
          <div id="staff-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Yönetici Ekle</button>
        </form>
      ` : `<p class="text-muted" style="font-size:12.5px;">Yeni yönetici ekleme ve hesap durumu değiştirme yalnızca Super Admin yetkisindedir.</p>`}
    `;

    if (isSuperAdmin) {
      body.querySelector('#staff-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = body.querySelector('#staff-form-error');
        errorBox.style.display = 'none';
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await Api.post('/admin/staff', payload);
          Toast.success('Yönetici hesabı oluşturuldu.');
          e.target.reset();
          this.loadStaff(body, isSuperAdmin);
        } catch (err) {
          const details = err.details ? Object.values(err.details).flat().join(' ') : '';
          errorBox.textContent = details || err.message;
          errorBox.style.display = 'block';
        } finally {
          btn.disabled = false;
        }
      });
    }

    this.loadStaff(body, isSuperAdmin);
  },

  async loadStaff(body, isSuperAdmin) {
    const wrap = body.querySelector('#staff-list');
    wrap.innerHTML = `<div class="spinner" style="margin:10px auto"></div>`;
    try {
      const { data: staff } = await Api.get('/admin/staff');
      const currentUserId = Auth.getUser().id;
      wrap.innerHTML = staff.map((u) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; gap:10px; flex-wrap:wrap;">
          <div>
            <strong>${u.firstName} ${u.lastName}</strong>
            <span class="text-muted"> · @${u.username}</span>
            ${u.role === 'SUPER_ADMIN' ? '<span class="badge badge-gold" style="margin-left:6px;">Super Admin</span>' : ''}
            ${u.status === 'SUSPENDED' ? '<span class="badge badge-wine" style="margin-left:6px;">Askıda</span>' : ''}
          </div>
          ${isSuperAdmin && u.role === 'ADMIN' && u.id !== currentUserId ? `
            <button class="btn btn-outline" data-staff-action="${u.status === 'SUSPENDED' ? 'activate' : 'suspend'}" data-id="${u.id}" style="padding:4px 10px; min-height:auto; font-size:11.5px;">
              ${u.status === 'SUSPENDED' ? 'Aktif Et' : 'Askıya Al'}
            </button>
          ` : ''}
        </div>
      `).join('');

      wrap.querySelectorAll('[data-staff-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.staffAction;
          if (action === 'suspend' && !confirm('Bu yönetici hesabını askıya almak istediğinize emin misiniz?')) return;
          btn.disabled = true;
          try {
            await Api.patch(`/admin/staff/${btn.dataset.id}/status`, { action });
            Toast.success('Güncellendi.');
            this.loadStaff(body, isSuperAdmin);
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

  // --- Sistem Kayıtları ---
  ACTION_LABELS: {
    PARTNER_REGISTERED: 'Paydaş kaydoldu',
    PARTNER_STATUS_APPROVE: 'Paydaş onaylandı',
    PARTNER_STATUS_REJECT: 'Paydaş reddedildi',
    PARTNER_STATUS_SUSPEND: 'Paydaş askıya alındı',
    PARTNER_STATUS_ACTIVATE: 'Paydaş aktif edildi',
    PARTNER_COMMISSION_CHANGED: 'Komisyon planı değiştirildi',
    PARTNER_CREATED_BY_ADMIN: 'Admin yeni paydaş oluşturdu',
    PARTNER_UPDATED_BY_ADMIN: 'Admin paydaş bilgisi güncelledi',
    PARTNER_DELETED: 'Paydaş silindi',
    PRODUCT_CREATED: 'Ürün oluşturuldu',
    PRODUCT_UPDATED: 'Ürün güncellendi',
    PRODUCT_DELETED: 'Ürün silindi',
    VARIANT_ADDED: 'Varyant eklendi',
    VARIANT_UPDATED: 'Varyant güncellendi',
    VARIANT_DELETED: 'Varyant silindi',
    COMMISSION_PLAN_CREATED: 'Komisyon planı oluşturuldu',
    COMMISSION_PLAN_UPDATED: 'Komisyon planı güncellendi',
    COMMISSION_PLAN_DELETED: 'Komisyon planı silindi',
    SALE_VOIDED: 'Satış iptal edildi',
    PAYMENT_RECORDED: 'Ödeme kaydedildi',
    PAYMENT_REQUEST_APPROVED: 'Ödeme talebi onaylandı',
    PAYMENT_REQUEST_REJECTED: 'Ödeme talebi reddedildi',
    SETTINGS_UPDATED: 'Ayarlar güncellendi',
    SHIPPING_RATE_CREATED: 'Kargo ücreti eklendi',
    SHIPPING_RATE_UPDATED: 'Kargo ücreti güncellendi',
    SHIPPING_RATE_DELETED: 'Kargo ücreti silindi',
    ADMIN_STAFF_CREATED: 'Yeni yönetici oluşturuldu',
    ADMIN_STAFF_SUSPEND: 'Yönetici askıya alındı',
    ADMIN_STAFF_ACTIVATE: 'Yönetici aktif edildi',
  },

  renderAuditLog(slot) {
    this.loadAuditLogs(slot.querySelector('#audit-log-body'));
  },

  async loadAuditLogs(body) {
    body.innerHTML = `<div style="text-align:center; padding:14px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: logs } = await Api.get('/admin/audit-logs');
      if (!logs.length) {
        body.innerHTML = `<p class="text-muted">Henüz kayıt yok.</p>`;
        return;
      }
      body.innerHTML = `
        <div class="table-wrap">
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
      body.innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },
};
