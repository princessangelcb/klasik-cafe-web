import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgot-password-form');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('reset-email');
            const email = emailInput.value.trim().toLowerCase();

            const submitBtn = forgotForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Sending Link...";
            submitBtn.disabled = true;

            // Trigger Supabase password recovery email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password.html',
            });

            if (error) {
                alert("Error: " + error.message);
                submitBtn.textContent = "Send Reset Instructions";
                submitBtn.disabled = false;
            } else {
                alert("Success! Check your email for the password reset link.");
                forgotForm.reset();
                submitBtn.textContent = "Send Reset Instructions";
                submitBtn.disabled = false;
            }
        });
    }
});