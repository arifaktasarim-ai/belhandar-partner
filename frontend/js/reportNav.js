/**
 * Belhandar Partner - Rapor sayfasindaki tiklanabilir ogelerden ilgili
 * yonetim sayfasina, sessionStorage uzerinden bir "on-filtre" tasiyarak
 * gecis yapmayi saglar. Hedef sayfa kendi render() fonksiyonunda ilgili
 * anahtari kontrol edip filtreyi uygular, sonra anahtari temizler.
 */
const ReportNav = {
  KEYS: {
    SALES_PARTNER: 'bh_prefill_sales_partner',
    SALES_STATUS: 'bh_prefill_sales_status',
    SALES_CHANNEL: 'bh_prefill_sales_channel',
    ORDERS_STATUS: 'bh_prefill_orders_status',
    RETURNS_STATUS: 'bh_prefill_returns_status',
    CUSTOMERS_SEARCH: 'bh_prefill_customers_search',
    PRODUCTS_SEARCH: 'bh_prefill_products_search',
  },

  goTo(path, key, value) {
    if (key && value !== undefined) sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    Router.navigate(path);
  },

  consume(key) {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    sessionStorage.removeItem(key);
    return raw;
  },

  consumeJson(key) {
    const raw = this.consume(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch (_e) { return null; }
  },
};
