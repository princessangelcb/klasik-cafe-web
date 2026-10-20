"use strict";
import { supabase } from './supabase.js';
import { buildCustomizedFavoriteKey, parseFavoriteKey } from './favorite-identity.mjs';
import { getFavoritePricing } from './favorite-pricing.mjs';

document.addEventListener("DOMContentLoaded", async () => {
  const keys = {
    availability: "klasikCafeProductAvailability",
    products: "klasikCafeAdminProductsV2",
    bestSellers: "klasikCafeProductBestSellers"
  };
  
  const orderItems = document.getElementById("customer-order-items");
  const orderTotal = document.getElementById("customer-order-total");
  const cartBadge = document.getElementById("cart-count-badge");
  const placeOrderButton = document.getElementById("customer-place-order");
  
  const modal = document.getElementById("customer-customization-modal");
  const modalTitle = document.getElementById("customer-customize-title");
  const modalImage = document.getElementById("customer-modal-image");
  const modalBasePrice = document.getElementById("customer-modal-base-price");
  const modalClose = document.querySelector(".customer-modal-close");
  const modalAddButton = document.getElementById("customer-add-to-order");
  const modalFavoriteButton = document.getElementById("customer-modal-favorite");
  const modalTotal = document.getElementById("customer-modal-total");
  const modalQty = document.getElementById("customer-modal-qty");
  
  let activeProduct = null;
  let activeQuantity = 1;
  let favoriteSuggestionCatalog = [];
  let favoriteSuggestionCatalogLoaded = false;
  let currentUser = null;
  let favoriteNames = new Set();
  let favoritesLoaded = false;
  let favoriteQuantities = {};

  window.klasikShowAuthWarning = (message = "Please log in or sign up to use Favorites.") => {
    let prompt = document.getElementById("customer-auth-prompt");
    if (!prompt) {
      prompt = document.createElement("div");
      prompt.id = "customer-auth-prompt";
      prompt.className = "customer-modal auth-warning-modal";
      prompt.hidden = true;
      prompt.innerHTML = `<section class="customer-modal-dialog auth-warning-dialog" role="alertdialog" aria-modal="true" aria-labelledby="customer-auth-warning-title">
        <button class="customer-modal-close" type="button" data-auth-close aria-label="Close">&times;</button>
        <h3 id="customer-auth-warning-title">Log in to continue</h3>
        <p class="customer-auth-warning-message"></p>
        <div class="customer-dialog-actions"><a class="auth-warning-home" href="index.html">Back to Homepage</a><div><a class="button button-primary" href="login.html">Login</a><a class="button button-outline" href="signup.html">Sign Up</a></div></div>
      </section>`;
      prompt.addEventListener("click", (event) => { if (event.target === prompt || event.target.closest('[data-auth-close]')) prompt.hidden = true; });
      document.body.append(prompt);
    }
    prompt.querySelector(".customer-auth-warning-message").textContent = message;
    prompt.hidden = false;
    prompt.querySelector("a[href='login.html']")?.focus();
  };

  window.klasikGetCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) console.error("Unable to verify the current Supabase session.", error);
    currentUser = data?.user || null;
    return currentUser;
  };

  const read = (key, fallback) => {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    try { return JSON.parse(value); } catch (error) { return fallback; }
  };
  
  const money = (value) => `₱${Number(value || 0).toLocaleString("en-US", {minimumFractionDigits: 2})}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
  
  const getProductAvailability = () => read(keys.availability, {});
  const getCatalog = () => read(keys.products, []);

  const selectedAddons = () => Array.from(document.querySelectorAll("input[name='custom-addon']:checked"));
  const selectedSize = () => document.querySelector("input[name='custom-size']:checked")?.value || "Medium";
  const addonCost = () => selectedAddons().reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
  const selectedCustomizations = () => ({
    size: selectedSize(),
    milk: document.querySelector("input[name='custom-milk']:checked")?.value || "Regular",
    sweetness: document.querySelector("input[name='custom-sweetness']:checked")?.value || "0%",
    ice: document.querySelector("input[name='custom-ice']:checked")?.value || "Less Ice",
    addons: selectedAddons().map((input) => ({ name: input.value, price: Number(input.dataset.price || 0) })).sort((a, b) => a.name.localeCompare(b.name)),
    quantity: activeQuantity
  });
  const modalFavoriteKey = () => activeProduct
    ? buildCustomizedFavoriteKey(activeProduct.name, selectedCustomizations())
    : "";

  function applyProductCards() {
    const catalog = getCatalog();
    const availability = getProductAvailability();
    const bestSellers = read(keys.bestSellers, {});
    
    document.querySelectorAll(".product-card").forEach((card) => {
      const title = card.querySelector(".product-title h3");
      const info = card.querySelector(".product-info");
      const imageFrame = card.querySelector(".product-image");
      if (!title || !info || !imageFrame) return;
      
      const name = title.textContent.trim();
      const product = catalog.find((item) => item.name === name);
      const available = card.dataset.available !== undefined
        ? card.dataset.available !== "false"
        : product ? product.available !== false : availability[name] !== false;
      const bestSeller = card.dataset.bestSeller !== undefined
        ? card.dataset.bestSeller === "true"
        : Object.prototype.hasOwnProperty.call(bestSellers, name)
        ? bestSellers[name] === true
        : Boolean(product?.bestSeller);
        
      card.dataset.available = String(available);
      card.dataset.bestSeller = String(bestSeller);
      card.dataset.available = String(available);
      card.classList.toggle("product-unavailable", !available);
      const badge = imageFrame.querySelector(".best-seller-label");
      if (bestSeller && !badge) {
        const label = document.createElement("span");
        label.className = "best-seller-label";
        label.textContent = "BEST SELLER";
        imageFrame.append(label);
      } else if (!bestSeller) {
        badge?.remove();
      }

      let customizeButton = info.querySelector(".customer-product-button, .open-modal-btn");
      if (!customizeButton) {
        customizeButton = document.createElement("button");
        customizeButton.type = "button";
        customizeButton.className = "button button-primary button-wide customer-product-button";
        info.append(customizeButton);
      }
      customizeButton.classList.add("customer-product-button");
      customizeButton.textContent = available ? "Add to Cart" : "Unavailable";
      customizeButton.disabled = !available;

      let availabilityMessage = info.querySelector(".product-availability");
      if (!available && !availabilityMessage) {
        availabilityMessage = document.createElement("p");
        availabilityMessage.className = "product-availability unavailable";
        availabilityMessage.textContent = "Not Available";
        customizeButton.before(availabilityMessage);
      } else if (available) {
        availabilityMessage?.remove();
      }

      if (!imageFrame.querySelector(".product-favorite-toggle")) {
        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = "product-favorite-toggle";
        favoriteButton.innerHTML = '<svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 5.9l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';
        imageFrame.append(favoriteButton);
      }
    });
    syncFavoriteButtons();
  }

  // --- SUPABASE CLOUD SYNC LOGIC ---

  // Update Cart Badge from Supabase
  async function updateCartBadge() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !cartBadge) return;
      const { data: cartItems } = await supabase.from('cart').select('quantity').eq('user_id', user.id);
      if (cartItems) {
          const count = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
          cartBadge.textContent = String(count);
      }
  }

  // Toggle Favorite in Supabase
  async function toggleFavorite(product) {
    const user = await window.klasikGetCurrentUser();
    if (!user) {
      window.klasikShowAuthWarning("Please log in or create an account to add items to your favorites.");
      return;
    }
    if (!favoritesLoaded) await loadFavorites();
    const name = String(product?.name || "").trim();
    if (!name) return;
    const favoriteKey = product?.favoriteKey || (product?.customizations
      ? buildCustomizedFavoriteKey(name, product.customizations)
      : name);
    const wasSaved = favoriteNames.has(favoriteKey);
    const result = wasSaved
      ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_name", favoriteKey)
      : await supabase.from("favorites").insert([{ user_id: user.id, item_name: favoriteKey }]);
    if (result.error) {
      console.error("Could not update favorites in Supabase.", result.error);
      window.klasikNotify?.("Your favorite could not be updated. Please try again.", "error");
      return;
    }
    if (wasSaved) favoriteNames.delete(favoriteKey);
    else favoriteNames.add(favoriteKey);
    favoritesLoaded = true;
    syncFavoriteButtons();
    renderFavorites();
    updateModalFavoriteButton();
    window.klasikNotify?.(wasSaved ? `${name} removed from Favorites.` : `${name} added to Favorites.`);
  }

  function syncFavoriteButtons() {
    document.querySelectorAll(".product-favorite-toggle").forEach((button) => {
      const name = button.closest(".product-card")?.querySelector(".product-title h3")?.textContent.trim();
      const saved = Boolean(name && favoriteNames.has(name));
      button.classList.toggle("is-favorite", saved);
      button.setAttribute("aria-pressed", String(saved));
      button.setAttribute("aria-label", `${saved ? "Remove" : "Add"} ${name || "product"} ${saved ? "from" : "to"} Favorites`);
      button.title = saved ? "Remove from Favorites" : "Add to Favorites";
    });
  }

  function updateModalFavoriteButton() {
    if (!modalFavoriteButton || !activeProduct) return;
    const saved = favoriteNames.has(modalFavoriteKey());
    modalFavoriteButton.textContent = saved ? "♥ Remove customized drink from Favorites" : "♡ Save customized drink to Favorites";
    modalFavoriteButton.setAttribute("aria-pressed", String(saved));
    modalFavoriteButton.setAttribute("aria-label", saved ? "Remove customized drink from Favorites" : "Save customized drink to Favorites");
  }

  async function loadFavorites() {
    const favoritesList = document.getElementById("customer-favorites-list");
    const user = currentUser || await window.klasikGetCurrentUser();
    if (!user) {
      favoriteNames = new Set();
      favoritesLoaded = false;
      if (favoritesList) favoritesList.replaceChildren();
      if (favoritesList) window.klasikShowAuthWarning();
      syncFavoriteButtons();
      return;
    }
    const savedFavoriteQuantities = read(`klasikCafeFavoriteQuantities:${user.id}`, {});
    favoriteQuantities = savedFavoriteQuantities && typeof savedFavoriteQuantities === "object" && !Array.isArray(savedFavoriteQuantities)
      ? savedFavoriteQuantities : {};
    const { data, error } = await supabase.from("favorites").select("item_name").eq("user_id", user.id);
    if (error) {
      favoritesLoaded = false;
      console.error("Could not load Favorites from Supabase.", error);
      if (favoritesList) favoritesList.innerHTML = '<p class="customer-empty-state">Favorites could not be loaded. Please try again.</p>';
      return;
    }
    favoriteNames = new Set((data || []).map((item) => item.item_name).filter(Boolean));
    favoritesLoaded = true;
    syncFavoriteButtons();
    renderFavorites();
  }

  async function renderFavorites() {
    const favoritesList = document.getElementById("customer-favorites-list");
    if (!favoritesList || !currentUser) return;
    const favoriteKeys = Array.from(favoriteNames);
    if (!favoriteKeys.length) {
      favoritesList.innerHTML = '<p class="customer-empty-state">No favorites saved yet. Browse the <a href="menu.html">menu</a> and tap a heart to save one.</p>';
      return;
    }
    const productsNames = [...new Set(favoriteKeys.map((key) => parseFavoriteKey(key).baseName))];
    const { data: products, error } = await supabase.from("menu_items").select("item_name, price, image_url, is_available").in("item_name", productsNames);
    if (error) console.error("Could not load favorite product details.", error);
    const productByName = new Map((products || []).map((product) => [product.item_name, product]));
    const favoriteRows = favoriteKeys.map((favoriteKey) => {
      const favorite = parseFavoriteKey(favoriteKey);
      const name = favorite.baseName;
      const product = productByName.get(name);
      const image = product?.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="" loading="lazy">` : "";
      const pricing = getFavoritePricing(favorite, product);
      const defaultQuantity = favorite.isCustomized ? favorite.customizations.quantity : 1;
      const quantity = Math.max(1, Number.parseInt(favoriteQuantities[favoriteKey] ?? defaultQuantity, 10) || 1);
      const price = pricing
        ? `<span class="customer-favorite-price">Unit ${formatFavoriteMoney(pricing.unit)} / Qty ${quantity} / Total ${formatFavoriteMoney(pricing.unit * quantity)}</span>`
        : `<span class="customer-favorite-price-unavailable">Price unavailable</span>`;
      const customizationDetails = favorite.isCustomized
        ? `<span class="customer-favorite-type">Customized Drink</span><small class="customer-favorite-customizations">${escapeHtml(formatCustomizations(favorite.customizations))}</small>`
        : `<span class="customer-favorite-type customer-favorite-type-regular">Regular drink</span>`;
      return `<article class="customer-favorite-item${favorite.isCustomized ? ' is-customized-favorite' : ''}">${image}<div class="customer-favorite-info"><strong>${escapeHtml(name)}</strong>${customizationDetails}${price}
        <div class="customer-inline-qty" aria-label="Change favorite quantity for ${escapeHtml(name)}">
          <button type="button" data-favorite-quantity="decrease" data-favorite-key="${escapeHtml(favoriteKey)}" aria-label="Decrease quantity">-</button>
          <span>${quantity}</span>
          <button type="button" data-favorite-quantity="increase" data-favorite-key="${escapeHtml(favoriteKey)}" aria-label="Increase quantity">+</button>
        </div></div>
        <div class="customer-favorite-actions"><a class="button button-outline button-small" href="menu.html">View menu</a><button class="customer-favorite-remove" type="button" data-favorite-remove="${escapeHtml(favoriteKey)}">Remove</button></div>
      </article>`;
    }).join("");
    favoritesList.innerHTML = favoriteRows;
  }
  function formatCustomizations(customizations = {}) {
    const addonNames = (customizations.addons || []).map((addon) => typeof addon === "string" ? addon : addon.name).filter(Boolean);
    const parts = [
      customizations.size && `Size: ${customizations.size}`,
      customizations.milk && `Milk: ${customizations.milk}`,
      customizations.sweetness && `Sweetness: ${customizations.sweetness}`,
      customizations.ice && `Ice: ${customizations.ice}`,
      addonNames.length && `Add-ons: ${addonNames.join(", ")}`
    ].filter(Boolean);
    return parts.join(" · ");
  }

  const formatFavoriteMoney = (amount) => `\u20B1${Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function selectedBasePrice() {
    return Number(activeProduct?.price || 0) + (selectedSize() === "Large" ? 25 : 0) + addonCost();
  }

  function updateModalTotal() {
    if (activeProduct && modalTotal) modalTotal.textContent = money(selectedBasePrice() * activeQuantity);
  }

  function openCustomization(productName, productPrice, productImage = "") {
    if (!modal) return;
    activeProduct = { name: productName, price: Number(productPrice), image: productImage };
    if (modalTitle) modalTitle.textContent = productName;
    if (modalBasePrice) modalBasePrice.textContent = money(Number(productPrice));
    if (modalImage) {
      modalImage.hidden = !productImage;
      modalImage.alt = productName ? `${productName} drink` : "Selected menu item";
      if (productImage) modalImage.src = productImage;
    }
    activeQuantity = 1;
    document.querySelectorAll("input[name='custom-addon']").forEach((input) => { input.checked = false; });
    const medium = document.querySelector("input[name='custom-size'][value='Medium']");
    if (medium) medium.checked = true;
    const defaultSweetness = document.querySelector("input[name='custom-sweetness'][value='0%']");
    const defaultIce = document.querySelector("input[name='custom-ice'][value='Less Ice']");
    if (defaultSweetness) defaultSweetness.checked = true;
    if (defaultIce) defaultIce.checked = true;
    if (modalQty) modalQty.textContent = "1";
    modal.hidden = false;
    const guestNote = document.getElementById('customer-guest-action-note');
    if (guestNote) guestNote.hidden = Boolean(currentUser);
    if (modalAddButton) modalAddButton.disabled = false;
    updateModalTotal();
  }

  async function checkProductAvailability(productName) {
    console.log("Checking availability for:", productName);
    const normalizedName = String(productName ?? "").trim();
    if (!normalizedName) {
      console.error("Availability check received an empty product name.");
      window.klasikNotify?.("Availability could not be confirmed. Please try again.", "error");
      return false;
    }

    let data;
    let error;
    try {
      ({ data, error } = await supabase.from("menu_items")
        .select("*")
        .ilike("item_name", normalizedName)
        .limit(2));
      console.log("Supabase raw response:", data, error);
    } catch (queryError) {
      console.error("Availability query threw a network or client error:", queryError);
      window.klasikNotify?.("Availability could not be confirmed. Please try again.", "error");
      return false;
    }

    if (error) {
      console.error("Supabase availability query failed (check network, table access, and RLS):", error);
      window.klasikNotify?.("Availability could not be confirmed. Please try again.", "error");
      return false;
    }
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No menu item matched this product name:", normalizedName);
      window.klasikNotify?.("Availability could not be confirmed. Please try again.", "error");
      return false;
    }
    if (data.length > 1) {
      console.error("Availability lookup matched multiple menu items; item_name should be unique ignoring case:", data);
      window.klasikNotify?.("Availability could not be confirmed. Please contact the café.", "error");
      return false;
    }

    const item = data[0];
    const isAvailable = item.is_available === true
      || item.available === true
      || String(item.is_available).trim().toLowerCase() === "true"
      || String(item.available).trim().toLowerCase() === "true"
      || String(item.is_available).trim() === "1"
      || String(item.available).trim() === "1"
      || String(item.status ?? "").trim().toLowerCase() === "available";
    if (!isAvailable) {
      document.querySelectorAll(".product-card").forEach((card) => {
        if (card.querySelector(".product-title h3")?.textContent.trim().toLowerCase() === normalizedName.toLowerCase()) {
          card.dataset.available = "false";
          card.querySelector(".customer-product-button, .open-modal-btn")?.setAttribute("disabled", "");
          const info = card.querySelector(".product-info");
          if (info && !info.querySelector(".product-availability")) {
            const message = document.createElement("p");
            message.className = "product-availability unavailable";
            message.textContent = "Not Available";
            info.querySelector(".customer-product-button, .open-modal-btn")?.before(message);
          }
        }
      });
      window.klasikNotify?.("This product is not available right now.", "error");
      return false;
    }
    return true;
  }

  async function addPastryDirectly(product, button) {
    const user = await window.klasikGetCurrentUser();
    currentUser = user;
    if (!user) { window.klasikShowAuthWarning("Please log in or sign up to add items to your cart."); return; }
    button.disabled = true;
    const { error } = await supabase.from("cart").insert([{ item_name: product.name, price: product.price, quantity: 1, customizations: "", user_id: user.id, user_email: user.email }]);
    button.disabled = false;
    if (error) { window.klasikNotify?.(`Could not add item: ${error.message}`, "error"); return; }
    window.klasikNotify?.(`${product.name} added to your cart.`);
    if (cartBadge) cartBadge.textContent = String((Number(cartBadge.textContent) || 0) + 1);
  }

  function closeCustomization() {
    if (modal) modal.hidden = true;
    activeProduct = null;
    activeQuantity = 1;
    if (modalQty) modalQty.textContent = "1";
  }

  // SUPABASE REVIEW FETCH
  async function renderReviews() {
    const list = document.getElementById("customer-review-list");
    if (!list) return;
    
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
      
    const emptyMessage = list.closest(".review-showcase") ? "Be the first to share your KLASIK CAFE experience." : "No reviews have been submitted yet.";
    
    if (error) {
        console.error("Could not load customer reviews.", error);
        list.innerHTML = '<p class="customer-empty-state">Reviews could not be loaded right now. Please try again later.</p>';
        return;
    }
    if (!reviews || reviews.length === 0) {
        list.innerHTML = `<p class="customer-empty-state">${emptyMessage}</p>`;
        return;
    }

    let namedReviews = reviews;
    const reviewUserIds = [...new Set(reviews.map((review) => review.user_id).filter(Boolean))];
    if (reviewUserIds.length) {
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, full_name, first_name, last_name").in("id", reviewUserIds);
      if (profileError) console.warn("Could not resolve full names for reviews; showing saved customer names.", profileError);
      else {
        const fullNames = new Map((profiles || []).map((profile) => [String(profile.id), [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.full_name]).filter(([, name]) => name));
        namedReviews = reviews.map((review) => ({ ...review, customer_name: fullNames.get(String(review.user_id)) || review.customer_name || "Customer" }));
      }
    }

    list.innerHTML = namedReviews.map((review) => {
        const dateStr = new Date(review.created_at).toISOString().slice(0, 10);
        return `<article class="customer-review-item">
            <div class="customer-review-head">
                <strong>${escapeHtml(review.customer_name)}</strong>
                <span>${"★".repeat(Number(review.rating))}${"☆".repeat(Math.max(0, 5 - Number(review.rating)))}</span>
            </div>
            <p>${escapeHtml(review.comment)}</p>
            <small>${escapeHtml(dateStr)}</small>
        </article>`;
    }).join("");
  }

  // SUPABASE SUGGESTION FETCH
  async function renderSuggestions() {
    const list = document.getElementById("customer-suggestion-history");
    if (!list) return;
    if (!currentUser) {
      list.innerHTML = '<p class="customer-empty-state">Log in to view your submitted suggestions.</p>';
      return;
    }
    
    const { data: suggestions, error } = await supabase
      .from("suggestions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load your suggestions.", error);
        list.innerHTML = '<p class="customer-empty-state">Your suggestions could not be loaded.</p>';
        return;
    }
    if (!suggestions || suggestions.length === 0) {
        list.innerHTML = '';
        return;
    }

    const currentCustomerName = await customerFullName(currentUser);
    list.innerHTML = suggestions.map((entry) => {
        const dateStr = new Date(entry.created_at).toISOString().slice(0, 10);
        const savedSuggestion = String(entry.suggestion || '');
        const suggestionText = savedSuggestion.includes('\n\n') ? savedSuggestion.slice(savedSuggestion.indexOf('\n\n') + 2) : savedSuggestion;
        return `<article class="customer-history-item">
            <strong>${escapeHtml(entry.customer_name || currentCustomerName)}</strong>
            <p>${escapeHtml(suggestionText)}</p>
            <small>${escapeHtml(dateStr)}</small>
        </article>`;
    }).join("");
  }

  applyProductCards();
  window.addEventListener("klasik-menu-ready", applyProductCards);
  modalClose?.addEventListener("click", closeCustomization);
  modal?.addEventListener("click", (event) => { if (event.target === modal) closeCustomization(); });

  document.addEventListener("click", async (event) => {
    const heart = event.target.closest(".product-favorite-toggle");
    if (heart) {
      const name = heart.closest(".product-card")?.querySelector(".product-title h3")?.textContent.trim();
      if (name) await toggleFavorite({ name });
      return;
    }
    const removeFavorite = event.target.closest("[data-favorite-remove]");
    if (removeFavorite) {
      const favoriteKey = removeFavorite.dataset.favoriteRemove;
      const favorite = parseFavoriteKey(favoriteKey);
      await toggleFavorite({ name: favorite.baseName, favoriteKey });
      return;
    }
    const favoriteQuantityButton = event.target.closest("[data-favorite-quantity]");
    if (favoriteQuantityButton) {
      const favoriteKey = favoriteQuantityButton.dataset.favoriteKey;
      const favorite = parseFavoriteKey(favoriteKey);
      const defaultQuantity = favorite.isCustomized ? favorite.customizations.quantity : 1;
      const currentQuantity = Math.max(1, Number.parseInt(favoriteQuantities[favoriteKey] ?? defaultQuantity, 10) || 1);
      favoriteQuantities[favoriteKey] = Math.max(1, currentQuantity + (favoriteQuantityButton.dataset.favoriteQuantity === "increase" ? 1 : -1));
      try { localStorage.setItem(`klasikCafeFavoriteQuantities:${currentUser.id}`, JSON.stringify(favoriteQuantities)); }
      catch (error) { console.warn("Could not save favorite quantities in this browser.", error); }
      renderFavorites();
      return;
    }
    const productButton = event.target.closest(".customer-product-button, .open-modal-btn");
    if (productButton && !productButton.disabled) {
      const user = await window.klasikGetCurrentUser();
      currentUser = user;
      const card = productButton.closest(".product-card");
      const name = card?.querySelector(".product-title h3")?.textContent.trim() || productButton.dataset.name;
      const priceText = card?.querySelector(".product-title > span")?.textContent || productButton.dataset.price;
      const price = Number(String(priceText || "").replace(/[^\d.]/g, ""));
      if (name && await checkProductAvailability(name)) {
        activeProduct = { name, price, image: card?.querySelector(".product-image img")?.src || "" };
        const category = `${card?.dataset.category || ""} ${card?.dataset.subcategory || ""}`.toLowerCase();
        if (/pastr|cookie|cheesecake|smores|s'mores/.test(category)) {
          await addPastryDirectly(activeProduct, productButton);
          activeProduct = null;
          return;
        }
        openCustomization(name, price, activeProduct.image);
        updateModalFavoriteButton();
      }
      return;
    }
    const qtyButton = event.target.closest(".customer-qty-button");
    if (qtyButton) {
      activeQuantity = qtyButton.dataset.qtyAction === "increase" ? activeQuantity + 1 : Math.max(1, activeQuantity - 1);
      if (modalQty) modalQty.textContent = String(activeQuantity);
      updateModalTotal();
      updateModalFavoriteButton();
      return;
    }
    if (event.target.closest("#customer-modal-favorite") && activeProduct) {
      await toggleFavorite({ ...activeProduct, customizations: selectedCustomizations() });
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("input[name='custom-addon'], input[name='custom-size'], input[name='custom-milk'], input[name='custom-sweetness'], input[name='custom-ice']")) {
      updateModalTotal();
      updateModalFavoriteButton();
    }
  });

  const ratingInput = document.getElementById("customer-review-rating");
  const reviewInput = document.getElementById("customer-review-comment");
  const reviewMessage = document.getElementById("customer-review-message");
  const submitReview = document.getElementById("customer-submit-review");
  const starButtons = document.querySelectorAll(".customer-star");
  const ratingLabel = document.getElementById("customer-rating-label");
  const suggestionInput = document.getElementById("customer-suggestion-message");
  const submitSuggestion = document.getElementById("customer-submit-suggestion");
  const suggestionStatus = document.getElementById("customer-suggestion-status");

  const refreshFeedbackButtons = () => {
    if (submitReview) submitReview.disabled = !Number(ratingInput?.value) || !reviewInput?.value.trim();
    if (submitSuggestion) submitSuggestion.disabled = !suggestionInput?.value.trim();
  };

  const selectRating = (value) => {
    const rating = Math.min(5, Math.max(1, Number(value)));
    if (ratingInput) ratingInput.value = String(rating);
    starButtons.forEach((star) => {
      const selected = Number(star.dataset.rating) <= rating;
      star.classList.toggle("is-active", selected);
      star.setAttribute("aria-checked", String(Number(star.dataset.rating) === rating));
      star.tabIndex = Number(star.dataset.rating) === rating ? 0 : -1;
    });
    if (ratingLabel) ratingLabel.textContent = `${rating} out of 5 stars selected`;
    refreshFeedbackButtons();
  };
  starButtons.forEach((button) => {
    button.textContent = "\u2605";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.tabIndex = button.dataset.rating === "1" ? 0 : -1;
    button.addEventListener("click", () => selectRating(button.dataset.rating));
    button.addEventListener("keydown", (event) => {
      const current = Number(button.dataset.rating);
      const next = event.key === "ArrowRight" || event.key === "ArrowUp" ? Math.min(5, current + 1)
        : event.key === "ArrowLeft" || event.key === "ArrowDown" ? Math.max(1, current - 1)
        : event.key === "Home" ? 1 : event.key === "End" ? 5 : null;
      if (next === null) return;
      event.preventDefault();
      selectRating(next);
      starButtons[next - 1]?.focus();
    });
  });
  [reviewInput, suggestionInput].forEach((field) => field?.addEventListener("input", refreshFeedbackButtons));

  const customerFullName = async (user) => {
    const metadata = user?.user_metadata || {};
    const fullName = [metadata.first_name, metadata.last_name].filter(Boolean).join(" ") || metadata.full_name || metadata.name;
    if (fullName?.trim()) return fullName.trim();
    if (user?.email) {
      const { data: profile, error } = await supabase.from("profiles").select("full_name").eq("email", user.email).maybeSingle();
      if (error) console.warn("Could not load the customer's full name from profiles.", error);
      if (profile?.full_name?.trim()) return profile.full_name.trim();
    }
    return "Customer";
  };

  submitReview?.addEventListener("click", async () => {
    const user = await window.klasikGetCurrentUser();
    if (!user) return window.klasikShowAuthWarning("Please log in or sign up to leave a review or suggestion.");
    const rating = Number(ratingInput?.value || 0);
    const comment = reviewInput?.value.trim() || "";
    if (!rating || !comment) return;

    submitReview.disabled = true;
    submitReview.textContent = "Submitting...";
    if (reviewMessage) reviewMessage.textContent = "";
    try {
      const customerName = await customerFullName(user);
      const { error } = await supabase.from("reviews").insert([{
        user_id: user.id,
        customer_name: customerName,
        rating,
        comment
      }]);
      if (error) throw error;
      reviewInput.value = "";
      ratingInput.value = "0";
      starButtons.forEach((star) => {
        star.classList.remove("is-active");
        star.setAttribute("aria-checked", "false");
      });
      if (ratingLabel) ratingLabel.textContent = "No rating selected";
      if (reviewMessage) reviewMessage.textContent = "Thank you for your review.";
      await renderReviews();
    } catch (error) {
      console.error("Could not submit customer review.", error);
      if (reviewMessage) reviewMessage.textContent = `Review could not be submitted: ${error.message || "Please try again."}`;
    } finally {
      submitReview.textContent = "Submit Review";
      refreshFeedbackButtons();
    }
  });

  submitSuggestion?.addEventListener("click", async () => {
    const user = await window.klasikGetCurrentUser();
    if (!user) {
      window.klasikShowAuthWarning("Please log in or sign up to leave a review or suggestion.");
      return;
    }
    const suggestion = suggestionInput?.value.trim() || "";
    if (!suggestion) return;

    submitSuggestion.disabled = true;
    submitSuggestion.textContent = "Submitting...";
    if (suggestionStatus) suggestionStatus.textContent = "";
    try {
      const customerName = await customerFullName(user);
      const { error } = await supabase.from("suggestions").insert([{
        user_id: user.id,
        customer_name: customerName,
        suggestion
      }]);
      if (error) throw error;
      suggestionInput.value = "";
      if (suggestionStatus) suggestionStatus.textContent = "Thank you for your suggestion.";
      await renderSuggestions();
    } catch (error) {
      console.error("Could not submit customer suggestion.", error);
      if (suggestionStatus) suggestionStatus.textContent = `Suggestion could not be submitted: ${error.message || "Please try again."}`;
    } finally {
      submitSuggestion.textContent = "Submit Suggestion";
      refreshFeedbackButtons();
    }
  });

  window.addEventListener("storage", (event) => {
    if ([keys.availability, keys.products, keys.bestSellers].includes(event.key)) applyProductCards();
  });

  refreshFeedbackButtons();
  await window.klasikGetCurrentUser();
  await Promise.all([renderReviews(), renderSuggestions()]);
  if (currentUser) {
    await updateCartBadge();
    await loadFavorites();
  }
});
