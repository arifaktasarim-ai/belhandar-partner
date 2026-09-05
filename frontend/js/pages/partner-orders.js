const PartnerOrdersPage = {
  products: [],
  cart: [],

  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Sipariş' });
    slot.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div class="section-title" style="margin:0">Siparişlerim</div>
        <button class="btn btn-gold" id="btn-new-order">+ Yeni Sipariş</button>
      </div>
      <div id="orders-list"></div>

      <div id="order-form-panel" class="card card-pad" style="display:none; margin-top:16px;">
        <div class="section-title">Yeni Sipariş Oluştur</div>
        <div id="order-products"></div>
        <div id="order-cart" style="margin-top:16px;"></div>
        <div id="order-form-error" class="field-error" style="display:none; margin:10px 0;"></div>
        <div style="display:flex; gap:8px; margin-top:14px;">
          <button class="btn btn-gold" id="btn-submit-order">Siparişi Gönder</button>
          <button class="btn btn-ghost" id="btn-cancel-order">Vazgeç</button>
        </div>
      </div>
    `;

    slot.querySelector('#btn-new-order').addEventListener('click', async () => {
      slot.querySelector('#order-form-panel').style.display = 'block';
      await this.loadProducts(slot);
      slot.querySelector('#order-form-panel').scrollIntoView({ behavior: 'smooth' });
    });
    slot.querySelector('#btn-cancel-order').addEventListener('click', () => {
      slot.querySelector('#order-form-panel').style.display = 'none';
      this.cart = [];
    });
    slot.querySelector('#btn-submit-order').addEventListener('click', () => this.submitOrder(slot));

    await this.loadOrders(slot.querySelector('#orders-list'));
  },

  fmtTl(cents) {
    return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
  },

  statusMeta(status) {
    const map = {
      PENDING_APPROVAL: ['badge-gold', 'Onay Bekliyor'],
      APPROVED: ['badge-sage', 'Onaylandı'],
      REJECTED: ['badge-wine', 'Reddedildi'],
      IN_PRODUCTION_QUEUE: ['badge-gold', 'Üretim Bekliyor'],
      IN_PRODUCTION: ['badge-gold', 'Üretimde'],
      QUALITY_CHECK: ['badge-gold', 'Kalite Kontrol'],
      READY: ['badge-sage', 'Hazır'],
      SHIPPED: ['badge-sage', 'Kargoda'],
      DELIVERED: ['badge-sage', 'Teslim Edildi'],
      CANCELLED: ['badge-neutral', 'İptal'],
    };
    return map[status] || ['badge-neutral', status];
  },

  async loadOrders(wrap) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto"></div></div>`;
    try {
      const { data: orders } = await Api.get('/orders/me');
      if (!orders.length) {
        wrap.innerHTML = `<div class="card"><div class="empty-state"><div class="em-icon">📋</div><h3>Henüz siparişiniz yok</h3><p>"Yeni Sipariş" ile Belhandar'dan ürün talep edin.</p></div></div>`;
        return;
      }
      wrap.innerHTML = `
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Sipariş No</th><th>Tarih</th><th>Ürünler</th><th>Tutar</th><th>Durum</th><th></th></tr></thead>
            <tbody>
              ${orders.map((o) => {
                const [cls, label] = this.statusMeta(o.status);
                return `
                  <tr>
                    <td class="mono">${o.orderNumber}</td>
                    <td class="mono">${new Date(o.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td>${o.items.map((i) => `${i.variant.product.name} (${i.variant.volumeMl}ml) x${i.quantity}${i.testerQuantity > 0 ? ` <span class="text-muted">(+${i.testerQuantity} tester)</span>` : ''}`).join(', ')}</td>
                    <td>${this.fmtTl(o.totalAmountCents)}</td>
                    <td><span class="badge ${cls}">${label}</span></td>
                    <td>${o.status === 'PENDING_APPROVAL' ? `<button class="btn btn-outline" data-cancel="${o.id}" style="padding:5px 10px; min-height:auto; font-size:12px;">İptal Et</button>` : ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="record-cards">
          ${orders.map((o) => {
            const [cls, label] = this.statusMeta(o.status);
            return `
              <div class="record-card">
                <div style="display:flex; justify-content:space-between;">
                  <span class="mono" style="font-weight:600">${o.orderNumber}</span>
                  <span class="badge ${cls}">${label}</span>
                </div>
                <div class="text-muted" style="font-size:12.5px; margin:6px 0;">${o.items.map((i) => `${i.variant.product.name} x${i.quantity}${i.testerQuantity > 0 ? ` (+${i.testerQuantity} tester)` : ''}`).join(', ')}</div>
                <div class="record-card-row"><span class="label">Tutar</span><span>${this.fmtTl(o.totalAmountCents)}</span></div>
                ${o.status === 'PENDING_APPROVAL' ? `<button class="btn btn-outline btn-block" data-cancel="${o.id}" style="margin-top:8px;">İptal Et</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
      wrap.querySelectorAll('[data-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return;
          btn.disabled = true;
          try {
            await Api.patch(`/orders/${btn.dataset.cancel}/cancel`);
            Toast.success('Sipariş iptal edildi.');
            this.loadOrders(wrap);
          } catch (err) {
            Toast.error(err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      wrap.innerHTML = `<div class="card card-pad"><p class="field-error">${err.message}</p></div>`;
    }
  },

  async loadProducts(slot) {
    const wrap = slot.querySelector('#order-products');
    wrap.innerHTML = `<div class="spinner" style="margin:14px auto"></div>`;
    try {
      const { data: products } = await Api.get('/products');
      this.products = products;
      if (!products.length) {
        wrap.innerHTML = `<p class="text-muted">Şu an sipariş verilebilecek ürün yok.</p>`;
        return;
      }
      wrap.innerHTML = products.map((p) => p.variants.filter((v) => v.isActive).map((v) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border); gap:10px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:600">${p.name} <span class="text-muted" style="font-weight:400">(${v.volumeMl} ml)</span></div>
            <div class="text-muted" style="font-size:12px">${this.fmtTl(v.partnerPriceCents)} / adet</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <label class="text-muted" style="font-size:10px;">Adet</label>
              <input type="number" min="1" value="1" data-qty="${v.id}" style="width:60px; padding:7px 8px; border:1px solid var(--border-strong); border-radius:6px;" />
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <label class="text-muted" style="font-size:10px;">Tester</label>
              <input type="number" min="0" value="0" data-tester="${v.id}" style="width:60px; padding:7px 8px; border:1px solid var(--border-strong); border-radius:6px;" />
            </div>
            <button class="btn btn-outline" data-add="${v.id}" style="padding:7px 12px; min-height:auto; align-self:flex-end;">Ekle</button>
          </div>
        </div>
      `).join('')).join('');

      wrap.querySelectorAll('[data-add]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const variantId = btn.dataset.add;
          const qtyInput = wrap.querySelector(`[data-qty="${variantId}"]`);
          const testerInput = wrap.querySelector(`[data-tester="${variantId}"]`);
          const quantity = Math.max(1, parseInt(qtyInput.value, 10) || 1);
          const testerQuantity = Math.max(0, parseInt(testerInput.value, 10) || 0);
          const existing = this.cart.find((c) => c.variantId === variantId);
          if (existing) { existing.quantity = quantity; existing.testerQuantity = testerQuantity; }
          else this.cart.push({ variantId, quantity, testerQuantity });
          this.renderCart(slot);
          Toast.success('Sepete eklendi.');
        });
      });
    } catch (err) {
      wrap.innerHTML = `<p class="field-error">${err.message}</p>`;
    }
  },

  findVariant(variantId) {
    for (const p of this.products) {
      const v = p.variants.find((x) => x.id === variantId);
      if (v) return { product: p, variant: v };
    }
    return null;
  },

  renderCart(slot) {
    const wrap = slot.querySelector('#order-cart');
    if (!this.cart.length) {
      wrap.innerHTML = `<p class="text-muted">Sepetiniz boş.</p>`;
      return;
    }
    let total = 0;
    const rows = this.cart.map((item) => {
      const found = this.findVariant(item.variantId);
      if (!found) return '';
      const lineTotal = found.variant.partnerPriceCents * item.quantity;
      total += lineTotal;
      return `
        <div style="display:flex; justify-content:space-between; padding:6px 0;">
          <span>${found.product.name} (${found.variant.volumeMl}ml) x${item.quantity} ${item.testerQuantity > 0 ? `<span class="text-muted">(+${item.testerQuantity} tester)</span>` : ''}</span>
          <span>${this.fmtTl(lineTotal)}</span>
        </div>
      `;
    }).join('');
    wrap.innerHTML = `
      <div class="section-title" style="font-size:14px;">Sepet</div>
      ${rows}
      <div style="display:flex; justify-content:space-between; font-weight:700; padding-top:8px; border-top:1px solid var(--border); margin-top:6px;">
        <span>Toplam</span><span>${this.fmtTl(total)}</span>
      </div>
      <p class="text-muted" style="font-size:11.5px; margin-top:6px;">Tester adetleri ücretsizdir, toplam tutara dahil edilmez.</p>
    `;
  },

  async submitOrder(slot) {
    const errorBox = slot.querySelector('#order-form-error');
    errorBox.style.display = 'none';
    if (!this.cart.length) {
      errorBox.textContent = 'Sepetiniz boş, en az 1 ürün ekleyin.';
      errorBox.style.display = 'block';
      return;
    }
    const btn = slot.querySelector('#btn-submit-order');
    btn.disabled = true;
    try {
      await Api.post('/orders', { items: this.cart });
      Toast.success('Siparişiniz oluşturuldu.');
      this.cart = [];
      slot.querySelector('#order-form-panel').style.display = 'none';
      await this.loadOrders(slot.querySelector('#orders-list'));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },
};
