import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const ordersList = document.getElementById('admin-order-list');
    const orderCountBadge = document.getElementById('admin-order-count');
    const productCountBadge = document.getElementById('admin-product-count');
    const availableCountBadge = document.getElementById('admin-available-count');
    const tableBody = document.getElementById('admin-product-table-body');

    // 1. Fetch and manage the order queue.
    const escapeOrderText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const parseLegacyOrderItems = text => [...String(text || '').matchAll(/(?:^|,\s*)(\d+)\s*x\s*([^,(]+?)(?:\s*\((.*?)\))?(?=,\s*\d+\s*x\s*|$)/gi)]
        .map(match => ({ quantity: Number(match[1]), item_name: match[2].trim(), customizations: match[3] || '' }));
    const orderFilters = ['All', 'Pending', 'Preparing', 'Ready for Pickup', 'Completed'];
    let orderFilter = 'All';
    let orderPage = 1;
    let orderSearch = '';
    let orders = [];
    let orderImages = new Map();
    let orderCustomerNames = new Map();
    const orderTools = document.createElement('div');
    orderTools.className = 'admin-order-tools';
    orderTools.innerHTML = `<label>Search order code <input type="search" maxlength="4" placeholder="e.g. A7B2" aria-label="Search by order code"></label><div class="admin-order-filters">${orderFilters.map(f => `<button type="button" data-admin-order-filter="${escapeOrderText(f)}" class="${f === orderFilter ? 'active' : ''}">${escapeOrderText(f)}</button>`).join('')}</div>`;
    const orderPagination = document.createElement('div');
    orderPagination.className = 'admin-order-pagination';
    if (ordersList) { ordersList.before(orderTools); ordersList.after(orderPagination); }

    const { data: fetchedOrders, error: ordersError } = await supabase.from('placed_orders').select('*').order('created_at', { ascending: false });
    if (ordersError) {
        console.error('Could not load admin order queue.', ordersError);
        if (ordersList) ordersList.textContent = 'Orders could not be loaded.';
    } else {
        orders = fetchedOrders || [];
        if (orderCountBadge) orderCountBadge.textContent = orders.length;
        const orderEmails = [...new Set(orders.map(order => String(order.user_email || '').toLowerCase()).filter(Boolean))];
        if (orderEmails.length) {
            const { data: profiles, error: profileError } = await supabase.from('profiles').select('email, full_name').in('email', orderEmails);
            if (profileError) console.warn('Could not load customer names for older orders.', profileError);
            orderCustomerNames = new Map((profiles || []).map(profile => [String(profile.email || '').toLowerCase(), profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.name]).filter(([, name]) => name));
        }
        const names = [...new Set(orders.flatMap(order => (Array.isArray(order.items) && order.items.length ? order.items : parseLegacyOrderItems(order.order_details)).map(item => item.item_name).filter(Boolean)))];
        if (names.length) {
            const { data: products, error: imageError } = await supabase.from('menu_items').select('item_name,image_url').in('item_name', names);
            if (imageError) console.warn('Could not retrieve menu images for order cards.', imageError);
            orderImages = new Map((products || []).map(product => [String(product.item_name).toLowerCase(), product.image_url]));
        }
        const renderAdminOrders = () => {
            const filtered = orders.filter(order => (orderFilter === 'All' || order.status === orderFilter)
                && (!orderSearch || String(order.order_code || '').toUpperCase().includes(orderSearch)));
            const orderPageSize = 2;
            const pageCount = Math.max(1, Math.ceil(filtered.length / orderPageSize));
            orderPage = Math.max(1, Math.min(orderPage, pageCount));
            const pageOrders = filtered.slice((orderPage - 1) * orderPageSize, orderPage * orderPageSize);
            if (!ordersList) return;
            ordersList.innerHTML = pageOrders.length ? pageOrders.map(order => {
                const items = Array.isArray(order.items) && order.items.length ? order.items : parseLegacyOrderItems(order.order_details);
                if (!items.length) items.push({ item_name: order.order_details || 'Order details unavailable', quantity: 1 });
                const productsHtml = items.map(item => {
                    const image = item.image_url || orderImages.get(String(item.item_name || '').toLowerCase());
                    return `<div class="admin-order-product">${image ? `<img src="${escapeOrderText(image)}" alt="${escapeOrderText(item.item_name)}" loading="lazy">` : `<span class="admin-order-product-placeholder">&#9749;</span>`}<span><strong>${escapeOrderText(item.quantity || 1)} &times; ${escapeOrderText(item.item_name)}</strong>${item.customizations ? `<small>${escapeOrderText(item.customizations)}</small>` : `<small></small>`}</span></div>`;
                }).join('');
                const next = { Pending: ['Preparing', 'Start Preparing'], Preparing: ['Ready for Pickup', 'Ready for Pickup'], 'Ready for Pickup': ['Completed', 'Complete Order'] }[order.status];
                const statusClass = `status-${String(order.status || 'Pending').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const customerName = order.customer_name || orderCustomerNames.get(String(order.user_email || '').toLowerCase()) || 'Customer';
                return `<article class="admin-order-summary ${statusClass}"><header><strong>Order #${escapeOrderText(order.order_code || String(order.id).slice(0, 8))}</strong><span class="order-status-tag">${escapeOrderText(order.status || 'Pending')}</span></header><p><strong>Customer:</strong> ${escapeOrderText(customerName)}</p><small>Placed: ${order.created_at ? escapeOrderText(new Date(order.created_at).toLocaleString()) : 'Date unavailable'}</small><div class="admin-order-products">${productsHtml}</div>${order.special_request ? `<p><strong>Note:</strong> ${escapeOrderText(order.special_request)}</p>` : `<p></p>`}<footer><strong>Total: &#8369;${Number(order.total_price || 0).toFixed(2)}</strong>${next ? `<button type="button" class="button button-primary button-small admin-order-advance" data-id="${escapeOrderText(order.id)}" data-next="${escapeOrderText(next[0])}">${escapeOrderText(next[1])}</button>` : `<span></span>`}</footer></article>`;
            }).join('') : '<p class="admin-order-empty">No orders match this status or order code.</p>';
            orderPagination.innerHTML = `<span>Page ${orderPage} of ${pageCount} &middot; ${filtered.length} orders</span><div><button type="button" data-admin-page="prev" ${orderPage <= 1 ? 'disabled' : ''}>Previous</button><button type="button" data-admin-page="next" ${orderPage >= pageCount ? 'disabled' : ''}>Next</button></div>`;
        };
        orderTools.addEventListener('click', event => {
            const button = event.target.closest('[data-admin-order-filter]'); if (!button) return;
            orderFilter = button.dataset.adminOrderFilter; orderPage = 1;
            orderTools.querySelectorAll('[data-admin-order-filter]').forEach(tab => tab.classList.toggle('active', tab === button)); renderAdminOrders();
        });
        orderTools.querySelector('input').addEventListener('input', event => { orderSearch = event.target.value.trim().toUpperCase(); orderPage = 1; renderAdminOrders(); });
        orderPagination.addEventListener('click', event => { if (!event.target.dataset.adminPage) return; orderPage += event.target.dataset.adminPage === 'next' ? 1 : -1; renderAdminOrders(); });
        ordersList?.addEventListener('click', async event => {
            const button = event.target.closest('.admin-order-advance'); if (!button) return;
            button.disabled = true;
            const { error } = await supabase.from('placed_orders').update({ status: button.dataset.next }).eq('id', button.dataset.id);
            if (error) { console.error('Could not update order status.', error); window.klasikNotify?.(`Could not update order: ${error.message}`, 'error'); return; }
            const order = orders.find(item => String(item.id) === button.dataset.id); if (order) order.status = button.dataset.next;
            renderAdminOrders();
        });
        renderAdminOrders();
    }
    // 2. Fetch Menu Items, Update Counters & Render Table
    const { data: menuItems, error: menuFetchError } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (!menuFetchError && menuItems) {
        if (productCountBadge) productCountBadge.textContent = menuItems.length;
        if (availableCountBadge) availableCountBadge.textContent = menuItems.filter(i => i.is_available).length;

        if (tableBody && menuItems.length > 0) {
            tableBody.innerHTML = '';
            menuItems.forEach(item => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #eee';
                row.innerHTML = `
                    <td style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                        <img src="${item.image_url || 'images/products/coffee/amerikano.jpg'}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                        <strong>${item.item_name}</strong>
                    </td>
                    <td style="padding: 12px; text-transform: uppercase; font-size: 0.85rem; color: #666;">${item.category}</td>
                    <td style="padding: 12px; font-weight: bold; color: #1e3382;">₱${item.price}</td>
                    <td style="padding: 12px;">
                        <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <input type="checkbox" class="toggle-availability" data-id="${item.id}" ${item.is_available ? 'checked' : ''} style="accent-color: #1e3382; width: 16px; height: 16px;">
                            <span style="font-size: 0.85rem; color: ${item.is_available ? '#1b5e20' : '#b71c1c'};">${item.is_available ? 'Available' : 'Not Available'}</span>
                        </label>
                    </td>
                    <td style="padding: 12px;">
                        <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <input type="checkbox" class="toggle-bestseller" data-id="${item.id}" ${item.is_best_seller ? 'checked' : ''} style="accent-color: #1e3382; width: 16px; height: 16px;">
                            <span style="font-size: 0.85rem;">${item.is_best_seller ? 'Best Seller' : 'Not Best Seller'}</span>
                        </label>
                    </td>
                    <td style="padding: 12px; white-space: nowrap;">
                        <button type="button" class="button button-small edit-product-btn" data-id="${item.id}">Edit</button>
                        <button type="button" class="button button-small delete-product-btn" data-id="${item.id}" style="background: #d32f2f; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </td>
                `;
                [
                    [row.querySelector('.toggle-availability'), item.is_available ? 'Available' : 'Not Available', item.is_available],
                    [row.querySelector('.toggle-bestseller'), item.is_best_seller ? 'Best Seller' : 'Not Best Seller', item.is_best_seller]
                ].forEach(([input, text, isOn]) => {
                    if (!input) return;
                    const label = input.closest('label');
                    label.className = 'availability-switch status-switch';
                    input.removeAttribute('style');
                    input.setAttribute('role', 'switch');
                    input.setAttribute('aria-label', `${input.classList.contains('toggle-availability') ? 'Availability' : 'Best Seller status'} for ${item.item_name}`);
                    const value = label.querySelector('span');
                    value.className = `availability-label status-value ${isOn ? 'is-on' : 'is-off'}`;
                    value.textContent = text;
                    const track = document.createElement('span');
                    track.className = 'availability-switch-track';
                    track.setAttribute('aria-hidden', 'true');
                    label.insertBefore(track, value);
                });
                tableBody.appendChild(row);
            });

            // Toggle Availability Switch Listener
            document.querySelectorAll('.toggle-availability').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const isAvailable = e.target.checked;
                    e.target.disabled = true;
                    const { error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
                    const product = menuItems.find(item => String(item.id) === id);
                    e.target.disabled = false;
                    if (error) { e.target.checked = !isAvailable; window.klasikNotify?.("Error updating availability.", "error"); }
                    else {
                        if (product) product.is_available = isAvailable;
                        const label = e.target.closest('label')?.querySelector('.availability-label');
                        if (label) { label.textContent = isAvailable ? 'Available' : 'Not Available'; label.classList.toggle('is-on', isAvailable); label.classList.toggle('is-off', !isAvailable); }
                        if (availableCountBadge) availableCountBadge.textContent = menuItems.filter(item => item.is_available).length;
                    }
                });
            });

            // Toggle Best Seller Switch Listener
            document.querySelectorAll('.toggle-bestseller').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const isBestSeller = e.target.checked;
                    e.target.disabled = true;
                    const { error } = await supabase.from('menu_items').update({ is_best_seller: isBestSeller }).eq('id', id);
                    const product = menuItems.find(item => String(item.id) === id);
                    e.target.disabled = false;
                    if (error) { e.target.checked = !isBestSeller; window.klasikNotify?.("Error updating best seller status.", "error"); }
                    else if (product) product.is_best_seller = isBestSeller;
                });
            });

            // Delete product handler
            document.querySelectorAll('.edit-product-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const item = menuItems.find(product => String(product.id) === btn.dataset.id);
                    if (!item || !productModal) return;
                    productForm.reset();
                    document.getElementById('product-id').value = item.id;
                    document.getElementById('product-name').value = item.item_name || '';
                    document.getElementById('product-main-category').value = item.category || 'coffee';
                    document.getElementById('product-subcategory').value = item.subcategory || 'iced-coffee';
                    document.getElementById('product-description').value = item.description || '';
                    document.getElementById('product-price').value = item.price ?? '';
                    document.getElementById('product-availability').checked = item.is_available !== false;
                    document.getElementById('product-best-seller').checked = item.is_best_seller === true;
                    document.getElementById('product-image-file').value = '';
                    if (imageUrlInput) imageUrlInput.value = item.image_url || '';
                    setProductImagePreview(item.image_url || '');
                    document.getElementById('product-modal-title').textContent = 'Edit Product';
                    productForm.querySelector('button[type="submit"]').textContent = 'Update Product';
                    productModal.hidden = false;
                });
            });

            // Delete product handler
            document.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (await window.klasikConfirm?.("Are you sure you want to delete this product?", "Delete Product")) {
                        const { error: delError } = await supabase.from('menu_items').delete().eq('id', id);
                        if (delError) window.klasikNotify?.("Error deleting product: " + delError.message, "error");
                        else window.location.reload();
                    }
                });
            });
        }
    }

    // 3. Add Product Modal & Image Upload Logic
    const addProductTrigger = document.getElementById('add-product-trigger');
    const productModal = document.getElementById('product-modal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancel-product-modal');
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const imageInput = document.getElementById('product-image-file');
    const imageUrlInput = document.getElementById('product-image');
    const imageDropzone = document.getElementById('product-image-dropzone');
    const imagePrompt = imageDropzone?.querySelector('.image-upload-prompt');
    const imagePreviewWrap = document.getElementById('product-image-preview-wrap') || imageDropzone?.querySelector('.image-upload-preview-wrap');
    const imagePreview = document.getElementById('product-image-preview');
    const removeImageBtn = document.getElementById('product-image-remove');
    const imageStatus = document.getElementById('product-image-status');
    let previewObjectUrl = '';

    const setProductImagePreview = (source, status = '') => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = source instanceof File ? URL.createObjectURL(source) : '';
        if (imagePreview) {
            imagePreview.onerror = () => {
                if (imagePreviewWrap) imagePreviewWrap.hidden = true;
                if (imageStatus) imageStatus.textContent = 'The saved image could not be loaded. Check that its Supabase Storage URL is public and valid.';
            };
            imagePreview.onload = () => { if (source && imagePreviewWrap) imagePreviewWrap.hidden = false; };
            imagePreview.src = previewObjectUrl || source || '';
        }
        if (imagePreviewWrap) imagePreviewWrap.hidden = !source;
        if (imagePrompt) imagePrompt.hidden = Boolean(source);
        if (imageStatus) imageStatus.textContent = status;
    };

    const resetProductImage = () => {
        if (imageInput) imageInput.value = '';
        if (imageUrlInput) imageUrlInput.value = '';
        setProductImagePreview('');
    };

    const acceptProductImage = (file) => {
        if (!file) return;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            if (imageInput) imageInput.value = '';
            setProductImagePreview('', 'Choose a PNG, JPG, or WebP image.');
            return;
        }
        setProductImagePreview(file, `${file.name} selected`);
    };

    if (imageDropzone && imageInput) {
        imageDropzone.addEventListener('click', (event) => {
            if (!event.target.closest('#product-image-remove')) imageInput.click();
        });
        imageDropzone.addEventListener('keydown', (event) => {
            if (event.target === imageDropzone && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                imageInput.click();
            }
        });
        imageInput.addEventListener('change', () => acceptProductImage(imageInput.files?.[0]));
        ['dragenter', 'dragover'].forEach(type => imageDropzone.addEventListener(type, (event) => {
            event.preventDefault();
            imageDropzone.classList.add('is-dragging');
        }));
        ['dragleave', 'dragend'].forEach(type => imageDropzone.addEventListener(type, (event) => {
            event.preventDefault();
            imageDropzone.classList.remove('is-dragging');
        }));
        imageDropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            imageDropzone.classList.remove('is-dragging');
            const file = event.dataTransfer?.files?.[0];
            if (!file) return;
            try {
                const transfer = new DataTransfer();
                transfer.items.add(file);
                imageInput.files = transfer.files;
                acceptProductImage(file);
            } catch (error) {
                setProductImagePreview('', 'This browser could not read the dropped file. Click to browse instead.');
            }
        });
    }

    removeImageBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        resetProductImage();
    });

    if (addProductTrigger && productModal) {
        addProductTrigger.addEventListener('click', () => {
            productForm?.reset();
            if (productIdInput) productIdInput.value = '';
            resetProductImage();
            document.getElementById('product-modal-title').textContent = 'Add Product';
            productForm?.querySelector('button[type="submit"]')?.replaceChildren('Add Product');
            productModal.hidden = false;
        });
    }

    const closeModal = () => {
        if (productModal) productModal.hidden = true;
        if (productForm) productForm.reset();
        if (productIdInput) productIdInput.value = '';
        resetProductImage();
        document.getElementById('product-modal-title').textContent = 'Add Product';
        productForm?.querySelector('button[type="submit"]')?.replaceChildren('Add Product');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const submitBtn = productForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Uploading & Saving...";
            submitBtn.disabled = true;
            try {
                const productId = productIdInput?.value || '';
                const imageFile = imageInput?.files?.[0] || null;
                let imageUrl = imageUrlInput?.value || '';
                if (imageFile) {
                    const extensionByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
                    const uniqueId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12);
                    const filePath = `${Date.now()}-${uniqueId}.${extensionByType[imageFile.type]}`;
                    const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, imageFile, { upsert: false, contentType: imageFile.type });
                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    imageUrl = supabase.storage.from('product-images').getPublicUrl(filePath).data.publicUrl;
                }

                const productData = {
                    item_name: document.getElementById('product-name').value.trim(),
                    category: document.getElementById('product-main-category').value,
                    subcategory: document.getElementById('product-subcategory').value,
                    description: document.getElementById('product-description').value.trim(),
                    price: parseFloat(document.getElementById('product-price').value),
                    is_available: document.getElementById('product-availability').checked,
                    is_best_seller: document.getElementById('product-best-seller').checked,
                    image_url: imageUrl
                };
                const result = productId
                    ? await supabase.from('menu_items').update(productData).eq('id', productId)
                    : await supabase.from('menu_items').insert([productData]);
                if (result.error) throw result.error;

                window.klasikNotify?.(productId ? 'Product successfully updated.' : 'Product successfully added.');
                closeModal();
                window.setTimeout(() => window.location.reload(), 900);
            } catch (error) {
                console.error('Could not save product.', error);
                if (imageStatus) imageStatus.textContent = error.message || 'Could not save product. Please try again.';
                window.klasikNotify?.(error.message || 'Could not save product. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = productIdInput?.value ? 'Update Product' : 'Add Product';
            }
        });
    }

    // 4. Staff Invitation Logic
    const inviteForm = document.getElementById('invite-staff-form');

    if (inviteForm) {
        inviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('invite-name');
            const emailInput = document.getElementById('invite-email');
            const roleSelect = document.getElementById('invite-role');

            const name = nameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const role = roleSelect.value;

            const submitBtn = inviteForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Processing Invite...";
            submitBtn.disabled = true;

            const { data: existingUser } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .single();

            let inviteError;
            if (existingUser) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: role })
                    .eq('email', email);
                inviteError = error;
            } else {
                const { error } = await supabase
                    .from('profiles')
                    .insert([{ email: email, role: role }]);
                inviteError = error;
            }

            if (inviteError) {
                window.klasikNotify?.("Error inviting staff: " + inviteError.message, "error");
                submitBtn.textContent = "Send Invitation";
                submitBtn.disabled = false;
            } else {
                window.klasikNotify?.(`${name} (${email}) has been pre-approved as a ${role}.`);
                inviteForm.reset();
                submitBtn.textContent = "Send Invitation";
                submitBtn.disabled = false;
            }
        });
    }

    // 5. Café Settings Logic
    const aboutInput = document.getElementById('admin-about-text');
    const phoneInput = document.getElementById('admin-phone');
    const emailInput = document.getElementById('admin-email');
    const addressInput = document.getElementById('admin-address');
    const hoursInput = document.getElementById('admin-hours');
    const saveCafeBtn = document.getElementById('save-cafe-settings');
    const cafeMessageEl = document.getElementById('admin-settings-message');

    if (saveCafeBtn) {
        // Load the existing data into the form when page loads
        const { data: cafeInfo, error: loadError } = await supabase
            .from('cafe_info')
            .select('*')
            .eq('id', 1)
            .single();

        if (cafeInfo) {
            if (aboutInput) aboutInput.value = cafeInfo.about_text || '';
            if (phoneInput) phoneInput.value = cafeInfo.phone || '';
            if (emailInput) emailInput.value = cafeInfo.email || '';
            if (addressInput) addressInput.value = cafeInfo.address || '';
            if (hoursInput) hoursInput.value = cafeInfo.opening_hours || '';
        }

        // Save new data when the button is clicked
        saveCafeBtn.addEventListener('click', async () => {
            saveCafeBtn.disabled = true;
            saveCafeBtn.textContent = "Saving...";
            if (cafeMessageEl) cafeMessageEl.textContent = "";

            const { error: updateError } = await supabase
                .from('cafe_info')
                .update({
                    about_text: aboutInput ? aboutInput.value : '',
                    phone: phoneInput ? phoneInput.value : '',
                    email: emailInput ? emailInput.value : '',
                    address: addressInput ? addressInput.value : '',
                    opening_hours: hoursInput ? hoursInput.value : ''
                })
                .eq('id', 1);

            saveCafeBtn.disabled = false;
            saveCafeBtn.textContent = "Save Changes";

            if (updateError) {
                if (cafeMessageEl) {
                    cafeMessageEl.style.color = "red";
                    cafeMessageEl.textContent = "Error saving: " + updateError.message;
                } else {
                    window.klasikNotify?.("Error saving: " + updateError.message, "error");
                }
            } else {
                if (cafeMessageEl) {
                    cafeMessageEl.style.color = "green";
                    cafeMessageEl.textContent = "Settings saved successfully! The homepage is now updated.";
                }
            }
        });
    }

    // Customer feedback is rendered with textContent so submitted content cannot inject markup.
    const reviewList = document.getElementById('admin-review-list');
    const reviewCount = document.getElementById('admin-review-count');
    const suggestionList = document.getElementById('admin-suggestion-list');
    const suggestionCount = document.getElementById('admin-suggestion-count');
    const reviewPages = { reviews: 1, suggestions: 1 };
    const feedbackRows = { reviews: [], suggestions: [] };
    const feedbackPageSize = 2;
    const feedbackPagers = {};

    const showFeedbackError = (list, message) => {
        if (!list) return;
        const notice = document.createElement('p');
        notice.style.padding = '20px';
        notice.textContent = message;
        list.replaceChildren(notice);
    };
    const makeFeedbackCard = (table, row, body, dateText, rating) => {
        const card = document.createElement('article');
        card.className = 'admin-feedback-card';
        const header = document.createElement('div');
        header.className = 'admin-feedback-card-head';
        const author = document.createElement('strong');
        author.textContent = row.customer_name || 'Customer';
        header.append(author);
        if (rating !== null) {
            const score = document.createElement('span');
            score.className = 'admin-feedback-rating';
            score.textContent = `\u2605 ${rating}/5`;
            header.append(score);
        }
        const date = document.createElement('small');
        date.className = 'admin-feedback-date';
        date.textContent = dateText;
        const content = document.createElement('p');
        content.className = 'admin-feedback-content';
        const feedbackText = table === 'suggestions' && String(body || '').includes('\n\n')
            ? String(body).slice(String(body).indexOf('\n\n') + 2)
            : body || '';
        content.textContent = feedbackText;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'button button-outline button-small admin-feedback-delete';
        remove.textContent = 'Delete';
        remove.dataset.feedbackDelete = table;
        remove.dataset.id = row.id;
        card.append(header, content, date, remove);
        return card;
    };
    const renderFeedbackPage = (table, list) => {
        if (!list) return;
        const rows = feedbackRows[table];
        const pageCount = Math.max(1, Math.ceil(rows.length / feedbackPageSize));
        reviewPages[table] = Math.max(1, Math.min(reviewPages[table], pageCount));
        list.replaceChildren();
        if (!rows.length) {
            const empty = document.createElement('p'); empty.className = 'admin-feedback-empty';
            empty.textContent = table === 'reviews' ? 'No reviews yet.' : 'No suggestions yet.';
            list.append(empty);
        } else {
            rows.slice((reviewPages[table] - 1) * feedbackPageSize, reviewPages[table] * feedbackPageSize)
                .forEach(row => list.append(makeFeedbackCard(table, row, table === 'reviews' ? row.comment : row.suggestion, row.created_at ? new Date(row.created_at).toLocaleString() : '', table === 'reviews' ? row.rating : null)));
        }
        const pager = feedbackPagers[table];
        if (pager) pager.innerHTML = `<span>Page ${reviewPages[table]} of ${pageCount} &middot; ${rows.length} ${table}</span><div><button type="button" data-feedback-page="prev" ${reviewPages[table] <= 1 ? 'disabled' : ''}>Previous</button><button type="button" data-feedback-page="next" ${reviewPages[table] >= pageCount ? 'disabled' : ''}>Next</button></div>`;
    };
    const renderAdminFeedback = async () => {
        const jobs = [];
        if (reviewList) jobs.push((async () => {
            const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(`Reviews: ${error.message}`);
            let rows = data || [];
            const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name, first_name, last_name').in('id', userIds);
                if (profileError) console.warn('Could not resolve full names for older reviews; showing their saved customer names.', profileError);
                else {
                    const fullNames = new Map((profiles || []).map(profile => [String(profile.id), [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.full_name ]).filter(([, name]) => name));
                    rows = rows.map(row => ({ ...row, customer_name: fullNames.get(String(row.user_id)) || row.customer_name || 'Customer' }));
                }
            }
            if (reviewCount) reviewCount.textContent = String(rows.length);
            feedbackRows.reviews = rows;
            renderFeedbackPage('reviews', reviewList);
        })());
        if (suggestionList) jobs.push((async () => {
            const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(`Suggestions: ${error.message}`);
            let rows = data || [];
            const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
            if (userIds.length) {
                const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name, first_name, last_name').in('id', userIds);
                if (profileError) console.warn('Could not resolve full names for older suggestions; showing their saved customer names.', profileError);
                else {
                    const fullNames = new Map((profiles || []).map(profile => [String(profile.id), [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.full_name ]).filter(([, name]) => name));
                    rows = rows.map(row => ({ ...row, customer_name: fullNames.get(String(row.user_id)) || row.customer_name || 'Customer' }));
                }
            }
            if (suggestionCount) suggestionCount.textContent = String(rows.length);
            feedbackRows.suggestions = rows;
            renderFeedbackPage('suggestions', suggestionList);
        })());
        const results = await Promise.allSettled(jobs);
        results.filter((result) => result.status === 'rejected').forEach((result) => {
            console.error('Could not load Admin feedback.', result.reason);
            const msg = result.reason?.message || 'Could not load feedback. Check Supabase permissions and table configuration.';
            if (msg.startsWith('Reviews:')) showFeedbackError(reviewList, msg);
            else showFeedbackError(suggestionList, msg);
        });
    };
    for (const [table, list] of [['reviews', reviewList], ['suggestions', suggestionList]]) {
        if (!list) continue;
        const pager = document.createElement('nav');
        pager.className = 'admin-feedback-pagination';
        pager.setAttribute('aria-label', `${table} pages`);
        list.after(pager);
        feedbackPagers[table] = pager;
        pager.addEventListener('click', event => {
            const direction = event.target.closest('[data-feedback-page]')?.dataset.feedbackPage;
            if (!direction) return;
            reviewPages[table] += direction === 'next' ? 1 : -1;
            renderFeedbackPage(table, list);
        });
        list.addEventListener('click', async event => {
            const button = event.target.closest('[data-feedback-delete]');
            if (!button) return;
            if (!await window.klasikConfirm?.('Delete this customer feedback?', 'Delete feedback')) return;
            button.disabled = true;
            const { error } = await supabase.from(table).delete().eq('id', button.dataset.id);
            if (error) {
                console.error(`Could not delete ${table} row.`, error);
                window.klasikNotify?.(`Could not delete feedback: ${error.message}`, 'error');
                button.disabled = false;
                return;
            }
            window.klasikNotify?.('Feedback deleted.');
            await renderAdminFeedback();
        });
    }
    await renderAdminFeedback();

    // Realtime is optional; the Admin page still loads saved entries on each visit.
    if (supabase.channel) {
        supabase.channel('admin-customer-feedback')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, renderAdminFeedback)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, renderAdminFeedback)
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') console.warn('Feedback realtime is unavailable; refresh Admin to see new submissions.');
            });
    }

    // ADMIN SECURE LOGOUT
    const adminSidebar = document.querySelector('.admin-sidebar .sidebar-nav');
    if (adminSidebar && 'IntersectionObserver' in window) {
        const adminTargets = [...adminSidebar.querySelectorAll('a[href^="#"]')]
            .map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))))
            .filter(Boolean);
        const updateAdminScrollSpy = () => {
            const marker = window.innerHeight * 0.32;
            let current = adminTargets[0];
            adminTargets.forEach(section => { if (section.getBoundingClientRect().top <= marker) current = section; });
            adminSidebar.querySelectorAll('a[href^="#"]').forEach(link => {
                link.classList.toggle('active', link.hash === `#${current?.id}`);
            });
        };
        const adminSectionObserver = new IntersectionObserver(updateAdminScrollSpy, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
        adminTargets.forEach(section => adminSectionObserver.observe(section));
        window.addEventListener('scroll', updateAdminScrollSpy, { passive: true });
        window.addEventListener('resize', updateAdminScrollSpy);
        updateAdminScrollSpy();
    }

    const adminLogoutBtn = document.querySelector('.sidebar-logout');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            await supabase.auth.signOut(); 
            window.location.href = 'login.html'; 
        });
    }
});
