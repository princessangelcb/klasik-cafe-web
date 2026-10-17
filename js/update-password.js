import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const updateForm = document.getElementById('update-password-form');

    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('new-password');
            const newPassword = passwordInput.value;

            const submitBtn = updateForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Updating...";
            submitBtn.disabled = true;

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                alert("Error updating password: " + error.message);
                submitBtn.textContent = "Update Password";
                submitBtn.disabled = false;
            } else {
                alert("Password successfully updated! You can now log in.");
                window.location.href = 'login.html';
            }
        });
    }
});