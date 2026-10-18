import { supabase } from './supabase.js';

if (!window.klasikShowAuthWarning) {
    window.klasikShowAuthWarning = (message = "Please log in or sign up to use Favorites.") => {
        let prompt = document.getElementById('customer-auth-prompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'customer-auth-prompt';
            prompt.className = 'customer-modal auth-warning-modal';
            prompt.hidden = true;
            prompt.innerHTML = `<section class="customer-modal-dialog auth-warning-dialog" role="alertdialog" aria-modal="true" aria-labelledby="customer-auth-warning-title">
                <button class="customer-modal-close" type="button" data-auth-close aria-label="Close">&times;</button>
                <h3 id="customer-auth-warning-title">Log in to continue</h3><p class="customer-auth-warning-message"></p>
                <div class="customer-dialog-actions"><a class="auth-warning-home" href="index.html">Back to Homepage</a><div><a class="button button-primary" href="login.html">Login</a><a class="button button-outline" href="signup.html">Sign Up</a></div></div>
            </section>`;
            prompt.addEventListener('click', (event) => { if (event.target === prompt || event.target.closest('[data-auth-close]')) prompt.hidden = true; });
            document.body.append(prompt);
        }
        prompt.querySelector('.customer-auth-warning-message').textContent = message;
        prompt.hidden = false;
        prompt.querySelector("a[href='login.html']")?.focus();
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('nav-login-btn');
    const signupBtn = document.getElementById('nav-signup-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const welcomeMsg = document.getElementById('nav-welcome-msg');
    const cartBadge = document.getElementById('cart-count-badge'); // 1. Find the cart badge

    // Ask Supabase if there is a logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    const page = window.location.pathname.split('/').pop().toLowerCase();
    const customerPages = new Set(['favorites.html', 'orders.html', 'placed-orders.html', 'order-history.html', 'customer.html']);
    const staffPages = new Set(['admin.html', 'barista.html']);
    if (!user && (customerPages.has(page) || staffPages.has(page))) {
        window.klasikShowAuthWarning(page === 'favorites.html'
            ? 'Please log in or sign up to use Favorites.'
            : 'Please log in or sign up to access your account.');
        return;
    }

    if (user && ['admin.html', 'barista.html'].includes(page)) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('email', user.email)
            .maybeSingle();
        const role = profile?.role?.toLowerCase();
        const allowed = page === 'admin.html' ? role === 'admin' : role === 'barista' || role === 'admin';
        if (profileError || !allowed) {
            window.location.replace('index.html');
            return;
        }
    }

    if (user) {
        // User is logged in: Hide login/signup
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        
        // Show logout and welcome message
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (welcomeMsg) {
            let displayName = user.user_metadata?.full_name
                || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ')
                || user.user_metadata?.name;
            if (!displayName && user.email) {
                const { data: profile, error: nameError } = await supabase.from('profiles')
                    .select('full_name')
                    .eq('email', user.email).maybeSingle();
                if (nameError) console.warn('Could not load customer name from profile.', nameError);
                displayName = profile?.full_name;
            }
            welcomeMsg.textContent = `Hello, ${displayName?.trim() || 'Customer'}!`;
            welcomeMsg.hidden = false;
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
                window.klasikNotify?.("Error logging out: " + error.message, "error");
            } else {
                window.location.reload(); 
            }
        });
    }
});
