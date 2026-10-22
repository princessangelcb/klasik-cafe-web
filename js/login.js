import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // 1. Authenticate with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                window.klasikNotify?.("Login failed: " + error.message, "error");
                return;
            }

            // Look up the profile by its Auth user ID, which is the profiles
            // table's stable key. Looking up by email can miss the row if the
            // profile email differs or is null.
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .maybeSingle();

            if (profileError) {
                window.klasikNotify?.(`Signed in, but could not read your account role: ${profileError.message}`, 'error');
                return;
            }

            if (!profileData) {
                window.klasikNotify?.('Your account profile is missing. Please contact an administrator.', 'error');
                return;
            }

            const role = String(profileData.role || 'customer').trim().toLowerCase();

            // 3. Route to the right dashboard
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else if (role === 'barista') {
                window.location.href = 'barista.html';
            } else {
                window.location.href = 'index.html';
            }
        });
    }
});
