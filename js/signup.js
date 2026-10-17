import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Look for the newly named form
    const signupForm = document.getElementById('real-signup-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            e.stopImmediatePropagation(); // 2. Forcefully blocks the template's fake animation

            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            // 3. Send to Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                alert("Error signing up: " + error.message);
            } else {
                alert("Real Success! Your account is officially in the database.");
                window.location.href = "login.html"; 
            }
        });
    }
});