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
                alert("Login failed: " + error.message);
                return;
            }

            // 2. Check the user's role from the 'profiles' table
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('email', email)
                .single();

            const role = profileData ? profileData.role.toLowerCase() : 'customer';

            // 3. Route to the right dashboard
            if (role === 'admin' || role === 'barista') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        });
    }
});