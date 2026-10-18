document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dashboard-menu-toggle').forEach(button => {
    const sidebar = button.closest('.admin-sidebar, .barista-sidebar');
    if (!sidebar) return;

    button.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('is-menu-open');
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute('aria-label', isOpen ? 'Close dashboard menu' : 'Open dashboard menu');
      button.querySelector('span').textContent = isOpen ? '×' : '☰';
    });

    sidebar.querySelectorAll('.sidebar-nav a, .sidebar-logout').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('is-menu-open');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Open dashboard menu');
        button.querySelector('span').textContent = '☰';
      });
    });
  });
});
