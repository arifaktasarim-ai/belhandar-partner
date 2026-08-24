const RegisterPage = {
  async render(container) {
    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-visual">
          <div class="brand">
            <img class="brand-logo" src="./assets/branding/belhandar-wordmark-gold.png" alt="Belhandar Parfümleri" />
          </div>
          <p class="auth-visual-quote">
            Belhandar ailesine katilin. Basvurunuz yonetici onayindan sonra <span>aktif</span> olur.
          </p>
        </div>
        <div class="auth-form-side">
          <div class="auth-card wide card card-pad">
            <div class="auth-head">
              <h1 class="font-display">Paydas basvurusu</h1>
              <p class="text-muted" style="margin:0">Bilgilerinizi eksiksiz doldurun, basvurunuz incelenecektir.</p>
            </div>
            <form id="register-form">
              <div class="field-row">
                <div class="field"><label>Ad</label><input name="firstName" required /></div>
                <div class="field"><label>Soyad</label><input name="lastName" required /></div>
              </div>
              <div class="field-row">
                <div class="field"><label>Kullanici adi</label><input name="username" required /></div>
                <div class="field"><label>E-posta</label><input type="email" name="email" required /></div>
              </div>
              <div class="field-row">
                <div class="field"><label>Telefon</label><input name="phone" placeholder="05xx xxx xx xx" required /></div>
                <div class="field"><label>IBAN</label><input name="iban" placeholder="TR..." required /></div>
              </div>
              <div class="field-row">
                <div class="field"><label>Sehir</label><input name="city" required /></div>
                <div class="field"><label>Ilce</label><input name="district" required /></div>
              </div>
              <div class="field"><label>Adres</label><textarea name="address" rows="2" required></textarea></div>
              <div class="field-row">
                <div class="field"><label>Vergi No <span class="text-muted">(opsiyonel)</span></label><input name="taxId" /></div>
                <div class="field"><label>Vergi Dairesi <span class="text-muted">(opsiyonel)</span></label><input name="taxOffice" /></div>
              </div>
              <div class="field-row">
                <div class="field"><label>Sifre</label><input type="password" name="password" required /></div>
                <div class="field"><label>Sifre (tekrar)</label><input type="password" name="passwordConfirm" required /></div>
              </div>
              <div class="field checkbox-row">
                <input type="checkbox" id="kvkk" name="kvkkAccepted" required />
                <label for="kvkk" style="margin:0">KVKK Aydinlatma Metni ve Kullanim Sartlari'ni okudum, onayliyorum.</label>
              </div>
              <div id="register-error" class="field-error" style="display:none; margin-bottom:14px;"></div>
              <button type="submit" class="btn btn-gold btn-block" id="register-submit">Basvuruyu gonder</button>
            </form>
            <div class="auth-switch">
              Zaten hesabiniz var mi? <a href="#/login">Giris yapin</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#register-form');
    const errorBox = container.querySelector('#register-error');
    const submitBtn = container.querySelector('#register-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      payload.kvkkAccepted = form.querySelector('#kvkk').checked;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Gonderiliyor...';
      try {
        await Auth.register(payload);
        Toast.success('Basvurunuz alindi.');
        Router.navigate('/pending');
      } catch (err) {
        const details = err.details ? Object.values(err.details).flat().join(' ') : '';
        errorBox.textContent = details || err.message;
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Basvuruyu gonder';
      }
    });
  },
};
