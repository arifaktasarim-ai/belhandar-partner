/**
 * Belhandar Partner - API istemcisi
 * - accessToken'i memory + localStorage'da tutar (refreshToken httpOnly cookie olarak backend'de saklanir)
 * - 401 aldiginda otomatik refresh dener, basarisiz olursa oturumu kapatir
 */
const Api = (() => {
  const BASE = window.BELHANDAR_CONFIG.API_BASE_URL;
  let accessToken = localStorage.getItem('bh_access_token') || null;

  function setAccessToken(token) {
    accessToken = token;
    if (token) localStorage.setItem('bh_access_token', token);
    else localStorage.removeItem('bh_access_token');
  }

  function getAccessToken() {
    return accessToken;
  }

  async function rawRequest(path, options = {}) {
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
    );
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include', // refresh token cookie'sini gonder/al
    });

    let body = null;
    try {
      body = await res.json();
    } catch (_e) {
      // govde bos olabilir
    }
    return { res, body };
  }

  async function tryRefresh() {
    const { res, body } = await rawRequest('/auth/refresh', { method: 'POST' });
    if (res.ok && body?.data?.accessToken) {
      setAccessToken(body.data.accessToken);
      return true;
    }
    return false;
  }

  async function request(path, options = {}) {
    let { res, body } = await rawRequest(path, options);

    if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
      const refreshed = await tryRefresh();
      if (refreshed) {
        ({ res, body } = await rawRequest(path, options));
      }
    }

    if (!res.ok) {
      const message = body?.message || 'Beklenmeyen bir hata olustu.';
      const error = new Error(message);
      error.details = body?.details;
      error.status = res.status;
      throw error;
    }

    return body;
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data || {}) }),
    patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data || {}) }),
    put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data || {}) }),
    del: (path) => request(path, { method: 'DELETE' }),
    setAccessToken,
    getAccessToken,
  };
})();
