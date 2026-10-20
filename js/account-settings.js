import { supabase } from './supabase.js';
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = 'login.html'; return; }
  let { data: profile, error } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
  if ((!profile || error) && user.email) {
    const fallback = await supabase.from('profiles').select('full_name, role').eq('email', user.email).maybeSingle();
    if (fallback.data) { profile = fallback.data; error = fallback.error; }
  }
  if (error) console.warn('Could not load profile details.', error);
  const metadata = user.user_metadata || {};
  const metadataName = [metadata.first_name || metadata.firstName || metadata.given_name, metadata.last_name || metadata.lastName || metadata.family_name].filter(Boolean).join(' ')
    || metadata.full_name || metadata.fullName || metadata.name;
  let supplementalProfile = null;
  if (!metadataName && !profile?.full_name && user.email) {
    const supplemental = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle();
    supplementalProfile = supplemental.data;
    if (!supplementalProfile) {
      const byEmail = await supabase.from('profiles').select('first_name, last_name').eq('email', user.email).maybeSingle();
      supplementalProfile = byEmail.data;
    }
    if (!supplementalProfile?.first_name && !supplementalProfile?.last_name) {
      const named = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle();
      if (named.data) supplementalProfile = named.data;
      if (!named.data) {
        const namedByEmail = await supabase.from('profiles').select('name').eq('email', user.email).maybeSingle();
        if (namedByEmail.data) supplementalProfile = namedByEmail.data;
      }
    }
  }
  const displayName = metadataName
    || [supplementalProfile?.first_name, supplementalProfile?.last_name].filter(Boolean).join(' ')
    || profile?.full_name || supplementalProfile?.name || metadata.username || user.email?.split('@')[0] || 'Name not available';
  document.getElementById('profile-full-name').textContent = displayName;
  document.getElementById('profile-username').textContent = user.user_metadata?.username || user.email?.split('@')[0] || 'Not provided';
  document.getElementById('profile-email').textContent = user.email || 'Not provided';
  const rawRole = profile?.role || user.app_metadata?.role || user.user_metadata?.role || '';
  const role = /^(admin|barista|customer)$/i.test(String(rawRole)) ? rawRole : 'Customer';
  document.getElementById('profile-role').textContent = String(role).replace(/^\w/, letter => letter.toUpperCase());
  const modal = document.getElementById('password-modal');
  document.getElementById('change-password-open').addEventListener('click', () => { modal.hidden = false; document.getElementById('account-password').focus(); });
  modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-password-close]')) modal.hidden = true; });
  document.getElementById('profile-logout').addEventListener('click', async () => { const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) document.getElementById('account-message').textContent = `Could not log out: ${signOutError.message}`; else location.href = 'index.html'; });
  document.getElementById('password-form').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('account-password').value;
    const confirmation = document.getElementById('account-password-confirm').value;
    const message = document.getElementById('password-message');
    if (password !== confirmation) { message.textContent = 'Passwords do not match.'; return; }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    message.textContent = updateError ? `Could not update password: ${updateError.message}` : 'Password updated.';
    if (!updateError) event.target.reset();
  });
});
