const RegisterPage = {
  AGREEMENT_TEXT: `
BELHANDAR PAYDAŞLIK / BAYİLİK SÖZLEŞMESİ

İşbu sözleşme, "Belhandar" markasının sahibi (bundan sonra "Belhandar" olarak anılacaktır) ile sisteme paydaş/bayi olarak kayıt olan kişi (bundan sonra "Paydaş" olarak anılacaktır) arasında, aşağıdaki şartlarla akdedilmiştir. Paydaş, bu sistem üzerinden kayıt işlemini tamamlayarak aşağıdaki tüm maddeleri okuduğunu ve kabul ettiğini beyan eder.

MADDE 1 — KONU
Bu sözleşmenin konusu, Paydaş'ın Belhandar markasına ait parfüm ürünlerini, Belhandar tarafından belirlenen fiyat ve şartlarla satın alarak, kendi belirlediği son satış fiyatı üzerinden nihai müşterilere satmasına ilişkin usul ve esasların düzenlenmesidir.

MADDE 2 — PAYDAŞIN YÜKÜMLÜLÜKLERİ
2.1. Paydaş, sisteme kaydolurken verdiği kimlik, iletişim, adres ve banka (IBAN) bilgilerinin doğru ve güncel olduğunu taahhüt eder.
2.2. Paydaş, ürünleri yalnızca Belhandar'ın belirlediği asgari/önerilen fiyat politikasına uygun şekilde satabilir; markanın itibarını zedeleyecek yanıltıcı, eksik veya gerçek dışı beyanlarda bulunamaz.
2.3. Paydaş, sisteme girdiği satış, sipariş, müşteri ve stok bilgilerinin doğruluğundan sorumludur.
2.4. Paydaş, kendisine teslim edilen ürünleri özenle saklamak ve uygun koşullarda muhafaza etmekle yükümlüdür.

MADDE 3 — SİPARİŞ, FİYATLANDIRMA VE KOMİSYON
3.1. Paydaş, sistem üzerinden Belhandar'a ürün siparişi verir; sipariş bedelini, sistemde belirtilen paydaş fiyatı üzerinden öder veya bu tutar mutabakata göre hesaplaşmaya dahil edilir.
3.2. Paydaş'ın her satıştan elde edeceği kâr/komisyon, kendisine tanımlanan komisyon planına (yüzdesel veya sabit tutar) göre otomatik hesaplanır ve sistem üzerinden görüntülenebilir.
3.3. Belhandar, ürün fiyatlarını ve komisyon oranlarını önceden haber vermeksizin güncelleme hakkını saklı tutar; güncel oranlar her zaman sistem üzerinden görüntülenebilir.

MADDE 4 — ÖDEME
4.1. Paydaş'ın hak ettiği kazançlar, sistem üzerinden talep edilebilir; Belhandar, talebi inceleyerek uygun gördüğü şekilde Paydaş'ın bildirdiği IBAN'a ödeme yapar.
4.2. Kargo ile yapılan satışlarda kargo ücretinin kim tarafından karşılanacağı (müşteri/karşı ödemeli veya Belhandar) her satış için ayrıca belirlenir.

MADDE 5 — STOK, İADE VE İPTAL
5.1. Paydaş'a teslim edilen ürünler kendi stoğunda takip edilir; satılan ürünler stoktan otomatik düşülür.
5.2. Hatalı girilen bir satış kaydı, silinmek yerine iptal (VOID) edilir; iptal edilen satışın stoğu Paydaş'ın hesabına geri eklenir ve ilgili kazanç kaydı tersine çevrilir.

MADDE 6 — MARKA VE FİKRİ MÜLKİYET
6.1. "Belhandar" markası, logosu ve tüm görsel/işitsel unsurları Belhandar'a aittir. Paydaş, bu sözleşme kapsamında yalnızca ürünleri pazarlama ve satma amacıyla sınırlı, münhasır olmayan bir kullanım hakkına sahiptir.
6.2. Paydaş, marka adını veya logosunu Belhandar'ın yazılı onayı olmaksızın farklı bir işletme adı, alan adı veya sosyal medya hesabı olarak kullanamaz.

MADDE 7 — GİZLİLİK
Paydaş, sistem üzerinden erişebildiği fiyat, komisyon, stok ve diğer paydaşlara ait bilgileri gizli tutmayı, üçüncü kişilerle paylaşmamayı kabul eder.

MADDE 8 — SÖZLEŞMENİN SÜRESİ VE FESHİ
8.1. Bu sözleşme, Paydaş'ın hesabının onaylanmasıyla yürürlüğe girer ve taraflardan biri tarafından feshedilene kadar yürürlükte kalır.
8.2. Belhandar, Paydaş'ın bu sözleşmedeki yükümlülüklerini ihlal etmesi, markanın itibarını zedeleyici davranışlarda bulunması veya haklı bir gerekçe olması halinde, Paydaş'ın hesabını askıya alma veya sözleşmeyi tek taraflı feshetme hakkına sahiptir.
8.3. Paydaş, dilediği zaman Belhandar'a bildirimde bulunarak bu sözleşmeyi ve paydaşlık ilişkisini sona erdirebilir.

MADDE 9 — KİŞİSEL VERİLERİN KORUNMASI
Taraflar, işbu sözleşme kapsamında paylaşılan kişisel verilerin 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuata uygun şekilde işleneceğini kabul eder.

MADDE 10 — UYUŞMAZLIKLARIN ÇÖZÜMÜ
İşbu sözleşmeden doğabilecek uyuşmazlıklarda, Belhandar'ın merkezinin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.

MADDE 11 — YÜRÜRLÜK
Paydaş, sisteme kayıt olurken bu sözleşmenin tüm maddelerini okuduğunu, anladığını ve elektronik ortamda onayladığını, bu onayın ıslak imza ile yapılmış bir sözleşme ile aynı hukuki bağlayıcılığa sahip olduğunu kabul eder.
  `.trim(),

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

              <div class="field">
                <label>Paydaşlık / Bayilik Sözleşmesi</label>
                <div id="agreement-box" style="max-height:200px; overflow-y:auto; border:1px solid var(--border-strong); border-radius:var(--radius-sm); padding:14px; background:var(--ivory); font-size:12px; line-height:1.6; white-space:pre-line; color:var(--text-muted);"></div>
                <div class="field-hint" id="agreement-hint">Onay kutusunu işaretleyebilmek için lütfen sözleşmeyi sonuna kadar kaydırın.</div>
              </div>
              <div class="field checkbox-row">
                <input type="checkbox" id="agreement" name="partnershipAgreementAccepted" required disabled />
                <label for="agreement" style="margin:0">Yukarıdaki Paydaşlık / Bayilik Sözleşmesi'ni okudum, tüm maddelerini kabul ediyorum.</label>
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

    const agreementBox = container.querySelector('#agreement-box');
    agreementBox.textContent = this.AGREEMENT_TEXT;
    const agreementCheckbox = container.querySelector('#agreement');
    const agreementHint = container.querySelector('#agreement-hint');

    agreementBox.addEventListener('scroll', () => {
      const scrolledToEnd = agreementBox.scrollTop + agreementBox.clientHeight >= agreementBox.scrollHeight - 10;
      if (scrolledToEnd) {
        agreementCheckbox.disabled = false;
        agreementHint.style.display = 'none';
      }
    });
    const form = container.querySelector('#register-form');
    const errorBox = container.querySelector('#register-error');
    const submitBtn = container.querySelector('#register-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      payload.kvkkAccepted = form.querySelector('#kvkk').checked;
      payload.partnershipAgreementAccepted = agreementCheckbox.checked;

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
