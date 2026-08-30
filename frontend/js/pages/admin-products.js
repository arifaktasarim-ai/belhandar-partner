const AdminProductsPage = {
  plans: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Ürünler' });
    slot.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div class="section-title" style="margin:0">Ürün Kataloğu</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" id="btn-plans">Komisyon Planları</button>
          <button class="btn btn-gold" id="btn-new-product">+ Yeni Ürün</button>
        </div>
      </div>
      <div id="products-wrap"></div>

      <div id="product-form-panel" class="card card-pad" style="display:none; margin-top:16px;">
        <div class="section-title">Yeni Ürün Ekle</div>
        <form id="product-form">
          <div class="field-row">
            <div class="field"><label>Ürün Adı</label><input name="name" required /></div>
            <div class="field"><label>Ürün Kodu</label><input name="productCode" placeholder="BH-NOIR" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Parfüm Tipi</label><input name="perfumeType" placeholder="Eau de Parfum" /></div>
            <div class="field"><label>Görsel URL <span class="text-muted">(opsiyonel)</span></label><input name="imageUrl" type="url" placeholder="https://..." /></div>
          </div>
          <div class="field"><label>Açıklama</label><textarea name="description" rows="2"></textarea></div>

          <div class="section-title" style="font-size:14px; margin-top:20px;">İlk Varyant</div>
          <div class="field-row">
            <div class="field"><label>Hacim (ml)</label><input name="volumeMl" type="number" min="1" required /></div>
            <div class="field"><label>SKU</label><input name="sku" placeholder="BH-NOIR-50" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Barkod <span class="text-muted">(opsiyonel)</span></label><input name="barcode" /></div>
            <div class="field"><label>Merkez Stok</label><input name="centralStock" type="number" min="0" value="0" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Satış Fiyatı (TL)</label><input name="retailPrice" type="number" step="0.01" min="0" required /></div>
            <div class="field"><label>Paydaş Fiyatı (TL)</label><input name="partnerPrice" type="number" step="0.01" min="0" required /></div>
          </div>
          <div class="field" style="max-width:220px;"><label>Minimum Stok Seviyesi</label><input name="minStockLevel" type="number" min="0" value="10" required /></div>

          <div id="product-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <div style="display:flex; gap:8px;">
            <button type="submit" class="btn btn-gold">Ürünü Kaydet</button>
            <button type="button" class="btn btn-ghost" id="btn-cancel-product">Vazgeç</button>
          </div>
        </form>
      </div>

      <div id="plans-panel" class="card card-pad" style="display:none; margin-top:16px;">
        <div class="section-title">Komisyon Planları</div>
        <div id="plans-list"></div>
        <hr style="border:none; border-top:1px solid var(--border); margin:18px 0;" />
        <div class="section-title" style="font-size:14px;">Yeni Plan Ekle</div>
        <form id="plan-form">
          <div class="field-row">
            <div class="field"><label>Plan Adı</label><input name="name" placeholder="orn. Kidemli %30" required /></div>
            <div class="field">
              <label>Tip</label>
              <select name="type">
                <option value="PERCENTAGE">Yüzde bazlı</option>
                <option value="FIXED">Sabit TL bazlı</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Değer <span class="text-muted">(yüzde ise "25", sabit ise TL tutar)</span></label><input name="value" type="number" step="0.01" min="0" required /></div>
            <div class="field checkbox-row" style="align-items:center; margin-top:22px;">
              <input type="checkbox" id="plan-default" name="isDefault" /><label for="plan-default" style="margin:0">Varsayılan plan yap</label>
            </div>
          </div>
          <div id="plan-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Planı Kaydet</button>
        </form>
      </div>
    `;

    slot.querySelector('#btn-new-product').addEventListener('click', () => {
      slot.querySelector('#product-form-panel').style.display = 'block';
      slot.querySelector('#plans-panel').style.display = 'none';
      slot.querySelector('#product-form-panel').scrollIntoView({ behavior: 'smooth' });
    });
    slot.querySelector('#btn-cancel-product').addEventListener('click', () => {
      slot.querySelector('#product-form-panel').style.display = 'none';
    });
    slot.querySelector('#btn-plans').addEventListener('click', async () => {
      const panel = slot.querySelector('#plans-panel');
      const willShow = panel.style.display === 'none';
      panel.style.display = willShow ? 'block' : 'none';
      slot.querySelector('#product-form-panel').style.display = 'none';
      if (willShow) await this.loadPlans(slot);
    });

    slot.querySelector('#product-form').addEventListener('submit', (e) => this.submitProduct(e, slot));
    slot.querySelector('#plan-form').addEventListener('submit', (e) => this.submitPlan(e, slot));

    await this.loadProducts(slot.querySelector('#products-wrap'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  async loadProducts(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:40px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: products } = await Api.get('/products?all=true');
      if (!products.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">🧴</div><h3>Henüz ürün yok</h3><p>"Yeni Ürün" ile ilk ürününüzü ekleyin.</p></div></div>`;
        return;
      }
      wrap.innerHTML = products.map((p) => this.productCardHtml(p)).join('');
      this.bindActions(wrap);
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  productCardHtml(product) {
    const image = product.images && product.images[0];
    return `
      <div class="card card-pad" style="margin-bottom:14px;">
        <div style="display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; margin-bottom:12px;">
          ${image
            ? `<img src="${image.url}" data-lightbox="${image.url}" alt="${product.name}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; cursor:zoom-in; border:1px solid var(--border);" />`
            : `<div style="width:64px; height:64px; border-radius:8px; background:var(--ivory); border:1px dashed var(--border-strong); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">🧴</div>`
          }
          <div style="flex:1; min-width:180px;">
            <div style="font-weight:700; font-size:15px;">${product.name}</div>
            <div class="text-muted" style="font-size:12px;">${product.productCode} ${product.perfumeType ? `· ${product.perfumeType}` : ''}</div>
            ${!product.isActive ? '<span class="badge badge-neutral" style="margin-top:4px;">Pasif Ürün</span>' : ''}
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline" data-edit-product="${product.id}" style="padding:6px 12px; min-height:auto; font-size:12px;">Düzenle</button>
            <button class="btn btn-danger" data-delete-product="${product.id}" style="padding:6px 12px; min-height:auto; font-size:12px;">Sil</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Varyant</th><th>Satış</th><th>Paydaş</th><th>Kâr</th><th>Stok</th><th>Durum</th><th></th></tr></thead>
            <tbody>
              ${product.variants.map((v) => this.variantRowHtml(product, v)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  variantRowHtml(product, variant) {
    const profit = variant.retailPriceCents - variant.partnerPriceCents;
    const lowStock = variant.centralStock <= variant.minStockLevel;
    const canDelete = product.variants.length > 1;
    return `
      <tr>
        <td class="mono">${variant.volumeMl} ml <span class="text-muted">(${variant.sku})</span></td>
        <td>${this.fmtTl(variant.retailPriceCents)}</td>
        <td>${this.fmtTl(variant.partnerPriceCents)}</td>
        <td style="color:var(--sage); font-weight:600;">${this.fmtTl(profit)}</td>
        <td>${variant.centralStock} ${lowStock ? '<span class="badge badge-wine" style="margin-left:4px;">Düşük</span>' : ''}</td>
        <td>
          <button class="btn ${variant.isActive ? 'btn-outline' : 'btn-gold'}" data-toggle="${variant.id}" data-active="${variant.isActive}" style="padding:5px 10px; min-height:auto; font-size:12px;">
            ${variant.isActive ? 'Aktif' : 'Pasif'}
          </button>
        </td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline" data-edit-variant="${variant.id}" style="padding:5px 8px; min-height:auto; font-size:11.5px;">Düzenle</button>
          ${canDelete ? `<button class="btn btn-danger" data-delete-variant="${variant.id}" style="padding:5px 8px; min-height:auto; font-size:11.5px; margin-left:4px;">Sil</button>` : ''}
        </td>
      </tr>
    `;
  },

  bindActions(wrap) {
    wrap.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === 'true';
        btn.disabled = true;
        try {
          await Api.put(`/products/variants/${btn.dataset.toggle}`, { isActive: !isActive });
          Toast.success('Güncellendi.');
          this.loadProducts(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });

    wrap.querySelectorAll('[data-lightbox]').forEach((img) => {
      img.addEventListener('click', () => this.openLightbox(img.dataset.lightbox));
    });

    wrap.querySelectorAll('[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => this.openEditProductModal(btn.dataset.editProduct, wrap));
    });
    wrap.querySelectorAll('[data-delete-product]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu ürünü ve tüm varyantlarını kalıcı olarak silmek istediğinize emin misiniz?')) return;
        btn.disabled = true;
        try {
          await Api.del(`/products/${btn.dataset.deleteProduct}`);
          Toast.success('Ürün silindi.');
          this.loadProducts(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });

    wrap.querySelectorAll('[data-edit-variant]').forEach((btn) => {
      btn.addEventListener('click', () => this.openEditVariantModal(btn.dataset.editVariant, wrap));
    });
    wrap.querySelectorAll('[data-delete-variant]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu varyantı silmek istediğinize emin misiniz?')) return;
        btn.disabled = true;
        try {
          await Api.del(`/products/variants/${btn.dataset.deleteVariant}`);
          Toast.success('Varyant silindi.');
          this.loadProducts(wrap);
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
  },

  // --- Lightbox (küçük resme tıklayınca büyütme) ---
  openLightbox(url) {
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed; inset:0; z-index:90; background:rgba(22,20,15,0.85); display:flex; align-items:center; justify-content:center; padding:30px; cursor:zoom-out;';
    root.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%; border-radius:10px; box-shadow:var(--shadow-lg);" />`;
    root.addEventListener('click', () => root.remove());
    document.body.appendChild(root);
  },

  // --- Modal altyapısı ---
  ensureModalRoot() {
    let root = document.getElementById('product-modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'product-modal-root';
      root.style.cssText = 'position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; background:rgba(22,20,15,0.55); padding:20px;';
      document.body.appendChild(root);
    }
    return root;
  },
  closeModal() {
    const root = document.getElementById('product-modal-root');
    if (root) root.remove();
  },
  modalShell(title, bodyHtml) {
    const root = this.ensureModalRoot();
    root.innerHTML = `
      <div class="card" style="max-width:520px; width:100%; max-height:88vh; overflow-y:auto;">
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

  async openEditProductModal(productId, wrap) {
    const root = this.modalShell('Ürünü Düzenle', `<div style="text-align:center; padding:20px;"><div class="spinner" style="margin:0 auto"></div></div>`);
    try {
      const { data: p } = await Api.get(`/products/${productId}`);
      const image = p.images && p.images[0];
      root.querySelector('.modal-body').innerHTML = `
        <form id="edit-product-form">
          ${image ? `<img src="${image.url}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; margin-bottom:14px;" />` : ''}
          <div class="field"><label>Ürün Adı</label><input name="name" value="${p.name}" required /></div>
          <div class="field"><label>Parfüm Tipi</label><input name="perfumeType" value="${p.perfumeType || ''}" /></div>
          <div class="field"><label>Görsel URL</label><input name="imageUrl" type="url" value="${image?.url || ''}" placeholder="https://..." /></div>
          <div class="field"><label>Açıklama</label><textarea name="description" rows="2">${p.description || ''}</textarea></div>
          <div class="field checkbox-row"><input type="checkbox" id="edit-p-active" name="isActive" ${p.isActive ? 'checked' : ''} /><label for="edit-p-active" style="margin:0">Aktif</label></div>
          <div id="edit-product-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Kaydet</button>
        </form>
      `;
      root.querySelector('#edit-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = root.querySelector('#edit-product-error');
        errorBox.style.display = 'none';
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        payload.isActive = e.target.querySelector('#edit-p-active').checked;
        if (!payload.imageUrl) delete payload.imageUrl;
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await Api.put(`/products/${productId}`, payload);
          Toast.success('Ürün güncellendi.');
          this.closeModal();
          this.loadProducts(wrap);
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        } finally {
          btn.disabled = false;
        }
      });
    } catch (err) {
      root.querySelector('.modal-body').innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  async openEditVariantModal(variantId, wrap) {
    const root = this.modalShell('Varyantı Düzenle', `<div style="text-align:center; padding:20px;"><div class="spinner" style="margin:0 auto"></div></div>`);
    try {
      // Mevcut listeden varyant bilgisini bul (ayrı bir GET ucu yok, wrap icindeki veriden okumak yerine tum urunleri tekrar cekiyoruz)
      const { data: products } = await Api.get('/products?all=true');
      let variant = null;
      for (const p of products) {
        const found = p.variants.find((v) => v.id === variantId);
        if (found) { variant = found; break; }
      }
      if (!variant) throw new Error('Varyant bulunamadı.');

      root.querySelector('.modal-body').innerHTML = `
        <form id="edit-variant-form">
          <div class="field-row">
            <div class="field"><label>Satış Fiyatı (TL)</label><input name="retailPrice" type="number" step="0.01" min="0" value="${variant.retailPriceCents / 100}" required /></div>
            <div class="field"><label>Paydaş Fiyatı (TL)</label><input name="partnerPrice" type="number" step="0.01" min="0" value="${variant.partnerPriceCents / 100}" required /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Merkez Stok</label><input name="centralStock" type="number" min="0" value="${variant.centralStock}" required /></div>
            <div class="field"><label>Minimum Stok</label><input name="minStockLevel" type="number" min="0" value="${variant.minStockLevel}" required /></div>
          </div>
          <div class="field checkbox-row"><input type="checkbox" id="edit-v-active" ${variant.isActive ? 'checked' : ''} /><label for="edit-v-active" style="margin:0">Aktif</label></div>
          <div id="edit-variant-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Kaydet</button>
        </form>
      `;
      root.querySelector('#edit-variant-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = root.querySelector('#edit-variant-error');
        errorBox.style.display = 'none';
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        payload.isActive = e.target.querySelector('#edit-v-active').checked;
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await Api.put(`/products/variants/${variantId}`, payload);
          Toast.success('Varyant güncellendi.');
          this.closeModal();
          this.loadProducts(wrap);
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        } finally {
          btn.disabled = false;
        }
      });
    } catch (err) {
      root.querySelector('.modal-body').innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  async submitProduct(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#product-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.imageUrl) delete payload.imageUrl;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Api.post('/products', payload);
      Toast.success('Ürün eklendi.');
      form.reset();
      slot.querySelector('#product-form-panel').style.display = 'none';
      await this.loadProducts(slot.querySelector('#products-wrap'));
    } catch (err) {
      const details = err.details ? Object.values(err.details).flat().join(' ') : '';
      errorBox.textContent = details || err.message;
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  },

  async loadPlans(slot) {
    const list = slot.querySelector('#plans-list');
    list.innerHTML = `<div class="spinner" style="margin:10px auto"></div>`;
    try {
      const { data: plans } = await Api.get('/admin/commission-plans');
      this.plans = plans;
      if (!plans.length) {
        list.innerHTML = `<p class="text-muted">Henüz komisyon planı yok.</p>`;
        return;
      }
      list.innerHTML = plans.map((p) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border); gap:10px; flex-wrap:wrap;">
          <div>
            <strong>${p.name}</strong>
            <span class="text-muted" style="margin-left:8px;">${p.type === 'PERCENTAGE' ? `%${p.displayValue}` : this.fmtTl(p.value)}</span>
            ${p.isDefault ? '<span class="badge badge-gold" style="margin-left:8px;">Varsayılan</span>' : ''}
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="text-muted" style="font-size:12px">${p._count.partners} paydaş kullanıyor</span>
            <button class="btn btn-outline" data-edit-plan="${p.id}" style="padding:5px 10px; min-height:auto; font-size:11.5px;">Düzenle</button>
            <button class="btn btn-danger" data-delete-plan="${p.id}" style="padding:5px 10px; min-height:auto; font-size:11.5px;">Sil</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('[data-edit-plan]').forEach((btn) => {
        btn.addEventListener('click', () => this.openEditPlanModal(btn.dataset.editPlan, slot));
      });
      list.querySelectorAll('[data-delete-plan]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Bu komisyon planını silmek istediğinize emin misiniz?')) return;
          btn.disabled = true;
          try {
            await Api.del(`/admin/commission-plans/${btn.dataset.deletePlan}`);
            Toast.success('Plan silindi.');
            this.loadPlans(slot);
          } catch (err) {
            Toast.error(err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      list.innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  openEditPlanModal(planId, slot) {
    const plan = this.plans.find((p) => p.id === planId);
    if (!plan) return;
    const root = this.modalShell('Komisyon Planını Düzenle', `
      <form id="edit-plan-form">
        <div class="field"><label>Plan Adı</label><input name="name" value="${plan.name}" required /></div>
        <div class="field"><label>Değer <span class="text-muted">(${plan.type === 'PERCENTAGE' ? 'yüzde, örn 25' : 'TL tutar'})</span></label><input name="value" type="number" step="0.01" min="0" value="${plan.displayValue}" required /></div>
        <div class="field checkbox-row"><input type="checkbox" id="edit-plan-default" ${plan.isDefault ? 'checked' : ''} /><label for="edit-plan-default" style="margin:0">Varsayılan plan yap</label></div>
        <div class="field checkbox-row"><input type="checkbox" id="edit-plan-active" ${plan.isActive ? 'checked' : ''} /><label for="edit-plan-active" style="margin:0">Aktif</label></div>
        <div id="edit-plan-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
        <button type="submit" class="btn btn-gold">Kaydet</button>
      </form>
    `);

    root.querySelector('#edit-plan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = root.querySelector('#edit-plan-error');
      errorBox.style.display = 'none';
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      payload.isDefault = e.target.querySelector('#edit-plan-default').checked;
      payload.isActive = e.target.querySelector('#edit-plan-active').checked;
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await Api.put(`/admin/commission-plans/${planId}`, payload);
        Toast.success('Plan güncellendi.');
        this.closeModal();
        this.loadPlans(slot);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      } finally {
        btn.disabled = false;
      }
    });
  },

  async submitPlan(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#plan-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    payload.isDefault = form.querySelector('#plan-default').checked;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await Api.post('/admin/commission-plans', payload);
      Toast.success('Komisyon planı eklendi.');
      form.reset();
      await this.loadPlans(slot);
    } catch (err) {
      const details = err.details ? Object.values(err.details).flat().join(' ') : '';
      errorBox.textContent = details || err.message;
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  },
};
