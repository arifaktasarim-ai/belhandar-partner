const AdminPartnersPage = {
  state: { status: '', search: '' },
  plans: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Paydaslar' });
    slot.innerHTML = `
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
          <div style="font-weight:600">${p.firstName} ${p.lastName}</div>
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
          <div>
            <div style="font-weight:600">${p.firstName} ${p.lastName}</div>
            <div class="text-muted" style="font-size:12px">@${p.username}</div>
          </div>
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
          reason = prompt('Red gerekcesi (opsiyonel):') || undefined;
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
  },
};
