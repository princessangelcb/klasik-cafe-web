import { supabase } from './supabase.js';
import { isValidPassword } from './password-validation.mjs';

document.addEventListener('DOMContentLoaded', () => {
    const updateForm = document.getElementById('update-password-form');
    const passwordInput = document.getElementById('new-password');
    const confirmInput = document.getElementById('confirm-new-password');
    const message = document.getElementById('update-password-message');
    const submitBtn = updateForm?.querySelector('button[type="submit"]');

    if (!updateForm || !passwordInput || !confirmInput || !message || !submitBtn) return;

    updateForm.addEventListener('submit', async event => {
        event.preventDefault();
        const newPassword = passwordInput.value;

        if (!isValidPassword(newPassword)) {
            message.textContent = 'Use at least 8 characters with letters and numbers, no spaces, and no URLs.';
            message.classList.remove('is-success');
            passwordInput.focus();
            return;
        }
        if (newPassword !== confirmInput.value) {
            message.textContent = 'Your passwords do not match.';
            message.classList.remove('is-success');
            confirmInput.focus();
            return;
        }
        if (!updateForm.reportValidity()) return;

        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;
        message.textContent = '';
        message.classList.remove('is-success');

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            message.textContent = 'Password updated. Redirecting to login...';
            message.classList.add('is-success');
            window.setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        } catch (error) {
            console.error('Could not update password.', error);
            message.textContent = error.message || 'Could not update the password. Please reopen the reset link and try again.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        }
    });
});
