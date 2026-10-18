import { supabase } from './supabase.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('featured-best-sellers');
  if (!container) return;
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_best_seller', true);

  if (error) {
    container.innerHTML = '<p class="customer-empty-state">Featured items are temporarily unavailable.</p>';
    console.error('Could not load Best Seller products.', error);
    return;
  }
  let products = data || [];
  const render = () => {
  const featured = products.filter(item => item.is_best_seller === true);
  if (!featured.length) {
    container.innerHTML = '<p class="customer-empty-state">No featured favorites right now. Browse the full menu to find yours.</p>';
    return;
  }
  container.innerHTML = featured.map((item) => {
    const available = item.is_available !== false;
    const name = escapeHtml(item.item_name);
    const price = escapeHtml(item.price);
    return `<article class="product-card" data-available="${available}" data-best-seller="true">
      <div class="product-image image-frame">
        <img src="${escapeHtml(item.image_url || 'images/products/coffee/amerikano.jpg')}" alt="${name}" loading="lazy">
        <span class="product-category">${escapeHtml((item.subcategory || item.category || '').toUpperCase())}</span>
        <span class="best-seller-label">BEST SELLER</span>
      </div>
      <div class="product-info">
        <div class="product-title"><h3>${name}</h3><span>₱${price}</span></div>
        <p>${escapeHtml(item.description || '')}</p>
        ${available ? '' : '<p class="product-availability unavailable">Not Available</p>'}
        <button class="button button-primary button-wide customer-product-button" type="button" data-name="${name}" data-price="${price}" data-available="${available}" ${available ? '' : 'disabled aria-disabled="true"'}>${available ? 'Customize' : 'Unavailable'}</button>
      </div>
    </article>`;
  }).join('');
  window.dispatchEvent(new Event('klasik-menu-ready'));
  };
  render();
  if (supabase.channel) {
    supabase.channel('homepage-menu-availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, payload => {
        const changed = payload.new || payload.old;
        if (!changed?.id) return;
        if (payload.eventType === 'DELETE') products = products.filter(item => String(item.id) !== String(changed.id));
        else {
          const index = products.findIndex(item => String(item.id) === String(changed.id));
          if (index >= 0) products[index] = { ...products[index], ...changed };
          else products.push(changed);
        }
        render();
      })
      .subscribe(status => { if (status === 'CHANNEL_ERROR') console.warn('Homepage menu realtime is unavailable; refresh to see status changes.'); });
  }
});
