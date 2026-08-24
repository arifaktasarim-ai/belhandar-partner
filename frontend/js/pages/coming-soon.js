const ComingSoonPage = {
  render(title, stageNote) {
    return async (container) => {
      const slot = Layout.renderShell(container, { title });
      slot.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="em-icon">🧭</div>
            <h3>${title} — yakinda</h3>
            <p>${stageNote || 'Bu ekran, gelistirme yol haritasindaki sonraki asamada eklenecek.'}</p>
          </div>
        </div>
      `;
    };
  },
};
