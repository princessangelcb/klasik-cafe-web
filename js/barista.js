import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    const loadStaffProfile = async () => {
        let { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if ((!profile || error) && session.user.email) {
            const fallback = await supabase.from('profiles').select('role').eq('email', session.user.email).maybeSingle();
            if (fallback.data) { profile = fallback.data; error = fallback.error; }
        }
        return { data: profile, error };
    };

    const { data: profile, error } = await loadStaffProfile();
    if (error) console.warn('Could not load the staff role from the profile row.', error);
    if (!profile || !['barista', 'admin'].includes(String(profile.role).toLowerCase())) {
        window.klasikNotify?.('Access denied. Staff only.', 'error'); window.location.href = 'index.html'; return;
    }

    const queue = document.getElementById('barista-order-queue') || document.getElementById('order-list');
    const filters = ['All', 'Pending', 'Preparing', 'Ready for Pickup', 'Completed'];
    const pageSize = 2;
    let currentFilter = 'Pending';
    let currentPage = 1;
    let searchCode = '';
    let allOrders = [];
    let imageByName = new Map();
    let customerNameByEmail = new Map();
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const money = (v) => `&#8369;${Number(v || 0).toFixed(2)}`;
    const parseLegacyItems = (text) => [...String(text || '').matchAll(/(?:^|,\s*)(\d+)\s*x\s*([^,(]+?)(?:\s*\((.*?)\))?(?=,\s*\d+\s*x\s*|$)/gi)]
        .map(match => ({ quantity: Number(match[1]), item_name: match[2].trim(), customizations: match[3] || '' }));

    const tools = document.createElement('div');
    tools.className = 'barista-queue-tools';
    tools.innerHTML = `<label>Search order code <input type="search" id="barista-order-search" maxlength="4" placeholder="e.g. A7B2" autocomplete="off"></label><div class="barista-order-filters" role="tablist" aria-label="Filter orders">${filters.map((f, i) => `<button type="button" role="tab" data-order-filter="${esc(f)}" aria-selected="${f === currentFilter}" class="${f === currentFilter ? 'active' : ''}">${esc(f)}</button>`).join('')}</div>`;
    const layout = queue?.closest('.barista-layout');
    layout?.before(tools);
    const pagination = document.createElement('div');
    pagination.className = 'barista-pagination';
    pagination.setAttribute('aria-label', 'Order pages');
    layout?.after(pagination);

    async function loadOrders() {
        if (!queue) return;
        queue.innerHTML = '<p>Loading live orders...</p>';
        const { data: orders, error } = await supabase.from('placed_orders').select('*').order('created_at', { ascending: false });
        if (error) { console.error('Error fetching orders:', error); queue.textContent = 'Orders could not be loaded.'; return; }
        allOrders = orders || [];
        const customerEmails = [...new Set(allOrders.map(order => String(order.user_email || '').toLowerCase()).filter(Boolean))];
        if (customerEmails.length) {
            const { data: profiles, error: profileError } = await supabase.from('profiles').select('email, full_name').in('email', customerEmails);
            if (profileError) console.warn('Could not load customer names for older orders.', profileError);
            customerNameByEmail = new Map((profiles || []).map(profile => [String(profile.email || '').toLowerCase(), profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.name]).filter(([, name]) => name));
        }
        const names = new Set();
        allOrders.forEach(o => (Array.isArray(o.items) && o.items.length ? o.items : parseLegacyItems(o.order_details)).forEach(i => i.item_name && names.add(i.item_name)));
        if (names.size) {
            const { data: products, error: productError } = await supabase.from('menu_items').select('item_name,image_url').in('item_name', [...names]);
            if (productError) console.warn('Could not load menu images for older orders.', productError);
            imageByName = new Map((products || []).map(p => [String(p.item_name).toLowerCase(), p.image_url]));
        }
        updateStats(); render();
    }

    function updateStats() {
        const values = { 'barista-awaiting-count': 'Pending', 'barista-preparing-count': 'Preparing', 'barista-ready-count': 'Ready for Pickup', 'barista-completed-count': 'Completed' };
        Object.entries(values).forEach(([id, status]) => { const el = document.getElementById(id); if (el) el.textContent = allOrders.filter(o => o.status === status).length; });
    }

    function normalizeItems(order) {
        if (Array.isArray(order.items) && order.items.length) return order.items;
        return parseLegacyItems(order.order_details).map(item => ({ ...item, image_url: imageByName.get(String(item.item_name).toLowerCase()) }));
    }
    function render() {
        const filtered = allOrders.filter(o => (currentFilter === 'All' || o.status === currentFilter)
            && (!searchCode || String(o.order_code || '').toUpperCase().includes(searchCode)));
        const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
        currentPage = Math.max(1, Math.min(currentPage, pages));
        const pageOrders = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        if (!pageOrders.length) queue.innerHTML = '<p class="barista-empty-queue">No orders match this status or order code.</p>';
        else queue.innerHTML = pageOrders.map(order => {
            const itemsHtml = normalizeItems(order).map(item => {
                const src = item.image_url || imageByName.get(String(item.item_name || '').toLowerCase());
                return `<div class="barista-order-product">${src ? `<img src="${esc(src)}" alt="${esc(item.item_name)}" loading="lazy">` : `<span class="barista-order-product-placeholder">&#9749;</span>`}<div><strong>${esc(item.quantity || 1)} &times; ${esc(item.item_name)}</strong>${item.customizations ? `<small>${esc(item.customizations)}</small>` : `<small></small>`}</div></div>`;
            }).join('');
            const next = { 'Pending': ['Preparing', 'Start Preparing'], 'Preparing': ['Ready for Pickup', 'Ready for Pickup'], 'Ready for Pickup': ['Completed', 'Complete Order'] }[order.status];
            const statusClass = `status-${String(order.status || 'Pending').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const customerName = order.customer_name || customerNameByEmail.get(String(order.user_email || '').toLowerCase()) || 'Customer';
            const deleteButton = order.status === 'Completed' ? `<button type="button" class="button button-small delete-completed-order" data-id="${esc(order.id)}">Delete</button>` : '';
            const placedAt = order.created_at ? esc(new Date(order.created_at).toLocaleString()) : 'Date unavailable';
            return `<article class="order-card ${statusClass}"><header class="barista-order-card-head"><strong>Order #${esc(order.order_code || String(order.id).slice(0, 8))}</strong><div class="order-card-header-meta"><span class="order-status-tag">${esc(order.status || 'Pending')}</span><small>Placed: ${placedAt}</small></div></header><p class="barista-customer-name"><strong>Customer:</strong> ${esc(customerName)}</p><div class="barista-order-products">${itemsHtml}</div>${order.special_request ? `<p class="barista-order-note"><strong>Note:</strong> ${esc(order.special_request)}</p>` : `<p></p>`}<footer class="barista-order-card-foot"><strong>${money(order.total_price)}</strong>${next ? `<button type="button" class="button button-primary button-small action-status-btn" data-id="${esc(order.id)}" data-next="${esc(next[0])}">${esc(next[1])}</button>` : deleteButton || `<span></span>`}</footer></article>`;
        }).join('');
        pagination.innerHTML = `<span>Page ${currentPage} of ${pages} &middot; ${filtered.length} orders</span><div><button type="button" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button><button type="button" data-page="next" ${currentPage >= pages ? 'disabled' : ''}>Next</button></div>`;
    }

    tools.addEventListener('click', (event) => {
        const button = event.target.closest('[data-order-filter]'); if (!button) return;
        currentFilter = button.dataset.orderFilter; currentPage = 1;
        tools.querySelectorAll('[data-order-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-selected', String(b === button)); }); render();
        document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.toggle('active', link.textContent.trim() === currentFilter));
    });
    document.querySelector('.dashboard-primary-nav')?.addEventListener('click', event => {
        const link = event.target.closest('[data-order-filter]');
        if (!link) return;
        event.preventDefault();
        currentFilter = link.dataset.orderFilter;
        currentPage = 1;
        tools.querySelectorAll('[data-order-filter]').forEach(button => {
            const active = button.dataset.orderFilter === currentFilter;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('.dashboard-primary-nav [data-order-filter]').forEach(item => item.classList.toggle('active', item === link));
        render();
        document.getElementById('barista-orders')?.scrollIntoView({ behavior: 'smooth' });
    });
    tools.querySelector('#barista-order-search').addEventListener('input', e => { searchCode = e.target.value.trim().toUpperCase(); currentPage = 1; render(); });
    pagination.addEventListener('click', e => { const direction = e.target.dataset.page; if (!direction) return; currentPage += direction === 'next' ? 1 : -1; render(); });
    queue?.addEventListener('click', async e => {
        const deleteButton = e.target.closest('.delete-completed-order');
        if (deleteButton) {
            const order = allOrders.find(item => String(item.id) === deleteButton.dataset.id);
            if (!order || order.status !== 'Completed' || !window.confirm(`Permanently delete completed order #${order.order_code || order.id}?`)) return;
            deleteButton.disabled = true;
            const { data: deleted, error } = await supabase.from('placed_orders').delete().eq('id', order.id).eq('status', 'Completed').select('id').maybeSingle();
            if (error || !deleted) {
                console.error('Could not delete completed order.', error);
                window.klasikNotify?.(error ? `Could not delete order: ${error.message}` : 'Order was not deleted. Refresh and try again.', 'error');
                deleteButton.disabled = false;
                return;
            }
            allOrders = allOrders.filter(item => String(item.id) !== String(order.id));
            updateStats();
            render();
            return;
        }
        const button = e.target.closest('.action-status-btn'); if (!button) return;
        button.disabled = true; button.textContent = 'Updating…';
        const { error } = await supabase.from('placed_orders').update({ status: button.dataset.next }).eq('id', button.dataset.id);
        if (error) { console.error('Could not advance order status.', error); window.klasikNotify?.(`Could not update order: ${error.message}`, 'error'); }
        await loadOrders();
    });
    document.querySelectorAll('.sidebar-nav a[href="#barista-orders"]').forEach((link, index) => {
        const states = ['Pending', 'Preparing', 'Ready for Pickup', 'Completed'];
        const status = states[index];
        if (!status) return;
        link.addEventListener('click', e => { e.preventDefault(); currentFilter = status; currentPage = 1; document.querySelectorAll('.sidebar-nav a').forEach(item => item.classList.toggle('active', item === link)); tools.querySelectorAll('[data-order-filter]').forEach(b => { b.classList.toggle('active', b.dataset.orderFilter === status); b.setAttribute('aria-selected', String(b.dataset.orderFilter === status)); }); render(); document.getElementById('barista-orders')?.scrollIntoView({ behavior: 'smooth' }); });
    });
    const baristaSidebar = document.querySelector('.dashboard-primary-nav');
    if (baristaSidebar && 'IntersectionObserver' in window) {
        const baristaTargets = [...baristaSidebar.querySelectorAll('a[href^="#"]')]
            .map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))))
            .filter((section, index, all) => section && all.indexOf(section) === index);
        const updateBaristaScrollSpy = () => {
            const marker = window.innerHeight * 0.32;
            let current = baristaTargets[0];
            baristaTargets.forEach(section => { if (section.getBoundingClientRect().top <= marker) current = section; });
            const ordersVisible = current?.id === 'barista-orders';
            baristaSidebar.querySelectorAll('a[href^="#"]').forEach(link => {
                const active = ordersVisible
                    ? link.dataset.orderFilter === currentFilter
                    : link.hash === `#${current?.id}`;
                link.classList.toggle('active', active);
            });
        };
        const baristaSectionObserver = new IntersectionObserver(updateBaristaScrollSpy, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
        baristaTargets.forEach(section => baristaSectionObserver.observe(section));
        window.addEventListener('scroll', updateBaristaScrollSpy, { passive: true });
        window.addEventListener('resize', updateBaristaScrollSpy);
        updateBaristaScrollSpy();
    }

    const logout = document.querySelector('.dashboard-logout') || document.querySelector('.sidebar-logout');
    logout?.addEventListener('click', async e => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = 'login.html'; });
    await loadOrders();
});
