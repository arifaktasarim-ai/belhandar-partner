const AdminPartnersPage = {
  state: { status: '', search: '' },
  plans: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Paydaslar' });
    slot.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div class="section-title" style="margin:0">Paydas Listesi</div>
        <button class="btn btn-gold" id="btn-new-partner">+ Yeni Paydas</button>
      </div>
      <div class="card card-pad" style="margin-bottom:18px; display:flex; gap:12px; flex-wrap:wrap; align-items:end;">
        <div class="field" style="margin:0; min-width:220px; flex:1;">
          <label>Ara</label>
          <input type="text" id="p-search" placeholder="Ad, kullanici adi, e-posta, sehir..." />
        </div>
        <div class="field" style="margin:0; min-width:180px;">
          <label>Durum</label>
          <select id="p-status">
            <option value="">Tumu</option>
            <option value="PENDING_APPROVAL">Onay Bekliyor</option>
            <option value="ACTIVE">Aktif</option>
            <option value="REJECTED">Reddedildi</option>
            <option value="SUSPENDED">Askida</option>
          </select>
        </div>
      </div>
      <div id="p-list-wrap"></div>
    `;

    const searchInput = slot.querySelector('#p-search');
    const statusSelect = slot.querySelector('#p-status');
    let debounceTimer;

    const reload = () => this.load(slot.querySelector('#p-list-wrap'));

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.state.search = searchInput.value.trim();
        reload();
      }, 350);
    });
    statusSelect.addEventListener('change', () => {
      this.state.status = statusSelect.value;
      reload();
    });
    slot.querySelector('#btn-new-partner').addEventListener('click', () => this.openCreateModal(reload));

    await this.fetchPlans();
    await reload();
  },

  async fetchPlans() {
    try {
      const { data } = await Api.get('/admin/commission-plans');
      this.plans = data.filter((p) => p.isActive);
    } catch (_e) {
      this.plans = [];
    }
  },

  async load(listWrap) {
    listWrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;

    const params = new URLSearchParams();
    if (this.state.status) params.set('status', this.state.status);
    if (this.state.search) params.set('search', this.state.search);

    try {
      const { data: partners } = await Api.get(`/admin/partners?${params.toString()}`);
      if (!partners.length) {
        listWrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🗂</div><h3>Kayit bulunamadi</h3><p>Filtreleri degistirip tekrar deneyin.</p></div></div>`;
        return;
      }
      listWrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr>
              <th>Paydas</th><th>Sehir</th><th>Kayit Tarihi</th><th>Komisyon</th><th>Durum</th><th></th>
            </tr></thead>
            <tbody>${partners.map((p) => this.rowHtml(p)).join('')}</tbody>
          </table>
        </div>
        <div class="record-cards">${partners.map((p) => this.cardHtml(p)).join('')}</div>
      `;
      this.bindActions(listWrap);
    } catch (err) {
      listWrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  statusBadge(status) {
    const map = {
      PENDING_APPROVAL: ['badge-gold', 'Onay Bekliyor'],
      ACTIVE: ['badge-sage', 'Aktif'],
      REJECTED: ['badge-wine', 'Reddedildi'],
      SUSPENDED: ['badge-neutral', 'Askida'],
    };
    const [cls, label] = map[status] || ['badge-neutral', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  actionsHtml(p) {
    const s = p.status;
    const btns = [];
    if (s === 'PENDING_APPROVAL') {
      btns.push(`<button class="btn btn-gold" data-act="approve" data-id="${p.id}" style="padding:6px 12px;min-height:auto;">Onayla</button>`);
      btns.push(`<button class="btn btn-danger" data-act="reject" data-id="${p.id}" style="padding:6px 12px;min-height:auto;">Reddet</button>`);
    } else if (s === 'ACTIVE') {
      btns.push(`<button class="btn btn-outline" data-act="suspend" data-id="${p.id}" style="padding:6px 12px;min-height:auto;">Askiya al</button>`);
    } else if (s === 'SUSPENDED' || s === 'REJECTED') {
      btns.push(`<button class="btn btn-gold" data-act="activate" data-id="${p.id}" style="padding:6px 12px;min-height:auto;">Aktif et</button>`);
    }
    btns.push(`<button class="btn btn-outline" data-view="${p.id}" style="padding:6px 12px;min-height:auto;">Detay</button>`);
    return `<div style="display:flex; gap:6px; flex-wrap:wrap;">${btns.join('')}</div>`;
  },

  commissionSelectHtml(p) {
    if (!this.plans.length) return p.partnerProfile?.commissionPlan?.name || '—';
    const currentId = p.partnerProfile?.commissionPlan?.id || '';
    return `
      <select data-commission-select data-id="${p.id}" style="padding:5px 8px; border:1px solid var(--border-strong); border-radius:6px; font-size:12.5px;">
        <option value="">Plan seçilmedi</option>
        ${this.plans.map((plan) => `<option value="${plan.id}" ${plan.id === currentId ? 'selected' : ''}>${plan.name}</option>`).join('')}
      </select>
    `;
  },

  rowHtml(p) {
    return `
      <tr>
        <td>
          <button data-view="${p.id}" style="background:none; border:none; padding:0; cursor:pointer; text-align:left;">
            <div style="font-weight:600; color:var(--gold-dim); text-decoration:underline; text-decoration-color:var(--border-strong);">${p.firstName} ${p.lastName}</div>
          </button>
          <div class="text-muted" style="font-size:12px">@${p.username} · ${p.email}</div>
        </td>
        <td>${p.partnerProfile ? `${p.partnerProfile.city} / ${p.partnerProfile.district}` : '—'}</td>
        <td class="mono">${new Date(p.createdAt).toLocaleDateString('tr-TR')}</td>
        <td>${this.commissionSelectHtml(p)}</td>
        <td>${this.statusBadge(p.status)}</td>
        <td>${this.actionsHtml(p)}</td>
      </tr>
    `;
  },

  cardHtml(p) {
    return `
      <div class="record-card">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <button data-view="${p.id}" style="background:none; border:none; padding:0; cursor:pointer; text-align:left;">
            <div style="font-weight:600; color:var(--gold-dim); text-decoration:underline; text-decoration-color:var(--border-strong);">${p.firstName} ${p.lastName}</div>
            <div class="text-muted" style="font-size:12px">@${p.username}</div>
          </button>
          ${this.statusBadge(p.status)}
        </div>
        <div class="record-card-row"><span class="label">Sehir</span><span>${p.partnerProfile ? `${p.partnerProfile.city} / ${p.partnerProfile.district}` : '—'}</span></div>
        <div class="record-card-row"><span class="label">Kayit</span><span>${new Date(p.createdAt).toLocaleDateString('tr-TR')}</span></div>
        <div class="record-card-row"><span class="label">Komisyon</span><span>${this.commissionSelectHtml(p)}</span></div>
        <div style="margin-top:10px">${this.actionsHtml(p)}</div>
      </div>
    `;
  },

  bindActions(listWrap) {
    listWrap.querySelectorAll('[data-commission-select]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        const commissionPlanId = sel.value;
        if (!commissionPlanId) return;
        sel.disabled = true;
        try {
          await Api.patch(`/admin/partners/${id}/commission-plan`, { commissionPlanId });
          Toast.success('Komisyon planı güncellendi.');
        } catch (err) {
          Toast.error(err.message);
        } finally {
          sel.disabled = false;
        }
      });
    });

    listWrap.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.act;
        const id = btn.dataset.id;

        let reason;
        if (action === 'reject') {
          reason = prompt('Iptal gerekcesi (opsiyonel):') || undefined;
        }
        if (action === 'suspend' && !confirm('Bu paydasi askiya almak istediginize emin misiniz?')) return;

        btn.disabled = true;
        try {
          await Api.patch(`/admin/partners/${id}/status`, { action, reason });
          Toast.success('Islem tamamlandi.');
          this.load(listWrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });

    listWrap.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => this.openDetailModal(btn.dataset.view, () => this.load(listWrap)));
    });
  },

  ensureModalRoot() {
    let root = document.getElementById('partner-modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'partner-modal-root';
      root.style.cssText = 'position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; background:rgba(22,20,15,0.55); padding:20px;';
      document.body.appendChild(root);
    }
    return root;
  },

  closeModal() {
    const root = document.getElementById('partner-modal-root');
    if (root) root.remove();
  },

  modalShell(title, bodyHtml) {
    const root = this.ensureModalRoot();
    root.innerHTML = `
      <div class="card" style="max-width:560px; width:100%; max-height:88vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border-bottom:1px solid var(--border);">
          <div class="section-title" style="margin:0;">${title}</div>
          <button id="modal-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text-muted);">×</button>
        </div>
        <div class="modal-body" style="padding:22px;">${bodyHtml}</div>
      </div>
    `;
    root.addEventListener('click', (e) => { if (e.target === root) this.closeModal(); });
    root.querySelector('#modal-close').addEventListener('click', () => this.closeModal());
    return root;
  },

  async openDetailModal(userId, onChange) {
    const root = this.modalShell('Paydaş Detayı', `<div style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto"></div></div>`);
    try {
      const { data: p } = await Api.get(`/admin/partners/${userId}`);
      const pr = p.partnerProfile;
      root.querySelector('.modal-body').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; font-size:13.5px; margin-bottom:18px;">
          <div><span class="text-muted">Ad Soyad</span><div style="font-weight:600">${p.firstName} ${p.lastName}</div></div>
          <div><span class="text-muted">Kullanıcı Adı</span><div style="font-weight:600">@${p.username}</div></div>
          <div><span class="text-muted">E-posta</span><div>${p.email}</div></div>
          <div><span class="text-muted">Telefon</span><div>${p.phone || '—'}</div></div>
          <div><span class="text-muted">Şehir / İlçe</span><div>${pr ? `${pr.city} / ${pr.district}` : '—'}</div></div>
          <div><span class="text-muted">IBAN</span><div class="mono" style="font-size:12px;">${pr?.iban || '—'}</div></div>
          <div style="grid-column:1/-1;"><span class="text-muted">Adres</span><div>${pr?.address || '—'}</div></div>
          <div><span class="text-muted">Vergi No</span><div>${pr?.taxId || '—'}</div></div>
          <div><span class="text-muted">Vergi Dairesi</span><div>${pr?.taxOffice || '—'}</div></div>
          <div><span class="text-muted">Kayıt Tarihi</span><div>${new Date(p.createdAt).toLocaleDateString('tr-TR')}</div></div>
          <div><span class="text-muted">Durum</span><div>${this.statusBadge(p.status)}</div></div>
          <div><span class="text-muted">Komisyon Planı</span><div>${pr?.commissionPlan?.name || 'Varsayılan'}</div></div>
          <div><span class="text-muted">Onaylayan</span><div>${p.approvedBy ? `${p.approvedBy.firstName} ${p.approvedBy.lastName}` : '—'}</div></div>
        </div>
        <div style="display:flex; gap:12px; margin-bottom:18px; font-size:12.5px;" class="text-muted">
          <span>${pr?._count?.sales ?? 0} satış</span>·
          <span>${pr?._count?.orders ?? 0} sipariş</span>·
          <span>${pr?._count?.payments ?? 0} ödeme</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-gold" id="btn-edit-partner">Düzenle</button>
          <button class="btn btn-danger" id="btn-delete-partner">Sil</button>
        </div>
      `;

      root.querySelector('#btn-edit-partner').addEventListener('click', () => this.openEditModal(p, onChange));
      root.querySelector('#btn-delete-partner').addEventListener('click', async () => {
        if (!confirm(`${p.firstName} ${p.lastName} adlı paydaşı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
        try {
          await Api.del(`/admin/partners/${userId}`);
          Toast.success('Paydaş silindi.');
          this.closeModal();
          onChange();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    } catch (err) {
      root.querySelector('.modal-body').innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  openEditModal(p, onChange) {
    const pr = p.partnerProfile;
    const root = this.modalShell('Paydaşı Düzenle', `
      <form id="edit-partner-form">
        <div class="field-row">
          <div class="field"><label>Ad</label><input name="firstName" value="${p.firstName}" required /></div>
          <div class="field"><label>Soyad</label><input name="lastName" value="${p.lastName}" required /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>E-posta</label><input name="email" type="email" value="${p.email}" required /></div>
          <div class="field"><label>Telefon</label><input name="phone" value="${p.phone || ''}" required /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Şehir</label><input name="city" value="${pr?.city || ''}" required /></div>
          <div class="field"><label>İlçe</label><input name="district" value="${pr?.district || ''}" required /></div>
        </div>
        <div class="field"><label>Adres</label><textarea name="address" rows="2" required>${pr?.address || ''}</textarea></div>
        <div class="field"><label>IBAN</label><input name="iban" value="${pr?.iban || ''}" required /></div>
        <div class="field-row">
          <div class="field"><label>Vergi No</label><input name="taxId" value="${pr?.taxId || ''}" /></div>
          <div class="field"><label>Vergi Dairesi</label><input name="taxOffice" value="${pr?.taxOffice || ''}" /></div>
        </div>
        <div id="edit-partner-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
        <button type="submit" class="btn btn-gold">Kaydet</button>
      </form>
    `);

    root.querySelector('#edit-partner-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = root.querySelector('#edit-partner-error');
      errorBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await Api.put(`/admin/partners/${p.id}`, payload);
        Toast.success('Paydaş bilgileri güncellendi.');
        this.closeModal();
        onChange();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  },

  openCreateModal(onChange) {
    const root = this.modalShell('Yeni Paydaş Ekle', `
      <form id="create-partner-form">
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
        <div class="field-row">
          <div class="field"><label>Şehir</label><input name="city" required /></div>
          <div class="field"><label>İlçe</label><input name="district" required /></div>
        </div>
        <div class="field"><label>Adres</label><textarea name="address" rows="2" required></textarea></div>
        <div class="field"><label>IBAN</label><input name="iban" placeholder="TR..." required /></div>
        <div class="field-row">
          <div class="field"><label>Vergi No <span class="text-muted">(opsiyonel)</span></label><input name="taxId" /></div>
          <div class="field"><label>Vergi Dairesi <span class="text-muted">(opsiyonel)</span></label><input name="taxOffice" /></div>
        </div>
        <div class="field">
          <label>Başlangıç Durumu</label>
          <select name="status">
            <option value="ACTIVE">Aktif (doğrudan giriş yapabilir)</option>
            <option value="PENDING_APPROVAL">Onay Bekliyor</option>
          </select>
        </div>
        <div id="create-partner-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
        <button type="submit" class="btn btn-gold">Paydaşı Oluştur</button>
      </form>
    `);

    root.querySelector('#create-partner-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = root.querySelector('#create-partner-error');
      errorBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await Api.post('/admin/partners', payload);
        Toast.success('Paydaş oluşturuldu.');
        this.closeModal();
        onChange();
      } catch (err) {
        const details = err.details ? Object.values(err.details).flat().join(' ') : '';
        errorBox.textContent = details || err.message;
        errorBox.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  },
};
