import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('customer-placed-orders');
    if (!container) return;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) console.error('Could not verify customer session for placed orders.', authError);
    if (!user) {
        container.replaceChildren();
        window.klasikShowAuthWarning?.('Please log in or sign up to view your placed orders.');
        return;
    }

    const { data: orders, error } = await supabase.from('placed_orders')
        .select('id, order_code, created_at, status, order_details, total_price, special_request')
        .eq('user_id', user.id)
        .in('status', ['Pending', 'Preparing', 'Ready for Pickup'])
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Could not load placed orders.', error);
        container.innerHTML = '<p class="customer-empty-state">Placed orders could not be loaded. Please try again.</p>';
        return;
    }
    if (!orders?.length) {
        container.innerHTML = '<p class="customer-empty-state">You have no orders awaiting preparation. Completed orders appear in <a href="order-history.html">Order History</a>.</p>';
        return;
    }

    container.replaceChildren(...orders.map((order) => {
        const card = document.createElement('article');
        card.className = 'customer-order-history-card';
        const header = document.createElement('div');
        header.className = 'customer-order-history-head';
        const date = document.createElement('strong');
        date.textContent = order.order_code ? `Order #${order.order_code} · ${order.created_at ? new Date(order.created_at).toLocaleString() : ''}` : order.created_at ? new Date(order.created_at).toLocaleString() : 'Order date unavailable';
        const status = document.createElement('span');
        status.className = `customer-order-status status-${String(order.status || '').toLowerCase()}`;
        status.textContent = order.status || 'Pending';
        header.append(date, status);
        const detailsLabel = document.createElement('span');
        detailsLabel.className = 'customer-order-history-label';
        detailsLabel.textContent = 'Items';
        const details = document.createElement('p');
        details.className = 'customer-order-history-details';
        details.textContent = order.order_details || 'Order details unavailable';
        card.append(header, detailsLabel, details);
        if (order.special_request) {
            const note = document.createElement('p');
            note.className = 'customer-order-history-note';
            note.textContent = `Special request: ${order.special_request}`;
            card.append(note);
        }
        const total = document.createElement('strong');
        total.className = 'customer-order-history-total';
        total.textContent = `Total: \u20B1${Number(order.total_price || 0).toFixed(2)}`;
        card.append(total);
        return card;
    }));
});
