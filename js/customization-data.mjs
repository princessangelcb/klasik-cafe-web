const LEGACY_ADDON_PRICES = {
  Oreo: 15,
  Biscoff: 25,
  'Cold Foam': 15,
  'Seasalt Cream': 15,
  'Extra Shot': 25,
  'Sauce/Syrup': 15,
  'Oat Milk Substitute': 25
};

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function normalizeState(value) {
  if (!isRecord(value)) return null;
  const addons = Array.isArray(value.addons) ? value.addons.map(addon => {
    const name = typeof addon === 'string' ? addon : String(addon?.name || '');
    if (!name) return null;
    const price = typeof addon === 'object' && Number.isFinite(Number(addon.price))
      ? Number(addon.price)
      : Number(LEGACY_ADDON_PRICES[name] || 0);
    return { name, price };
  }).filter(Boolean) : [];
  return {
    size: value.size || '',
    milk: value.milk || '',
    sweetness: value.sweetness || '',
    ice: value.ice || '',
    addons
  };
}

export function parseCustomizationData(value) {
  if (isRecord(value)) return normalizeState(value);
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    if (isRecord(parsed)) return normalizeState(parsed);
  } catch { /* Read pre-JSON customization strings below. */ }

  const fields = {};
  for (const part of value.split(/\s*(?:\u00b7|\u2022|\u00c2\u00b7)\s*/)) {
    const separator = part.indexOf(':');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim().toLowerCase();
    const content = part.slice(separator + 1).trim();
    if (key === 'add-ons' || key === 'addons') {
      fields.addons = content.split(',').map(name => name.trim()).filter(Boolean);
    } else if (['size', 'milk', 'sweetness', 'ice'].includes(key)) {
      fields[key] = content;
    }
  }
  return normalizeState(fields);
}

export function formatCustomizationData(value, standardLabel = 'Standard recipe') {
  const state = parseCustomizationData(value);
  if (!state) return standardLabel;
  const parts = [
    state.size && `Size: ${state.size}${state.size === 'Large' ? ' (22 oz, +₱25)' : state.size === 'Medium' ? ' (16 oz)' : ''}`,
    state.milk && `Milk: ${state.milk}${state.milk === 'Oat Milk' ? ' (+₱25)' : ''}`,
    state.sweetness && `Sweetness: ${state.sweetness}`,
    state.ice && `Ice: ${state.ice}`,
    state.addons.length && `Add-ons: ${state.addons.map(addon => `${addon.name} (+₱${addon.price})`).join(', ')}`
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : standardLabel;
}
