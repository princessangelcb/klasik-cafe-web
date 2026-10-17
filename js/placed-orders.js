import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const placedOrdersContainer = document.getElementById('customer-placed-orders');

    // 1. Get the logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        placedOrdersContainer.innerHTML = '<p>Please log in to view your placed orders.</p>';
        return;
    }

    // 2. Fetch the orders for this specific user, newest first
    const { data: orders, error } = await supabase
        .from('placed_orders')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false });

    if (error) {
        placedOrdersContainer.innerHTML = '<p>Error loading orders. Please try again.</p>';
        return;
    }

    // 3. Draw the orders on the screen
    placedOrdersContainer.innerHTML = ''; 

    if (orders.length === 0) {
        placedOrdersContainer.innerHTML = '<p style="padding: 20px 0; color: #666;">You have no placed orders currently.</p>';
        return;
    }

    orders.forEach(order => {
        // Format the date nicely
        const orderDate = new Date(order.created_at).toLocaleString();

        // Create a visual card for each receipt
        const orderCard = document.createElement('div');
        orderCard.style.border = '1px solid #eee';
        orderCard.style.borderRadius = '8px';
        orderCard.style.padding = '20px';
        orderCard.style.marginBottom = '15px';
        orderCard.style.backgroundColor = '#fff';

        orderCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                <strong style="color: #1e3382;">Date: ${orderDate}</strong>
                <span style="background-color: #ffe0b2; color: #e65100; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${order.status}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="font-weight: 600; margin-bottom: 5px;">Items:</div>
                <div style="color: #555;">${order.order_details}</div>
            </div>
            ${order.special_request ? `<div style="margin-bottom: 10px; font-size: 0.9rem; color: #666;"><em>Note: ${order.special_request}</em></div>` : ''}
            <div style="display: flex; justify-content: flex-end; font-size: 1.1rem;">
                <strong>Total: ₱${order.total_price}</strong>
            </div>
        `;
        placedOrdersContainer.appendChild(orderCard);
    });
});