const PartnerProfilePage = {
  async render(container) {
    const user = Auth.getUser();
    const slot = Layout.renderShell(container, { title: 'Profil' });
    const profile = user.partnerProfile;

    slot.innerHTML = `
      <div class="card card-pad" style="max-width:600px; margin-bottom:20px;">
        <div class="section-title">Profil Bilgileri</div>
        <form id="profile-form">
          <div class="field-row">
            <div class="field"><label>Ad</label><input value="${user.firstName}" disabled /></div>
            <div class="field"><label>Soyad</label><input value="${user.lastName}" disabled /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Kullanıcı Adı</label><input value="${user.username}" disabled /></div>
            <div class="field"><label>E-posta</label><input value="${user.email}" disabled /></div>
          </div>
          <div class="field"><label>Telefon</label><input name="phone" value="${user.phone || ''}" required /></div>
          <div class="field-row">
            <div class="field"><label>Şehir</label><input name="city" value="${profile?.city || ''}" required /></div>
            <div class="field"><label>İlçe</label><input name="district" value="${profile?.district || ''}" required /></div>
          </div>
          <div class="field"><label>Adres</label><textarea name="address" rows="2" required>${profile?.address || ''}</textarea></div>
          <div class="field"><label>IBAN</label><input name="iban" value="${profile?.iban || ''}" required /></div>
          <div id="profile-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-gold">Bilgileri Güncelle</button>
        </form>
      </div>

      <div class="card card-pad" style="max-width:600px;">
        <div class="section-title">Şifre Değiştir</div>
        <form id="password-form">
          <div class="field"><label>Mevcut Şifre</label><input name="currentPassword" type="password" required /></div>
          <div class="field"><label>Yeni Şifre</label><input name="newPassword" type="password" required minlength="8" /></div>
          <div id="password-form-error" class="field-error" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-outline">Şifreyi Değiştir</button>
        </form>
      </div>
    `;

    slot.querySelector('#profile-form').addEventListener('submit', (e) => this.submitProfile(e, slot));
    slot.querySelector('#password-form').addEventListener('submit', (e) => this.submitPassword(e, slot));
  },

  async submitProfile(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#profile-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Api.put('/users/me', payload);
      await Auth.loadCurrentUser();
      Toast.success('Bilgileriniz güncellendi.');
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },

  async submitPassword(e, slot) {
    e.preventDefault();
    const form = e.target;
    const errorBox = slot.querySelector('#password-form-error');
    errorBox.style.display = 'none';

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await Api.post('/users/me/change-password', payload);
      Toast.success('Şifreniz güncellendi.');
      form.reset();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  },
};
