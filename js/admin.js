import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const ordersList = document.getElementById('admin-order-list');
    const orderCountBadge = document.getElementById('admin-order-count');

    const { data: orders, error: ordersError } = await supabase
        .from('placed_orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (!ordersError) {
        if (orderCountBadge) orderCountBadge.textContent = orders.length;
        
        if (ordersList) {
            if (orders.length === 0) {
                ordersList.innerHTML = '<p style="padding: 20px;">No orders have been placed yet.</p>';
            } else {
                ordersList.innerHTML = ''; 
                orders.forEach(order => {
                    const orderDate = new Date(order.created_at).toLocaleString();
                    const statusColor = order.status === 'Pending' ? '#e65100' : '#1b5e20';
                    const statusBg = order.status === 'Pending' ? '#ffe0b2' : '#c8e6c9';

                    const orderCard = document.createElement('div');
                    orderCard.style.border = '1px solid #eee';
                    orderCard.style.padding = '20px';
                    orderCard.style.marginBottom = '15px';
                    orderCard.style.borderRadius = '8px';
                    orderCard.style.backgroundColor = '#fff';
                    
                    orderCard.innerHTML = `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            <strong>Customer: ${order.user_email}</strong>
                            <span style="color: ${statusColor}; background: ${statusBg}; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85rem;">${order.status}</span>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <div style="font-size: 0.9rem; color: #666; margin-bottom: 5px;">Placed: ${orderDate}</div>
                            <div style="font-weight: bold;">Items: <span style="font-weight: normal;">${order.order_details}</span></div>
                        </div>
                        ${order.special_request ? `<div style="margin-bottom: 10px; color: #d32f2f; font-size: 0.9rem;"><em>Note: ${order.special_request}</em></div>` : ''}
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                            <strong style="font-size: 1.1rem; color: #1e3382;">Total: ₱${order.total_price}</strong>
                            ${order.status === 'Pending' ? `<button class="button button-primary button-small complete-btn" data-id="${order.id}">Mark Completed</button>` : ''}
                        </div>
                    `;
                    ordersList.appendChild(orderCard);
                });

                document.querySelectorAll('.complete-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const orderId = e.target.getAttribute('data-id');
                        e.target.textContent = "Updating...";
                        e.target.disabled = true;

                        const { error: updateError } = await supabase
                            .from('placed_orders')
                            .update({ status: 'Completed' })
                            .eq('id', orderId);

                        if (updateError) alert("Error updating order.");
                        else window.location.reload(); 
                    });
                });
            }
        }
    }

    const addProductTrigger = document.getElementById('add-product-trigger');
    const productModal = document.getElementById('product-modal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancel-product-modal');
    const productForm = document.getElementById('product-form');

    if (addProductTrigger) {
        addProductTrigger.addEventListener('click', () => {
            productModal.hidden = false;
        });
    }

    const closeModal = () => {
        productModal.hidden = true;
        productForm.reset();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const submitBtn = productForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Uploading & Saving...";
            submitBtn.disabled = true;

            const name = document.getElementById('product-name').value;
            const category = document.getElementById('product-main-category').value;
            const subcategory = document.getElementById('product-subcategory').value;
            const description = document.getElementById('product-description').value;
            const price = document.getElementById('product-price').value;
            const isAvailable = document.getElementById('product-availability').checked;
            const isBestSeller = document.getElementById('product-best-seller').checked;
            const imageFile = document.getElementById('product-image-file').files[0];

            let imageUrl = '';

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    alert("Error uploading image: " + uploadError.message);
                    submitBtn.textContent = "Add Product";
                    submitBtn.disabled = false;
                    return;
                }

                const { data: publicUrlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                imageUrl = publicUrlData.publicUrl;
            }
            
            const { error: insertError } = await supabase.from('menu_items').insert([
                {
                    item_name: name,
                    category: category,
                    subcategory: subcategory,
                    description: description,
                    price: parseFloat(price),
                    is_available: isAvailable,
                    is_best_seller: isBestSeller,
                    image_url: imageUrl
                }
            ]);

            if (insertError) {
                alert("Error adding product: " + insertError.message);
                submitBtn.textContent = "Add Product";
                submitBtn.disabled = false;
            } else {
                alert("Product and image successfully added to database!");
                closeModal();
                window.location.reload();
            }
        });
    }

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

            // Check if email already exists in profiles
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .single();

            let inviteError;
            if (existingUser) {
                // Update role if user already exists
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: role })
                    .eq('email', email);
                inviteError = error;
            } else {
                // Insert new profile if it doesn't exist
                const { error } = await supabase
                    .from('profiles')
                    .insert([{ email: email, role: role }]);
                inviteError = error;
            }

            if (inviteError) {
                alert("Error inviting staff: " + inviteError.message);
                submitBtn.textContent = "Send Invitation";
                submitBtn.disabled = false;
            } else {
                alert(`Success! ${name} (${email}) has been successfully pre-approved as a ${role}.`);
                inviteForm.reset();
                submitBtn.textContent = "Send Invitation";
                submitBtn.disabled = false;
            }
        });
    }
});