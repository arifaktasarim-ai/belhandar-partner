const PartnerDashboardPage = {
  async render(container) {
    const user = Auth.getUser();
    const slot = Layout.renderShell(container, { title: 'Ana Sayfa' });

    slot.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Bugunku Satis</div><div class="stat-value">—</div><div class="stat-sub">Satis modulu eklenince aktif olur</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ay Satilan</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Bu Ay Kazanc</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Toplam Kazanc</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Mevcut Stok</div><div class="stat-value">—</div></div>
        <div class="stat-card"><div class="stat-label">Bekleyen Siparis</div><div class="stat-value">—</div></div>
      </div>
      <div class="card card-pad">
        <div class="section-title">Hos geldiniz, ${user.firstName} ${user.lastName}</div>
        <p class="text-muted">
          Hesabiniz aktif. Satis, stok, siparis ve kazanc ekranlari gelistirme yol haritasindaki
          sonraki asamalarda (Asama 4-8) bu panele eklenecek; veriler dogrudan veritabanindan gelecek.
        </p>
      </div>
    `;
  },
};
