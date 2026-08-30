/**
 * Belhandar Partner - Push bildirim aboneligi.
 * Giris yapan kullaniciyi tarayicinin push servisine abone eder ve
 * abonelik bilgisini backend'e kaydeder. Bir oturumda bir kez calisir.
 */
const Push = (() => {
  let initialized = false;

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function subscribe() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return; // desteklenmeyen tarayici
      if (Notification.permission === 'denied') return; // kullanici daha once reddetmis

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const { data } = await Api.get('/push/vapid-public-key');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      }

      const json = subscription.toJSON();
      await Api.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    } catch (_e) {
      // Push bildirimi opsiyoneldir; sessizce gec (izin verilmemis, tarayici desteklemiyor vb.)
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    // Sayfa yuklenmesini yavaslatmamak icin kisa bir gecikmeyle calistir
    setTimeout(subscribe, 1500);
  }

  return { init };
})();
