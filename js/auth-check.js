import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('nav-login-btn');
    const signupBtn = document.getElementById('nav-signup-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const welcomeMsg = document.getElementById('nav-welcome-msg');
    const cartBadge = document.getElementById('cart-count-badge'); // 1. Find the cart badge

    // Ask Supabase if there is a logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // User is logged in: Hide login/signup
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        
        // Show logout and welcome message
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (welcomeMsg) {
            const shortName = user.email.split('@')[0];
            welcomeMsg.textContent = `Hello, ${shortName}!`;
            welcomeMsg.style.display = 'inline-block';
        }

        // 2. Fetch the real cart total from Supabase for this specific user
        const { data: cartItems, error } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_email', user.email);

        if (!error && cartItems) {
            // Add up the quantities of all items
            const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
            if (cartBadge) {
                cartBadge.textContent = totalQuantity;
            }
        }
    }

    // Make the Logout button work
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                alert("Error logging out: " + error.message);
            } else {
                window.location.reload(); 
            }
        });
    }
});