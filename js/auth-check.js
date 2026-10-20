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
    const profileBtn = document.getElementById('nav-profile-btn');
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

    const loadProfile = async (columns = 'full_name, role') => {
        let { data, error } = await supabase.from('profiles').select(columns).eq('id', user.id).maybeSingle();
        if ((!data || error) && user.email) {
            const fallback = await supabase.from('profiles').select(columns).eq('email', user.email).maybeSingle();
            if (fallback.data) { data = fallback.data; error = fallback.error; }
        }
        return { data, error };
    };

    if (user && ['admin.html', 'barista.html'].includes(page)) {
        const { data: profile, error: profileError } = await loadProfile('role');
        if (profileError) console.warn('Could not load the staff role from the profile row.', profileError);
        const role = String(profile?.role || user.app_metadata?.role || '').toLowerCase();
        const allowed = page === 'admin.html' ? role === 'admin' : role === 'barista' || role === 'admin';
        if (!allowed) {
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
        if (profileBtn) profileBtn.hidden = false;
        let { data: accountProfile, error: accountProfileError } = await loadProfile('full_name, role, first_name, last_name');
        if (accountProfileError) {
            console.warn('Could not load all profile name fields for the navigation menu.', accountProfileError);
            const basicProfile = await loadProfile('full_name, role');
            accountProfile = basicProfile.data;
        }
        const metadata = user.user_metadata || {};
        let nameProfile = accountProfile;
        if (!nameProfile?.first_name && !nameProfile?.last_name) {
            const supplemental = await loadProfile('first_name, last_name');
            if (supplemental.data) nameProfile = supplemental.data;
        }
        if (!nameProfile?.first_name && !nameProfile?.last_name && !metadata.first_name && !metadata.last_name && !metadata.given_name && !metadata.family_name) {
            const namedProfile = await loadProfile('name');
            if (namedProfile.data) nameProfile = namedProfile.data;
        }
        const profileFirstLast = [nameProfile?.first_name, nameProfile?.last_name].filter(Boolean).join(' ');
        const metadataFirstLast = [metadata.first_name || metadata.firstName || metadata.given_name, metadata.last_name || metadata.lastName || metadata.family_name].filter(Boolean).join(' ');
        const profileName = profileFirstLast || metadataFirstLast
            || accountProfile?.full_name || metadata.full_name || metadata.fullName || metadata.name || nameProfile?.name
            || metadata.username || metadata.preferred_username || user.email?.split('@')[0] || 'Name not available';
        const setProfileText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value || 'Not provided'; };
        setProfileText('nav-profile-name', profileName);
        setProfileText('nav-profile-username', user.user_metadata?.username || user.email?.split('@')[0]);
        setProfileText('nav-profile-email', user.email);
        const rawRole = accountProfile?.role || user.app_metadata?.role || user.user_metadata?.role || '';
        const accountRole = /^(admin|barista|customer)$/i.test(String(rawRole)) ? rawRole : 'Customer';
        setProfileText('nav-profile-role', String(accountRole).replace(/^\w/, letter => letter.toUpperCase()));
        document.getElementById('profile-password-form')?.addEventListener('submit', async event => {
            event.preventDefault();
            const password = document.getElementById('profile-new-password').value;
            const confirmation = document.getElementById('profile-confirm-password').value;
            const message = document.getElementById('profile-password-message');
            const passwordRule = /^(?=.*[A-Za-z])(?=.*[0-9])\S{8,}$/;
            message.classList.remove('is-success');
            if (!passwordRule.test(password)) { message.textContent = 'Use at least 8 characters, including a letter and a number, with no spaces.'; return; }
            if (password !== confirmation) { message.textContent = 'Passwords do not match.'; return; }
            const submit = event.currentTarget.querySelector('button[type="submit"]');
            submit.disabled = true;
            let updateError;
            try {
                ({ error: updateError } = await supabase.auth.updateUser({ password }));
            } catch (error) {
                updateError = error;
            } finally {
                submit.disabled = false;
            }
            message.textContent = updateError ? `Could not update password: ${updateError.message || 'Please try again.'}` : 'Your password has been updated successfully.';
            if (!updateError) {
                message.classList.add('is-success');
                event.currentTarget.reset();
                event.currentTarget.querySelectorAll('[data-password-toggle]').forEach(button => {
                    const input = document.getElementById(button.dataset.passwordToggle);
                    if (input) input.type = 'password';
                    button.classList.remove('is-visible');
                    button.setAttribute('aria-pressed', 'false');
                    button.setAttribute('aria-label', 'Show password');
                });
            }
        });
        if (welcomeMsg) {
            welcomeMsg.textContent = `Hello, ${String(profileName).trim()}!`;
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
    if (!user && profileBtn) profileBtn.hidden = true;

    // Make the Logout button work
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                window.klasikNotify?.("Error logging out: " + error.message, "error");
            } else {
                window.location.href = 'login.html';
            }
        });
    }
});
