import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const status = document.getElementById('receipt-status');
    const receipt = document.getElementById('digital-receipt');
    if (!status || !receipt) return;
    const id = new URLSearchParams(window.location.search).get('id');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !id) {
        status.textContent = 'This receipt is unavailable. Sign in and open it from your recent order.';
        return;
    }
    const { data: order, error } = await supabase.from('placed_orders')
        .select('id, order_code, created_at, customer_name, items, order_details, total_price, special_request')
        .eq('id', id).eq('user_id', user.id).maybeSingle();
    if (error || !order) {
        console.error('Could not load the saved receipt.', error);
        status.textContent = 'Your order was placed, but the receipt could not be loaded. Please open Placed Orders.';
        return;
    }
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const items = Array.isArray(order.items) ? order.items : [];
    const content = items.length
        ? items.map((item) => `<li><span>${esc(item.quantity)} × ${esc(item.item_name)}${item.customizations ? `<small>${esc(item.customizations)}</small>` : ''}</span><strong>₱${(Number(item.unit_price || 0) * Number(item.quantity || 1)).toFixed(2)}</strong></li>`).join('')
        : `<li><span>${esc(order.order_details || 'Order items')}</span></li>`;
    receipt.innerHTML = `<div class="receipt-brand"><img class="receipt-logo" src="klasik_cafe_logovid_trans.gif" alt="KLASIK CAFE"></div>
      <p class="receipt-instruction"><strong>Please take a screenshot of this receipt and present it to the store.</strong></p>
      <p class="receipt-kicker">DIGITAL ORDER RECEIPT</p>
      <div class="receipt-code-label">ORDER CODE</div><div class="receipt-code">${esc(order.order_code || 'PENDING')}</div>
      <div class="receipt-meta"><span>${esc(order.customer_name || 'Customer')}</span><span>${order.created_at ? esc(new Date(order.created_at).toLocaleString()) : ''}</span></div>
      <ul class="receipt-items">${content}</ul>${order.special_request ? `<p class="receipt-note"><strong>Note:</strong> ${esc(order.special_request)}</p>` : ''}
      <div class="receipt-total"><span>TOTAL</span><strong>₱${Number(order.total_price || 0).toFixed(2)}</strong></div>
      <p class="receipt-disclaimer">This receipt needs to be presented first to the store to order and to pay before preparation will begin.</p>
      <a class="button button-primary button-wide" href="placed-orders.html">View my orders</a>`;
    status.hidden = true;
    receipt.hidden = false;
});
