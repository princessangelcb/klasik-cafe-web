const legacyAddonPrices = {
  Oreo: 15,
  Biscoff: 25,
  "Cold Foam": 15,
  "Seasalt Cream": 15,
  "Extra Shot": 25,
  "Sauce/Syrup": 15,
  "Oat Milk Substitute": 25
};

export function getFavoritePricing(favorite, product) {
  if (product?.price == null) return null;
  const basePrice = Number(product?.price);
  if (!Number.isFinite(basePrice)) return null;
  if (!favorite?.isCustomized) return { unit: basePrice, quantity: 1, total: basePrice };

  const customizations = favorite.customizations || {};
  const addonsTotal = (customizations.addons || []).reduce((sum, addon) => {
    if (typeof addon === "string") return sum + Number(legacyAddonPrices[addon] || 0);
    return sum + Number(addon.price || 0);
  }, 0);
  const unit = basePrice + (customizations.size === "Large" ? 25 : 0) + (customizations.milk === "Oat Milk" ? 25 : 0) + addonsTotal;
  const quantity = Math.max(1, Number.parseInt(customizations.quantity, 10) || 1);
  return { unit, quantity, total: unit * quantity };
}
