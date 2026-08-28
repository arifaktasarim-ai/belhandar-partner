const AdminReportsPage = {
  async render(container) {
    const slot = Layout.renderShell(container, { title: 'Raporlar' });
    slot.innerHTML = `
      <div class="section-title">Excel / CSV Raporları</div>
      <p class="text-muted" style="margin-bottom:18px;">
        İndirdiğiniz dosyalar Excel'de doğrudan açılabilir (CSV formatında, Türkçe karakter uyumlu).
      </p>
      <div class="stat-grid" id="reports-grid"></div>
    `;

    const reports = [
      { key: 'sales', title: 'Satış Raporu', desc: 'Tüm satışlar, paydaş, ürün, kazanç detayıyla.' },
      { key: 'partners', title: 'Paydaş Raporu', desc: 'Paydaş performans özeti, ciro ve kazanç.' },
      { key: 'stock', title: 'Stok Raporu', desc: 'Merkez ve paydaş bazında stok durumu.' },
      { key: 'payments', title: 'Ödeme Raporu', desc: 'Yapılan tüm ödemeler ve kim tarafından yapıldığı.' },
      { key: 'monthly-earnings', title: 'Aylık Kazanç Raporu', desc: 'Bu ay paydaş bazında kazanç dökümü.' },
    ];

    const grid = slot.querySelector('#reports-grid');
    grid.innerHTML = reports.map((r) => `
      <div class="card card-pad">
        <div style="font-weight:700; margin-bottom:6px;">${r.title}</div>
        <div class="text-muted" style="font-size:12.5px; margin-bottom:14px;">${r.desc}</div>
        <button class="btn btn-outline btn-block" data-download="${r.key}">İndir (CSV)</button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-download]').forEach((btn) => {
      btn.addEventListener('click', () => this.download(btn));
    });
  },

  async download(btn) {
    const key = btn.dataset.download;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Hazırlanıyor...';
    try {
      const res = await fetch(`${window.BELHANDAR_CONFIG.API_BASE_URL}/reports/${key}`, {
        headers: { Authorization: `Bearer ${Api.getAccessToken()}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Rapor indirilemedi.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `belhandar-${key}-raporu.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Toast.success('Rapor indirildi.');
    } catch (err) {
      Toast.error(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  },
};
