import { supabase } from './supabase.js';

const MENU_CATEGORIES = [
  { id: 'best-sellers', label: 'Best Sellers', special: true },
  { id: 'coffee', label: 'Coffee', children: [['iced-coffee', 'Iced Coffee'], ['hot-coffee', 'Hot Coffee'], ['espesyal', 'Espesyal']] },
  { id: 'non-coffee', label: 'Non Coffee', children: [['non-coffee', 'Non Coffee'], ['espesyal', 'Espesyal']] },
  { id: 'matcha', label: 'Matcha Series' },
  { id: 'pastries', label: 'Pastry', children: [['smores', 'Smores'], ['cookies', 'Cookies'], ['cheesecakes', 'Cheesecakes']] },
  { id: 'snacks', label: 'Snacks' },
  { id: 'pasta', label: 'Pasta' }
];

const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const normalizeMain = value => {
  const key = normalize(value);
  return ({ noncoffee: 'non-coffee', 'matcha-series': 'matcha', addons: 'add-ons', pastry: 'pastries', iced: 'coffee', 'iced-coffee': 'coffee', hot: 'coffee', 'hot-coffee': 'coffee', especial: 'coffee', espesyal: 'coffee', especial2: 'non-coffee', espesyal2: 'non-coffee', 'espesyal-2': 'non-coffee', smores: 'pastries', cookies: 'pastries', cheesecakes: 'pastries' })[key] || key;
};
const normalizeSub = value => {
  const key = normalize(value);
  return ({ especial: 'espesyal', 'espesyal2': 'espesyal', 'espesyal-2': 'espesyal', 'iced': 'iced-coffee', 'hot': 'hot-coffee', 'noncoffee': 'non-coffee' })[key] || key;
};
const productSlug = value => String(value ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => `&#8369;${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('menu-content');
  if (!root) return;

  let products = [];
  let activeMain = 'coffee';
  let activeSub = 'iced-coffee';
  let expandedCategory = 'coffee';
  let searchText = '';

  root.innerHTML = `<section class="menu-page-section menu-browser">
    <div class="page-width">
      <header class="menu-page-heading"><h1>Menu</h1><p>A few cafe favorites, made fresh. Choose a<br class="desktop-only"> category to explore more.</p></header>
      <div class="menu-search"><label for="menu-search-input">Search the menu</label><div class="menu-search-field">
        <span class="menu-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.6"></circle><path d="m16 16 4.5 4.5"></path></svg></span>
        <input id="menu-search-input" type="search" placeholder="Search drinks, pastries, and more..." autocomplete="off">
        <div class="menu-search-feedback" aria-live="polite"></div>
      </div></div>
      <nav class="menu-category-nav" aria-label="Filter menu by category"><div class="menu-main-categories"></div></nav>
      <div class="menu-results-heading"><h2 class="menu-current-title"></h2><span class="menu-result-count"></span></div>
      <div class="product-grid menu-product-grid" aria-live="polite"></div>
    </div>
  </section>`;

  const mainNav = root.querySelector('.menu-main-categories');
  const grid = root.querySelector('.menu-product-grid');
  const search = root.querySelector('#menu-search-input');
  const searchFeedback = root.querySelector('.menu-search-feedback');

  function renderCategories() {
    mainNav.innerHTML = MENU_CATEGORIES.map(category => {
      const children = category.children || [];
      const expanded = expandedCategory === category.id && children.length > 0;
      return `<div class="menu-category-option${expanded ? ' is-expanded' : ''}">
        <button class="menu-filter-button${category.id === activeMain ? ' is-active' : ''}" type="button" data-main-category="${category.id}" aria-pressed="${category.id === activeMain}"${children.length ? ` aria-expanded="${expanded}"` : ''}>${category.label}</button>
        ${children.length ? `<div class="menu-subcategories" aria-label="${category.label} subcategories"${expanded ? '' : ' hidden'}>${children.map(([id, label]) => `<button class="menu-subfilter-button${category.id === activeMain && id === activeSub ? ' is-active' : ''}" type="button" data-main-category="${category.id}" data-sub-category="${id}" aria-pressed="${category.id === activeMain && id === activeSub}">${label}</button>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
    root.querySelector('.menu-category-nav').classList.toggle('has-expanded-category', Boolean(expandedCategory));
  }

  function getProductMenuCategory(item) {
    const storedMain = normalizeMain(item.category);
    const legacySubcategory = ({ iced: 'iced-coffee', 'iced-coffee': 'iced-coffee', hot: 'hot-coffee', 'hot-coffee': 'hot-coffee', especial: 'espesyal', especial2: 'espesyal', 'espesyal2': 'espesyal', 'espesyal-2': 'espesyal', smores: 'smores', cookies: 'cookies', cheesecakes: 'cheesecakes' })[normalize(item.category)];
    const sub = normalizeSub(item.subcategory || legacySubcategory || (normalize(item.category) === 'noncoffee' ? 'non-coffee' : ''));
    return { main: storedMain, sub };
  }

  function productSuggestionList(query) {
    const wanted = normalize(query);
    if (wanted.length < 2) return [];
    const distance = (left, right) => {
      const row = Array.from({ length: right.length + 1 }, (_, index) => index);
      for (let i = 1; i <= left.length; i += 1) {
        let previous = row[0];
        row[0] = i;
        for (let j = 1; j <= right.length; j += 1) {
          const old = row[j];
          row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
          previous = old;
        }
      }
      return row[right.length];
    };
    return products.map(item => {
      const name = normalize(item.item_name);
      const words = name.split('-');
      const closest = Math.min(...words.map(word => distance(wanted, word)));
      const contains = name.includes(wanted) || wanted.includes(name);
      const limit = wanted.length < 6 ? 1 : 2;
      return { item, score: contains ? 0 : closest, limit };
    }).filter(candidate => candidate.score <= candidate.limit)
      .sort((a, b) => a.score - b.score || String(a.item.item_name).localeCompare(String(b.item.item_name)))
      .slice(0, 4).map(candidate => candidate.item);
  }

  function renderProducts() {
    const category = MENU_CATEGORIES.find(item => item.id === activeMain);
    const query = searchText.trim().toLowerCase();
    const filtered = products.filter(item => {
      const { main: itemMain, sub: itemSub } = getProductMenuCategory(item);
      const categoryMatch = category?.special ? item.is_best_seller === true : itemMain === activeMain;
      const subMatch = category?.special || !category?.children?.length || !activeSub || itemSub === activeSub;
      const textMatch = !query || [item.item_name, item.description, item.category, item.subcategory].some(value => String(value || '').toLowerCase().includes(query));
      return categoryMatch && subMatch && textMatch;
    });
    const activeSubLabel = category?.children?.find(([id]) => id === activeSub)?.[1];
    root.querySelector('.menu-current-title').textContent = activeSubLabel || category?.label || 'Menu';
    root.querySelector('.menu-result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
    grid.innerHTML = filtered.length ? filtered.map(item => `<article id="${escapeHtml(productSlug(item.item_name))}" class="product-card" data-product-id="${escapeHtml(item.id)}" data-product-name="${escapeHtml(item.item_name)}" data-category="${escapeHtml(item.category)}" data-subcategory="${escapeHtml(item.subcategory || '')}" data-best-seller="${item.is_best_seller === true}" data-available="${item.is_available !== false}">
      <div class="product-image"><span class="product-category">${escapeHtml((item.subcategory || item.category || '').toUpperCase())}</span>${item.is_best_seller ? '<span class="best-seller-label">BEST SELLER</span>' : ''}<img src="${escapeHtml(item.image_url || 'images/products/coffee/amerikano.jpg')}" alt="${escapeHtml(item.item_name)}" loading="lazy"></div>
      <div class="product-info"><div class="product-title"><h3>${escapeHtml(item.item_name)}</h3><span>${money(item.price)}</span></div><p>${escapeHtml(item.description || '')}</p></div>
    </article>`).join('') : query ? '' : '<p class="menu-empty-state">No items in this category yet. Please check back soon.</p>';
    if (query && filtered.length === 0) {
      const suggestions = productSuggestionList(query);
      searchFeedback.innerHTML = `<p class="menu-search-empty">No results for "${escapeHtml(searchText)}".${suggestions.length ? ' Did you mean:' : ' Try a different search.'}</p>${suggestions.length ? `<div class="menu-search-suggestions">${suggestions.map(item => `<button type="button" class="menu-search-suggestion" data-suggestion-product="${escapeHtml(item.id)}">${escapeHtml(item.item_name)}<span aria-hidden="true">&#8599;</span></button>`).join('')}</div>` : ''}`;
    } else searchFeedback.replaceChildren();
    window.dispatchEvent(new Event('klasik-menu-ready'));
  }

  mainNav.addEventListener('click', event => {
    const button = event.target.closest('[data-main-category]');
    if (!button) return;
    const clickedCategory = button.dataset.mainCategory;
    if (button.hasAttribute('data-sub-category')) {
      activeMain = clickedCategory;
      activeSub = button.dataset.subCategory;
    } else {
      activeMain = clickedCategory;
      activeSub = '';
      expandedCategory = expandedCategory === clickedCategory ? '' : clickedCategory;
    }
    renderCategories();
    renderProducts();
  });
  searchFeedback.addEventListener('click', event => {
    const suggestion = event.target.closest('[data-suggestion-product]');
    if (!suggestion) return;
    const item = products.find(product => String(product.id) === suggestion.dataset.suggestionProduct);
    if (!item) return;
    const destination = getProductMenuCategory(item);
    activeMain = MENU_CATEGORIES.some(category => category.id === destination.main) ? destination.main : 'best-sellers';
    activeSub = destination.sub;
    expandedCategory = activeMain;
    searchText = '';
    search.value = '';
    renderCategories();
    renderProducts();
    requestAnimationFrame(() => {
      const card = [...grid.querySelectorAll('.product-card')].find(element => element.dataset.productId === String(item.id));
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
  search.addEventListener('input', () => { searchText = search.value; renderProducts(); });

  renderCategories();
  const { data, error } = await supabase.from('menu_items').select('*').order('category').order('item_name');
  if (error) {
    console.error('Could not load menu items.', error);
    grid.innerHTML = '<p class="menu-empty-state">The menu could not be loaded right now. Please try again later.</p>';
    return;
  }
  products = data || [];
  const requestedSlug = decodeURIComponent(window.location.hash.slice(1));
  const requestedProduct = requestedSlug && products.find(item => productSlug(item.item_name) === requestedSlug);
  if (requestedProduct) {
    const destination = getProductMenuCategory(requestedProduct);
    activeMain = MENU_CATEGORIES.some(category => category.id === destination.main) ? destination.main : 'best-sellers';
    activeSub = destination.sub;
    expandedCategory = activeMain;
    renderCategories();
  }
  renderProducts();
  if (requestedProduct) requestAnimationFrame(() => document.getElementById(requestedSlug)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

  supabase.channel('menu-items-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async () => {
      const refreshed = await supabase.from('menu_items').select('*').order('category').order('item_name');
      if (!refreshed.error) { products = refreshed.data || []; renderProducts(); }
      else console.error('Could not refresh menu after a change.', refreshed.error);
    })
    .subscribe();
});
