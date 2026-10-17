import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const orderItemsContainer = document.getElementById('customer-order-items');
    const orderTotalElement = document.getElementById('customer-order-total');
    const placeOrderBtn = document.getElementById('customer-place-order');
    const specialRequestInput = document.getElementById('customer-special-request');

    // 1. Get the logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        orderItemsContainer.innerHTML = '<p>Please log in to view your cart.</p>';
        return;
    }

    // 2. Fetch the cart items for this specific user
    const { data: cartItems, error } = await supabase
        .from('cart')
        .select('*')
        .eq('user_email', user.email);

    if (error) {
        orderItemsContainer.innerHTML = '<p>Error loading cart. Please try again.</p>';
        return;
    }

    // 3. Draw the items on the screen
    orderItemsContainer.innerHTML = ''; 
    let grandTotal = 0;

    if (cartItems.length === 0) {
        orderItemsContainer.innerHTML = '<p style="padding: 20px 0; color: #666;">Your cart is currently empty.</p>';
        return;
    }

    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        const itemRow = document.createElement('div');
        itemRow.style.display = 'flex';
        itemRow.style.justifyContent = 'space-between';
        itemRow.style.padding = '15px 0';
        itemRow.style.borderBottom = '1px solid #eee';

        itemRow.innerHTML = `
            <div>
                <strong style="color: #1e3382; font-size: 1.1rem;">${item.item_name}</strong>
                <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">Quantity: ${item.quantity}</div>
            </div>
            <div style="font-weight: bold; font-size: 1.1rem;">₱${itemTotal}</div>
        `;
        orderItemsContainer.appendChild(itemRow);
    });

    orderTotalElement.textContent = `₱${grandTotal}`;
    placeOrderBtn.disabled = false; 

    // 4. THE CHECKOUT PROCESS
    placeOrderBtn.addEventListener('click', async () => {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Processing Order...";

        // Format the items into a simple readable list (e.g., "2x Amerikano, 1x Fries")
        const orderString = cartItems.map(item => `${item.quantity}x ${item.item_name}`).join(', ');
        const requestText = specialRequestInput ? specialRequestInput.value : '';

        // Save to placed_orders table
        const { error: insertError } = await supabase.from('placed_orders').insert([
            {
                user_email: user.email,
                order_details: orderString,
                total_price: grandTotal,
                special_request: requestText,
                status: 'Pending'
            }
        ]);

        if (insertError) {
            alert("Error placing order: " + insertError.message);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Continue to Confirmation";
            return;
        }

        // Empty their cart
        await supabase.from('cart').delete().eq('user_email', user.email);

        // Success! Redirect them to their placed orders page
        alert("Success! Your order has been placed.");
        window.location.href = "placed-orders.html";
    });
});