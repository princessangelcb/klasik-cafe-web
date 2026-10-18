import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const addToOrderBtn = document.getElementById('customer-add-to-order');

    if (addToOrderBtn) {
        addToOrderBtn.addEventListener('click', async () => {
            // 1. Check if the customer is logged in
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                window.klasikShowAuthWarning?.("Please log in or sign up to add items to your cart.");
                return;
            }

            // 2. Grab the item details directly from your modal's HTML
            const itemName = document.getElementById('customer-customize-title')?.textContent.trim() || '';
            if (!itemName) {
                console.error('Cannot add item to cart: the customization dialog has no product name.');
                window.klasikNotify?.('Could not identify this menu item. Please close and try again.', 'error');
                return;
            }
            let matches;
            let availabilityError;
            try {
                ({ data: matches, error: availabilityError } = await supabase
                    .from('menu_items')
                    .select('item_name, is_available')
                    .ilike('item_name', itemName)
                    .limit(2));
            } catch (error) {
                console.error('Availability check failed while adding to cart:', error);
                window.klasikNotify?.('Availability could not be confirmed. Please try again.', 'error');
                return;
            }
            const product = Array.isArray(matches) && matches.length === 1 ? matches[0] : null;
            if (availabilityError || !product || product.is_available !== true) {
                if (availabilityError) console.error('Supabase cart availability query failed:', availabilityError);
                else if (!product) console.warn('Could not find exactly one available menu item for:', itemName, matches);
                window.klasikNotify?.(product?.is_available === false
                    ? 'This product is not available right now.'
                    : 'Availability could not be confirmed. Please try again.', 'error');
                return;
            }
            const quantityText = document.getElementById('customer-modal-qty').textContent;
            const priceText = document.getElementById('customer-modal-total').textContent;

            // Convert text to actual numbers (removes the ₱ sign)
            // The modal displays the line total, while the cart stores a unit price.
            const quantity = Number.parseInt(quantityText, 10);
            const lineTotal = Number.parseFloat(priceText.replace(/[^\d.]/g, ''));
            const price = quantity > 0 ? lineTotal / quantity : NaN;
            if (!Number.isFinite(price) || price < 0) {
                console.error('Invalid cart price calculation:', { itemName, quantity, priceText, lineTotal });
                window.klasikNotify?.('The item total could not be calculated. Please try again.', 'error');
                return;
            }
            const addonNames = Array.from(document.querySelectorAll("input[name='custom-addon']:checked"), (input) => input.value);
            const customizationDetails = [
                `Size: ${document.querySelector("input[name='custom-size']:checked")?.value || 'Medium'}`,
                `Milk: ${document.querySelector("input[name='custom-milk']:checked")?.value || 'Regular'}`,
                `Sweetness: ${document.querySelector("input[name='custom-sweetness']:checked")?.value || '0%'}`,
                `Ice: ${document.querySelector("input[name='custom-ice']:checked")?.value || 'Less Ice'}`,
                addonNames.length ? `Add-ons: ${addonNames.join(', ')}` : ''
            ].filter(Boolean).join(' · ');

            // 3. Save it to your new Supabase cart table
            const { data, error } = await supabase.from('cart').insert([
                {
                    item_name: itemName,
                    price: price,
                    quantity: quantity,
                    customizations: customizationDetails,
                    user_id: user.id,
                    user_email: user.email
                }
            ]);

            if (error) {
                window.klasikNotify?.("Error adding to cart: " + error.message, "error");
            } else {
                window.klasikNotify?.(`${quantity}x ${itemName} added to your cart!`);
                document.getElementById('customer-customization-modal').hidden = true;
                const badge = document.getElementById('cart-count-badge');
                if (badge) badge.textContent = String((Number(badge.textContent) || 0) + quantity);
            }
        });
    }
});
