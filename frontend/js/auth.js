/**
 * Belhandar Partner - Auth state
 */
const Auth = (() => {
  let currentUser = null;

  async function loadCurrentUser() {
    if (!Api.getAccessToken()) {
      currentUser = null;
      return null;
    }
    try {
      const { data } = await Api.get('/auth/me');
      currentUser = data;
      return currentUser;
    } catch (_e) {
      currentUser = null;
      Api.setAccessToken(null);
      return null;
    }
  }

  function getUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return !!currentUser;
  }

  function isAdmin() {
    return currentUser && ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  }

  function isPartner() {
    return currentUser && currentUser.role === 'PARTNER';
  }

  async function login(identifier, password) {
    const { data } = await Api.post('/auth/login', { identifier, password });
    Api.setAccessToken(data.accessToken);
    currentUser = data.user;
    return currentUser;
  }

  async function register(payload) {
    return Api.post('/auth/register', payload);
  }

  async function logout() {
    try {
      await Api.post('/auth/logout');
    } catch (_e) {
      // yoksay
    }
    Api.setAccessToken(null);
    currentUser = null;
  }

  return { loadCurrentUser, getUser, isAuthenticated, isAdmin, isPartner, login, register, logout };
})();
