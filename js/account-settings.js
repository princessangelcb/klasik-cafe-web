import { supabase } from './supabase.js';
document.addEventListener('DOMContentLoaded', async () => {
  const message = document.getElementById('account-message');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = 'login.html'; return; }
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  document.getElementById('account-name').value = profile?.full_name || user.user_metadata?.full_name || '';
  document.getElementById('account-email').value = user.email || '';
  document.getElementById('profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const full_name = document.getElementById('account-name').value.trim();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name }, { onConflict: 'id' });
    message.textContent = error ? `Could not save profile: ${error.message}` : 'Profile saved.';
  });
  document.getElementById('password-form').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('account-password').value;
    const { error } = await supabase.auth.updateUser({ password });
    message.textContent = error ? `Could not update password: ${error.message}` : 'Password updated.';
    if (!error) event.target.reset();
  });
});
