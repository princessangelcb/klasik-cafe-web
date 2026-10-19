import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('barista-menu-status-list');
  if (!tbody) return;
  const { data: products, error } = await supabase.from('menu_items')
    .select('id, item_name, is_available, is_best_seller, sort_order').order('sort_order', { ascending: true, nullsFirst: false }).order('item_name');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="3">Menu status could not be loaded.</td></tr>';
    console.error('Could not load menu status for barista panel.', error);
    return;
  }
  const menuItems = products || [];

  const render = () => {
    if (!menuItems.length) { tbody.innerHTML = '<tr><td colspan="3">No menu items found.</td></tr>'; return; }
    tbody.innerHTML = menuItems.map((product) => `
      <tr data-product-id="${escapeHtml(product.id)}">
        <td><button type="button" class="menu-drag-handle" aria-label="Drag to reorder ${escapeHtml(product.item_name)}" title="Drag to reorder">&#8942;&#8942;</button>${escapeHtml(product.item_name)}</td>
        <td>${switchMarkup(product, 'is_available', 'toggle-availability', 'Available', 'Not Available')}</td>
        <td>${switchMarkup(product, 'is_best_seller', 'toggle-bestseller', 'Best Seller', 'Not Best Seller')}</td>
      </tr>`).join('');
  };
  function switchMarkup(product, field, className, onText, offText) {
    const checked = product[field] === true;
    return `<label class="availability-switch status-switch">
      <input type="checkbox" role="switch" class="${className}" data-id="${escapeHtml(product.id)}" ${checked ? 'checked' : ''} aria-label="${onText} status for ${escapeHtml(product.item_name)}">
      <span class="availability-switch-track" aria-hidden="true"></span>
      <span class="availability-label status-value ${checked ? 'is-on' : 'is-off'}">${checked ? onText : offText}</span>
    </label>`;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }
  render();
  let draggedRow = null;
  let pointerDidReorder = false;
  tbody.addEventListener('dragstart', event => {
    const handle = event.target.closest('.menu-drag-handle');
    const row = event.target.closest('tr[data-product-id]');
    if (!handle || !row) { event.preventDefault(); return; }
    draggedRow = row;
    pointerDidReorder = false;
    row.classList.add('menu-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.productId);
  });
  tbody.addEventListener('dragover', event => {
    const target = event.target.closest('tr[data-product-id]');
    if (!draggedRow || !target || target === draggedRow) return;
    event.preventDefault();
    tbody.querySelectorAll('.menu-drop-target').forEach(row => row.classList.remove('menu-drop-target'));
    target.classList.add('menu-drop-target');
    const box = target.getBoundingClientRect();
    tbody.insertBefore(draggedRow, event.clientY < box.top + box.height / 2 ? target : target.nextSibling);
  });
  tbody.addEventListener('drop', async event => {
    if (!draggedRow) return;
    event.preventDefault();
    const orderedIds = [...tbody.querySelectorAll('tr[data-product-id]')].map(row => row.dataset.productId);
    const originalOrder = [...menuItems];
    const byId = new Map(menuItems.map(product => [String(product.id), product]));
    menuItems.splice(0, menuItems.length, ...orderedIds.map(id => byId.get(String(id))).filter(Boolean));
    draggedRow.classList.remove('menu-dragging');
    tbody.querySelectorAll('.menu-drop-target').forEach(row => row.classList.remove('menu-drop-target'));
    draggedRow = null;
    const results = await Promise.all(menuItems.map((product, index) => supabase.from('menu_items').update({ sort_order: index }).eq('id', product.id)));
    const failed = results.find(result => result.error);
    if (failed) {
      menuItems.splice(0, menuItems.length, ...originalOrder);
      console.error('Could not save barista menu order.', failed.error);
      window.klasikNotify?.('Could not save the new product order. Please try again.', 'error');
    } else {
      menuItems.forEach((product, index) => { product.sort_order = index; });
      window.klasikNotify?.('Product order saved.');
    }
    render();
  });
  tbody.addEventListener('dragend', () => {
    draggedRow?.classList.remove('menu-dragging');
    tbody.querySelectorAll('.menu-drop-target').forEach(row => row.classList.remove('menu-drop-target'));
    draggedRow = null;
  });
  tbody.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.menu-drag-handle');
    const row = handle?.closest('tr[data-product-id]');
    if (!row) return;
    event.preventDefault();
    draggedRow = row;
    pointerDidReorder = false;
    row.classList.add('menu-dragging');
    handle.setPointerCapture(event.pointerId);
  });
  tbody.addEventListener('pointermove', event => {
    if (!draggedRow) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('tr[data-product-id]');
    if (!target || target === draggedRow || !tbody.contains(target)) return;
    pointerDidReorder = true;
    tbody.querySelectorAll('.menu-drop-target').forEach(row => row.classList.remove('menu-drop-target'));
    target.classList.add('menu-drop-target');
    const box = target.getBoundingClientRect();
    tbody.insertBefore(draggedRow, event.clientY < box.top + box.height / 2 ? target : target.nextSibling);
  });
  tbody.addEventListener('pointerup', event => {
    if (!draggedRow) return;
    if (pointerDidReorder) tbody.dispatchEvent(new Event('drop', { cancelable: true }));
    else { draggedRow.classList.remove('menu-dragging'); draggedRow = null; }
  });
  tbody.addEventListener('pointercancel', () => {
    draggedRow?.classList.remove('menu-dragging');
    tbody.querySelectorAll('.menu-drop-target').forEach(row => row.classList.remove('menu-drop-target'));
    draggedRow = null;
    render();
  });
  tbody.addEventListener('change', async (event) => {
    const input = event.target.closest('.toggle-availability, .toggle-bestseller');
    if (!input) return;
    const field = input.classList.contains('toggle-availability') ? 'is_available' : 'is_best_seller';
    const product = menuItems.find((item) => String(item.id) === input.dataset.id);
    if (!product) return;
    const previous = product[field] === true;
    const next = input.checked;
    input.disabled = true;
    const { error: updateError } = await supabase.from('menu_items').update({ [field]: next }).eq('id', product.id);
    if (updateError) {
      input.checked = previous;
      console.error(`Could not update ${field}.`, updateError);
      window.klasikNotify?.('Could not save this menu status. Please try again.', 'error');
    } else {
      product[field] = next;
      window.klasikNotify?.(`${product.item_name}: ${field === 'is_available' ? (next ? 'Available' : 'Not Available') : (next ? 'Best Seller' : 'Not Best Seller')}.`);
    }
    render();
  });
  if (supabase.channel) {
    supabase.channel('barista-menu-status-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, payload => {
        const changed = payload.new || payload.old;
        if (!changed?.id) return;
        const index = menuItems.findIndex(item => String(item.id) === String(changed.id));
        if (payload.eventType === 'DELETE') { if (index >= 0) menuItems.splice(index, 1); }
        else if (index >= 0) Object.assign(menuItems[index], changed);
        else menuItems.push(changed);
        render();
      })
      .subscribe(status => { if (status === 'CHANNEL_ERROR') console.warn('Barista menu realtime is unavailable; refresh to see availability changes.'); });
  }
});
