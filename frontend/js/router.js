/**
 * Belhandar Partner - Basit hash router.
 * Build araci gerektirmez; her route bir render(container) fonksiyonuna baglanir.
 */
const Router = (() => {
  const routes = [];
  let rootEl = null;

  function register(pattern, opts) {
    // pattern orn: '/admin/partners' ; opts: { render, requiresAuth, roles }
    routes.push({ pattern, ...opts });
  }

  function matchPath(pattern, path) {
    return pattern === path;
  }

  function currentPath() {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || '/login';
  }

  function navigate(path) {
    if (window.location.hash.replace(/^#/, '') === path) {
      resolve();
    } else {
      window.location.hash = path;
    }
  }

  async function resolve() {
    const path = currentPath();
    const match = routes.find((r) => matchPath(r.pattern, path));

    if (!match) {
      rootEl.innerHTML = `<div class="empty-state"><div class="em-icon">404</div><h3>Sayfa bulunamadi</h3></div>`;
      return;
    }

    if (match.requiresAuth) {
      if (!Auth.isAuthenticated()) {
        await Auth.loadCurrentUser();
      }
      if (!Auth.isAuthenticated()) {
        return navigate('/login');
      }
      const user = Auth.getUser();
      if (user.status === 'PENDING_APPROVAL' && path !== '/pending') {
        return navigate('/pending');
      }
      if (match.roles && !match.roles.includes(user.role)) {
        return navigate(user.role === 'PARTNER' ? '/partner/dashboard' : '/admin/dashboard');
      }
    }

    rootEl.innerHTML = '';
    await match.render(rootEl);
    Layout.highlightActiveNav(path);
  }

  function init(root) {
    rootEl = root;
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  return { register, navigate, init, resolve };
})();
