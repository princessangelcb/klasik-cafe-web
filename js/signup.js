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
            const firstName = document.getElementById('first-name')?.value.trim() || '';
            const lastName = document.getElementById('last-name')?.value.trim() || '';
            const username = document.getElementById('signup-username')?.value.trim() || '';
            const phone = document.getElementById('phone')?.value.trim() || '';
            const confirmPassword = document.getElementById('confirm-password')?.value || '';

            if (!firstName) {
                window.klasikNotify?.('Please enter your first name.', 'error');
                document.getElementById('first-name')?.focus();
                return;
            }
            if (!lastName) {
                window.klasikNotify?.('Please enter your last name.', 'error');
                document.getElementById('last-name')?.focus();
                return;
            }
            if (!signupForm.checkValidity()) {
                signupForm.reportValidity();
                return;
            }
            if (password !== confirmPassword) {
                window.klasikNotify?.('Your passwords do not match.', 'error');
                return;
            }

            // 3. Send to Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim(), username, phone } }
            });

            if (error) {
                window.klasikNotify?.("Error signing up: " + error.message, "error");
            } else {
                window.klasikNotify?.("Your account has been created. You can now log in.");
                window.setTimeout(() => { window.location.href = "login.html"; }, 1000);
            }
        });
    }
});
