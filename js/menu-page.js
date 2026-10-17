import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const menuContainer = document.getElementById('menu-content');
    
    // Fetch available menu items from Supabase
    const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);

    if (error) {
        menuContainer.innerHTML = '<p class="page-width">Error loading menu. Please try again later.</p>';
        return;
    }

    if (!menuItems || menuItems.length === 0) {
        menuContainer.innerHTML = '<p class="page-width" style="padding: 40px 0; text-align: center;">Our menu is currently updating. Check back soon!</p>';
        return;
    }

    // Group items by category
    const categories = {};
    menuItems.forEach(item => {
        const cat = item.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
    });

    menuContainer.innerHTML = '';
    
    for (const [category, items] of Object.entries(categories)) {
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
        
        const section = document.createElement('section');
        section.className = 'page-width menu-section';
        section.style.marginBottom = '50px';
        section.style.paddingTop = '20px';
        
        let gridHTML = `
            <div class="section-heading" style="margin-bottom: 25px;">
                <h2 style="color: #1e3382; font-family: 'Playfair Display', serif;">${categoryTitle}</h2>
            </div>
            <div class="product-grid">
        `;
        
        items.forEach(item => {
            const imgSrc = item.image_url || 'images/products/coffee/amerikano.jpg';
            const subCategoryText = (item.subcategory || category).toUpperCase();
            
            gridHTML += `
                <article class="product-card">
                    <div class="product-image image-frame">
                        <img src="${imgSrc}" alt="${item.item_name}" loading="lazy">
                        <span class="product-category">${subCategoryText}</span>
                        ${item.is_best_seller ? '<span class="best-seller-badge" style="position: absolute; bottom: 10px; right: 10px; background: #94a3b8; color: white; padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border-radius: 4px;">BEST SELLER</span>' : ''}
                    </div>
                    <div class="product-info">
                        <div class="product-title">
                            <h3>${item.item_name}</h3>
                            <span>₱${item.price}</span>
                        </div>
                        <p>${item.description || ''}</p>
                        <button class="button button-primary button-wide open-modal-btn" 
                            data-name="${item.item_name}" 
                            data-price="${item.price}"
                            style="margin-top: 15px;">
                            Customize
                        </button>
                    </div>
                </article>
            `;
        });
        
        gridHTML += `</div>`;
        section.innerHTML = gridHTML;
        menuContainer.appendChild(section);
    }

    // Connect the "Customize" buttons to your popup modal
    const modal = document.getElementById('customer-customization-modal');
    const modalTitle = document.getElementById('customer-customize-title');
    const modalTotal = document.getElementById('customer-modal-total');
    const closeBtn = document.querySelector('.customer-modal-close');
    
    document.querySelectorAll('.open-modal-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');
            
            if (modalTitle) modalTitle.textContent = name;
            if (modalTotal) modalTotal.textContent = `₱${price}`;
            if (modal) modal.hidden = false;
        });
    });

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.hidden = true;
        });
    }
});