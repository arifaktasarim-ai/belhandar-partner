const LoginPage = {
  async render(container) {
    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-visual">
          <div class="brand">
            <img class="brand-logo" src="./assets/branding/belhandar-wordmark-gold.png" alt="Belhandar Parfümleri" />
          </div>
          <p class="auth-visual-quote">
            Her sise bir hikaye tasir. <span>Belhandar</span> paydaslari,
            bu hikayeyi musterilerine tasiyan gucturler.
          </p>
          <div class="text-muted" style="color:var(--text-on-ink-muted); font-size:12.5px;">
            © ${new Date().getFullYear()} Belhandar — Paydas / Bayi Yonetim Sistemi
          </div>
        </div>
        <div class="auth-form-side">
          <div class="auth-card card card-pad">
            <div class="auth-head">
              <h1 class="font-display">Giris yap</h1>
              <p class="text-muted" style="margin:0">Hesabiniza kullanici adi veya e-posta ile giris yapin.</p>
            </div>
            <form id="login-form">
              <div class="field">
                <label>Kullanici adi veya e-posta</label>
                <input type="text" name="identifier" autocomplete="username" required />
              </div>
              <div class="field">
                <label>Sifre</label>
                <input type="password" name="password" autocomplete="current-password" required />
              </div>
              <div id="login-error" class="field-error" style="display:none; margin-bottom:14px;"></div>
              <button type="submit" class="btn btn-gold btn-block" id="login-submit">Giris yap</button>
            </form>
            <div class="auth-switch">
              Hesabiniz yok mu? <a href="#/register">Paydas olarak basvurun</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#login-form');
    const errorBox = container.querySelector('#login-error');
    const submitBtn = container.querySelector('#login-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Giris yapiliyor...';

      const formData = new FormData(form);
      try {
        const user = await Auth.login(formData.get('identifier'), formData.get('password'));
        Toast.success(`Hos geldiniz, ${user.firstName}.`);
        Router.navigate(user.role === 'PARTNER' ? '/partner/dashboard' : '/admin/dashboard');
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Giris yap';
      }
    });
  },
};
