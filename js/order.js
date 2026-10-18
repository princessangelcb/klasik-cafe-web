import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const itemsContainer = document.getElementById('customer-order-items');
    const totalElement = document.getElementById('customer-order-total');
    const cartBadge = document.getElementById('cart-count-badge');
    const placeOrderButton = document.getElementById('customer-place-order');
    const specialRequestInput = document.getElementById('customer-special-request');
    if (!itemsContainer) return;

    const money = (amount) => `\u20B1${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const itemKey = (item, index) => item.id == null ? `row-${index}` : String(item.id);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) console.error('Could not verify the customer session.', userError);
    if (!user) {
        itemsContainer.replaceChildren();
        window.klasikShowAuthWarning?.('Please log in or sign up to view your cart.');
        return;
    }

    const { data: cartItems, error } = await supabase.from('cart').select('*').eq('user_id', user.id);
    if (error) {
        console.error('Could not load the customer cart.', error);
        itemsContainer.innerHTML = '<p class="customer-empty-state">Your cart could not be loaded. Please try again.</p>';
        if (placeOrderButton) placeOrderButton.disabled = true;
        return;
    }
    const items = cartItems || [];
    const selectedKeys = new Set(items.map(itemKey));

    if (!items.length) {
        itemsContainer.innerHTML = '<p class="customer-empty-state">Your cart is currently empty. Browse the <a href="menu.html">menu</a> to add a drink.</p>';
        if (totalElement) totalElement.textContent = money(0);
        if (placeOrderButton) placeOrderButton.disabled = true;
        return;
    }

    const productNames = [...new Set(items.map((item) => item.item_name).filter(Boolean))];
    const { data: products, error: productError } = await supabase.from('menu_items')
        .select('item_name, image_url').in('item_name', productNames);
    if (productError) console.error('Could not load cart product images.', productError);
    const imageByName = new Map((products || []).map((product) => [String(product.item_name || '').trim().toLowerCase(), product.image_url]));

    const selectedTotal = () => items.reduce((sum, item, index) => (
        selectedKeys.has(itemKey(item, index)) ? sum + Number(item.price || 0) * Number(item.quantity || 1) : sum
    ), 0);
    const refreshTotal = () => {
        if (totalElement) totalElement.textContent = money(selectedTotal());
        if (cartBadge) cartBadge.textContent = String(items.reduce((sum, item) => sum + Math.max(1, Number.parseInt(item.quantity, 10) || 1), 0));
        if (placeOrderButton) {
            placeOrderButton.disabled = !items.some((item, index) => selectedKeys.has(itemKey(item, index)));
            placeOrderButton.textContent = selectedKeys.size ? 'Place Selected Order' : 'Select items to order';
        }
    };

    const renderItems = () => {
        itemsContainer.innerHTML = items.map((item, index) => {
            const key = itemKey(item, index);
            const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
            const unitPrice = Number(item.price || 0);
            const imageUrl = imageByName.get(String(item.item_name || '').trim().toLowerCase());
            const image = imageUrl
                ? `<img class="customer-cart-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.item_name)}" loading="lazy">`
                : '<div class="customer-cart-image customer-cart-image-empty" aria-hidden="true">☕</div>';
            const customization = item.customizations
                ? `<p class="customer-cart-customizations">${escapeHtml(item.customizations)}</p>`
                : '<p class="customer-cart-customizations">Standard recipe</p>';
            return `<article class="customer-order-item customer-cart-item">
                <label class="customer-cart-select"><input type="checkbox" data-cart-select="${index}" ${selectedKeys.has(key) ? 'checked' : ''}><span>Include</span></label>
                ${image}
                <div class="customer-cart-info">
                    <div class="customer-order-main"><strong>${escapeHtml(item.item_name)}</strong><span>${money(unitPrice)} each</span></div>
                    ${customization}
                    <div class="customer-cart-controls">
                        <div class="customer-inline-qty" aria-label="Change quantity for ${escapeHtml(item.item_name)}">
                            <button type="button" data-cart-qty="decrease" data-cart-index="${index}" aria-label="Decrease quantity">−</button>
                            <span>${quantity}</span>
                            <button type="button" data-cart-qty="increase" data-cart-index="${index}" aria-label="Increase quantity">+</button>
                        </div>
                        <strong class="customer-cart-line-total">${money(unitPrice * quantity)}</strong>
                    </div>
                </div>
            </article>`;
        }).join('');
        refreshTotal();
    };
    renderItems();

    itemsContainer.addEventListener('change', (event) => {
        const checkbox = event.target.closest('[data-cart-select]');
        if (!checkbox) return;
        const item = items[Number(checkbox.dataset.cartSelect)];
        if (!item) return;
        const key = itemKey(item, Number(checkbox.dataset.cartSelect));
        if (checkbox.checked) selectedKeys.add(key);
        else selectedKeys.delete(key);
        refreshTotal();
    });

    itemsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-cart-qty]');
        if (!button) return;
        const index = Number(button.dataset.cartIndex);
        const item = items[index];
        if (!item || item.id == null) {
            window.klasikNotify?.('This cart item cannot be updated because it has no row ID.', 'error');
            return;
        }
        const oldQuantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
        const nextQuantity = Math.max(1, oldQuantity + (button.dataset.cartQty === 'increase' ? 1 : -1));
        if (nextQuantity === oldQuantity) return;
        button.disabled = true;
        const { error: updateError } = await supabase.from('cart').update({ quantity: nextQuantity })
            .eq('id', item.id).eq('user_id', user.id);
        button.disabled = false;
        if (updateError) {
            console.error('Could not update cart quantity.', updateError);
            window.klasikNotify?.('Could not update quantity. Please try again.', 'error');
            return;
        }
        item.quantity = nextQuantity;
        renderItems();
    });

    placeOrderButton?.addEventListener('click', async () => {
        const selectedItems = items.filter((item, index) => selectedKeys.has(itemKey(item, index)));
        if (!selectedItems.length) {
            window.klasikNotify?.('Select at least one item to place your order.', 'error');
            return;
        }
        if (selectedItems.some((item) => item.id == null)) {
            window.klasikNotify?.('Cart rows need an id column so selected items can be safely updated and removed. No order was placed.', 'error');
            return;
        }
        const selectedNames = [...new Set(selectedItems.map((item) => item.item_name).filter(Boolean))];
        const { data: currentProducts, error: availabilityError } = await supabase.from('menu_items')
            .select('item_name, is_available').in('item_name', selectedNames);
        const currentByName = new Map((currentProducts || []).map((product) => [product.item_name, product]));
        const unavailableItems = selectedNames.filter((name) => currentByName.get(name)?.is_available !== true);
        if (availabilityError || unavailableItems.length) {
            console.error('Could not validate cart items before checkout.', availabilityError || unavailableItems);
            window.klasikNotify?.(availabilityError ? 'We could not confirm product availability. Please try again.'
                : `Please remove unavailable items before ordering: ${unavailableItems.join(', ')}`, 'error');
            return;
        }

        const grandTotal = selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
        const orderString = selectedItems.map((item) => (
            `${item.quantity}x ${item.item_name}${item.customizations ? ` (${item.customizations})` : ''}`
        )).join(', ');
        placeOrderButton.disabled = true;
        placeOrderButton.textContent = 'Processing Order...';
        let customerName = user.user_metadata?.full_name
            || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ')
            || user.user_metadata?.name;
        if (!customerName && user.email) {
            const { data: profile, error: profileError } = await supabase.from('profiles')
                .select('full_name').eq('email', user.email).maybeSingle();
            if (profileError) console.warn('Could not load customer name for order receipt.', profileError);
            customerName = profile?.full_name;
        }
        const orderItems = selectedItems.map((item) => ({
            item_name: item.item_name,
            image_url: imageByName.get(String(item.item_name || '').trim().toLowerCase()) || null,
            quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
            unit_price: Number(item.price || 0),
            customizations: item.customizations || ''
        }));
        const { data: placedOrder, error: insertError } = await supabase.from('placed_orders').insert([{
            user_id: user.id,
            user_email: user.email,
            customer_name: customerName?.trim() || 'Customer',
            items: orderItems,
            order_details: orderString,
            total_price: grandTotal,
            special_request: specialRequestInput?.value || '',
            status: 'Pending'
        }]).select('id, order_code').single();
        if (insertError) {
            console.error('Could not place selected cart items.', insertError);
            window.klasikNotify?.(`Error placing order: ${insertError.message}`, 'error');
            refreshTotal();
            return;
        }

        const selectedRowIds = selectedItems.map((item) => item.id);
        const { error: deleteError } = await supabase.from('cart').delete()
            .in('id', selectedRowIds).eq('user_id', user.id);
        if (deleteError) console.error('Order placed, but selected cart items could not be cleared.', deleteError);
        if (deleteError) console.error('Order placed, but selected cart items could not be cleared.', deleteError);
        if (!placedOrder?.order_code) {
            window.klasikNotify?.('Your order was saved, but its receipt code was not returned. Please check Placed Orders.', 'error');
            window.location.href = 'placed-orders.html';
            return;
        }
        window.location.href = `receipt.html?id=${encodeURIComponent(placedOrder.id)}`;
    });
});
