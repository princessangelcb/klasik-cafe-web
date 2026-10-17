import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const addToOrderBtn = document.getElementById('customer-add-to-order');

    if (addToOrderBtn) {
        addToOrderBtn.addEventListener('click', async () => {
            // 1. Check if the customer is logged in
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert("Please log in to add items to your cart!");
                window.location.href = "login.html";
                return;
            }

            // 2. Grab the item details directly from your modal's HTML
            const itemName = document.getElementById('customer-customize-title').textContent;
            const quantityText = document.getElementById('customer-modal-qty').textContent;
            const priceText = document.getElementById('customer-modal-total').textContent;

            // Convert text to actual numbers (removes the ₱ sign)
            const quantity = parseInt(quantityText);
            const price = parseFloat(priceText.replace('₱', '').replace(',', '').trim());

            // 3. Save it to your new Supabase cart table
            const { data, error } = await supabase.from('cart').insert([
                {
                    item_name: itemName,
                    price: price,
                    quantity: quantity,
                    user_email: user.email
                }
            ]);

            if (error) {
                alert("Error adding to cart: " + error.message);
            } else {
                alert(`${quantity}x ${itemName} added to your cart!`);
                // Close the modal and refresh the page to update the menu
                document.getElementById('customer-customization-modal').hidden = true;
                window.location.reload();
            }
        });
    }
});