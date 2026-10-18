import { supabase } from './supabase.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);

document.addEventListener('DOMContentLoaded', async () => {
    const menuContainer = document.getElementById('menu-content');
    if (!menuContainer) return;

    // Keep unavailable products visible so their status is clear to customers.
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true });

    if (error) {
        menuContainer.innerHTML = '<p class="page-width">Error loading menu. Please try again later.</p>';
        return;
    }
    let menuItems = data || [];
    const renderMenu = () => {
    if (!menuItems.length) {
        menuContainer.innerHTML = '<p class="page-width" style="padding: 40px 0; text-align: center;">Our menu is currently updating. Check back soon!</p>';
        window.dispatchEvent(new Event('klasik-menu-ready'));
        return;
    }
    const categories = {};
    menuItems.forEach((item) => {
        const category = item.category || 'Other';
        (categories[category] ||= []).push(item);
    });

    menuContainer.replaceChildren();
    for (const [category, items] of Object.entries(categories)) {
        const section = document.createElement('section');
        section.className = 'page-width menu-section';
        section.style.marginBottom = '50px';
        section.style.paddingTop = '20px';
        const title = category.charAt(0).toUpperCase() + category.slice(1);
        const cards = items.map((item) => {
            const available = item.is_available !== false;
            const name = escapeHtml(item.item_name);
            const price = escapeHtml(item.price);
            return `<article class="product-card" data-available="${available}" data-best-seller="${item.is_best_seller === true}">
                <div class="product-image image-frame">
                    <img src="${escapeHtml(item.image_url || 'images/products/coffee/amerikano.jpg')}" alt="${name}" loading="lazy">
                    <span class="product-category">${escapeHtml((item.subcategory || category).toUpperCase())}</span>
                    ${item.is_best_seller ? '<span class="best-seller-label">BEST SELLER</span>' : ''}
                </div>
                <div class="product-info">
                    <div class="product-title"><h3>${name}</h3><span>₱${price}</span></div>
                    <p>${escapeHtml(item.description || '')}</p>
                    ${available ? '' : '<p class="product-availability unavailable">Not Available</p>'}
                    <button class="button button-primary button-wide open-modal-btn customer-product-button" type="button" data-name="${name}" data-price="${price}" data-available="${available}" ${available ? '' : 'disabled aria-disabled="true"'} style="margin-top: 15px;">${available ? 'Customize' : 'Unavailable'}</button>
                </div>
            </article>`;
        }).join('');
        section.innerHTML = `<div class="section-heading" style="margin-bottom: 25px;"><h2 style="color:#1e3382;font-family:'Playfair Display',serif;">${escapeHtml(title)}</h2></div><div class="product-grid">${cards}</div>`;
        menuContainer.append(section);
    }

    window.dispatchEvent(new Event('klasik-menu-ready'));
    };
    renderMenu();
    if (supabase.channel) {
        supabase.channel('customer-menu-availability')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, payload => {
                const changed = payload.new || payload.old;
                if (!changed?.id) return;
                if (payload.eventType === 'DELETE') menuItems = menuItems.filter(item => String(item.id) !== String(changed.id));
                else {
                    const index = menuItems.findIndex(item => String(item.id) === String(changed.id));
                    if (index >= 0) menuItems[index] = { ...menuItems[index], ...changed };
                    else menuItems.push(changed);
                }
                renderMenu();
            })
            .subscribe(status => {
                if (status === 'CHANNEL_ERROR') console.warn('Live menu updates are unavailable; refresh to see availability changes.');
            });
    }
});
