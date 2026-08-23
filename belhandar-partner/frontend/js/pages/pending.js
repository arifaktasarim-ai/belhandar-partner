const PendingPage = {
  async render(container) {
    const user = Auth.getUser();
    const status = user?.status;

    const content = {
      PENDING_APPROVAL: {
        icon: '⏳',
        title: 'Basvurunuz inceleniyor',
        text: 'Hesabiniz yonetici onayindan sonra aktif olacak. Onaylandiginda size haber verecegiz.',
      },
      REJECTED: {
        icon: '✕',
        title: 'Basvurunuz reddedildi',
        text: user?.rejectionReason || 'Detayli bilgi icin Belhandar destek ekibi ile iletisime gecin.',
      },
      SUSPENDED: {
        icon: '⚠',
        title: 'Hesabiniz askiya alindi',
        text: 'Hesabinizla ilgili bir islem yapilmis. Detayli bilgi icin Belhandar destek ekibi ile iletisime gecin.',
      },
    }[status] || { icon: 'ℹ', title: 'Hesap durumu', text: 'Hesap durumunuz belirsiz.' };

    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-visual">
          <div class="brand">
            <div class="brand-mark">B</div>
            <div class="brand-word">Belhandar<small>Partner Sistemi</small></div>
          </div>
        </div>
        <div class="auth-form-side">
          <div class="auth-card card card-pad">
            <div class="status-panel">
              <div class="em-icon">${content.icon}</div>
              <h2 class="font-display">${content.title}</h2>
              <p class="text-muted">${content.text}</p>
              <button class="btn btn-outline" id="logout-btn" style="margin-top:14px">Cikis yap</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#logout-btn').addEventListener('click', async () => {
      await Auth.logout();
      Router.navigate('/login');
    });
  },
};
