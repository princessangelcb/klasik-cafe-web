import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomizedFavoriteKey, parseFavoriteKey } from '../js/favorite-identity.mjs';
import { getFavoritePricing } from '../js/favorite-pricing.mjs';

test('regular and customized favorites use separate identities', () => {
  const regularFavorite = 'Cafe Latte';
  const customizedFavorite = buildCustomizedFavoriteKey('Cafe Latte', {
    size: 'Large', milk: 'Regular', sweetness: '50%', ice: 'Less Ice', addons: ['Oreo']
  });

  assert.notEqual(customizedFavorite, regularFavorite);
  assert.deepEqual(parseFavoriteKey(regularFavorite), {
    isCustomized: false, baseName: 'Cafe Latte', customizations: null
  });
  assert.deepEqual(parseFavoriteKey(customizedFavorite), {
    isCustomized: true,
    baseName: 'Cafe Latte',
    customizations: { size: 'Large', milk: 'Regular', sweetness: '50%', ice: 'Less Ice', addons: ['Oreo'] }
  });
});

test('removing either favorite leaves the other favorite intact', () => {
  const regularFavorite = 'Cafe Latte';
  const customizedFavorite = buildCustomizedFavoriteKey('Cafe Latte', { size: 'Large', addons: ['Oreo'] });
  const favorites = new Set([regularFavorite, customizedFavorite]);

  favorites.delete(customizedFavorite);
  assert.equal(favorites.has(regularFavorite), true);
  assert.equal(favorites.has(customizedFavorite), false);

  favorites.add(customizedFavorite);
  favorites.delete(regularFavorite);
  assert.equal(favorites.has(regularFavorite), false);
  assert.equal(favorites.has(customizedFavorite), true);
});

test('regular favorite total uses its menu price', () => {
  assert.deepEqual(getFavoritePricing({ isCustomized: false }, { price: 80 }), {
    unit: 80, quantity: 1, total: 80
  });
});

test('customized favorite adds size and add-on prices, then multiplies by quantity', () => {
  assert.deepEqual(getFavoritePricing({
    isCustomized: true,
    customizations: { size: 'Large', quantity: 2, addons: [{ name: 'Oreo', price: 15 }, { name: 'Biscoff', price: 25 }] }
  }, { price: 80 }), { unit: 145, quantity: 2, total: 290 });
});

test('older customized favorites with add-on names still calculate from configured add-on prices', () => {
  assert.deepEqual(getFavoritePricing({
    isCustomized: true,
    customizations: { size: 'Medium', addons: ['Oreo', 'Extra Shot'] }
  }, { price: 60 }), { unit: 100, quantity: 1, total: 100 });
});
