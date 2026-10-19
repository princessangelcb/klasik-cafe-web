import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('reset-email');
    const message = document.getElementById('forgot-password-message');
    const submitBtn = forgotForm?.querySelector('button[type="submit"]');

    if (!forgotForm || !emailInput || !message || !submitBtn) return;

    forgotForm.addEventListener('submit', async event => {
        event.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending link...';
        message.textContent = '';
        message.classList.remove('is-success');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://klasik-cafe-web.vercel.app/update-password.html'
            });
            if (error) throw error;

            message.textContent = 'If an account exists for that email, a reset link is on its way. Please check your email.';
            message.classList.add('is-success');
            forgotForm.reset();
        } catch (error) {
            console.error('Could not send password reset email.', error);
            message.textContent = error.message || 'Could not send the reset email. Please try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Send reset link <span aria-hidden="true">→</span>';
        }
    });
});
