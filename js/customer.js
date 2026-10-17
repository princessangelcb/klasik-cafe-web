"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const keys = {
    cart: "klasikCafeCustomerCart",
    orders: "klasikCafeOrders",
    reviews: "klasikCafeCustomerReviews",
    suggestions: "klasikCafeCustomerSuggestions",
    session: "klasikCafeCustomerSession",
    availability: "klasikCafeProductAvailability",
    products: "klasikCafeAdminProductsV2",
    bestSellers: "klasikCafeProductBestSellers"
  };
  const orderItems = document.getElementById("customer-order-items");
  const orderTotal = document.getElementById("customer-order-total");
  const cartBadge = document.getElementById("cart-count-badge");
  const specialRequestInput = document.getElementById("customer-special-request");
  const placeOrderButton = document.getElementById("customer-place-order");
  const historyList = document.getElementById("customer-order-history");
  const placedList = document.getElementById("customer-placed-orders");
  const reviewList = document.getElementById("customer-review-list");
  const suggestionHistory = document.getElementById("customer-suggestion-history");
  const modal = document.getElementById("customer-customization-modal");
  const modalClose = document.querySelector(".customer-modal-close");
  const modalAddButton = document.getElementById("customer-add-to-order");
  const modalFavoriteButton = document.getElementById("customer-modal-favorite");
  const modalTotal = document.getElementById("customer-modal-total");
  const modalQty = document.getElementById("customer-modal-qty");
  const reviewRatingInput = document.getElementById("customer-review-rating");
  const reviewComment = document.getElementById("customer-review-comment");
  const reviewMessage = document.getElementById("customer-review-message");
  const submitReviewButton = document.getElementById("customer-submit-review");
  const suggestionSubject = document.getElementById("customer-suggestion-subject");
  const suggestionInput = document.getElementById("customer-suggestion-message");
  const submitSuggestionButton = document.getElementById("customer-submit-suggestion");
  const suggestionStatus = document.getElementById("customer-suggestion-status");
  const starButtons = document.querySelectorAll(".customer-star");
  let activeProduct = null;
  let activeQuantity = 1;
  let favoriteSuggestionCatalog = [];

  const read = (key, fallback) => {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Could not read ${key} from browser storage.`, error);
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const money = (value) => `₱${Number(value || 0).toLocaleString("en-US")}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
  const getCart = () => read(keys.cart, []);
  const getOrders = () => read(keys.orders, []);
  const getSignedInCustomer = () => read(keys.session, null);
  const getProductAvailability = () => read(keys.availability, {});
  const getCatalog = () => read(keys.products, []);
  const getFavoriteKey = () => {
    const customer = getSignedInCustomer();
    const identity = customer?.customerKey || customer?.identity;
    return identity ? `klasikCafeFavorites:${String(identity).trim().toLowerCase()}` : null;
  };
  const getFavorites = () => {
    const key = getFavoriteKey();
    return key ? read(key, []) : [];
  };
  const selectedAddons = () => Array.from(document.querySelectorAll("input[name='custom-addon']:checked"));
  const selectedSize = () => document.querySelector("input[name='custom-size']:checked")?.value || "Medium";
  const addonCost = () => selectedAddons().reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);

  function updateCartBadge() {
    const count = getCart().reduce((total, item) => total + Number(item.quantity || 1), 0);
    if (cartBadge) cartBadge.textContent = String(count);
  }

  function getItemUnitPrice(item) {
    if (Number.isFinite(Number(item.unitPrice))) return Number(item.unitPrice);
    const quantity = Number(item.quantity || 1);
    return quantity ? Number(item.total || 0) / quantity : 0;
  }

  function syncFavoriteButtons() {
    const favorites = getFavorites();
    document.querySelectorAll(".product-favorite-toggle").forEach((button) => {
      const name = button.closest(".product-card")?.querySelector(".product-title h3")?.textContent.trim();
      const active = Boolean(name && favorites.some((item) => item.name === name));
      button.classList.toggle("is-favorite", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", `${active ? "Remove" : "Add"} ${name || "item"} ${active ? "from" : "to"} favorites`);
      button.textContent = active ? "♥" : "♡";
    });
  }

  function applyProductCards() {
    const catalog = getCatalog();
    const availability = getProductAvailability();
    const bestSellers = read(keys.bestSellers, {});
    document.querySelectorAll(".product-card").forEach((card) => {
      const title = card.querySelector(".product-title h3");
      const info = card.querySelector(".product-info");
      const image = card.querySelector(".product-image img");
      const imageFrame = card.querySelector(".product-image");
      if (!title || !info || !imageFrame) return;
      const name = title.textContent.trim();
      const product = catalog.find((item) => item.name === name);
      if (product) {
        const price = card.querySelector(".product-title > span");
        if (price) price.textContent = money(product.price);
        if (image && product.image && image.getAttribute("src") !== product.image) {
          image.src = product.image;
          image.removeAttribute("data-fallback");
          image.dataset.fallbackTried = "true";
        }
      }
      const available = product ? product.available !== false : availability[name] !== false;
      const bestSeller = Object.prototype.hasOwnProperty.call(bestSellers, name)
        ? bestSellers[name] === true
        : Boolean(product?.bestSeller);
      card.dataset.available = String(available);
      card.dataset.bestSeller = String(bestSeller);
      card.classList.toggle("product-unavailable", !available);
      info.querySelectorAll(".product-link").forEach((element) => element.remove());

      let customizeButton = info.querySelector(".customer-product-button");
      if (!customizeButton) {
        customizeButton = document.createElement("button");
        customizeButton.type = "button";
        customizeButton.className = "customer-product-button";
        info.append(customizeButton);
      }
      customizeButton.textContent = available ? "Customize" : "Unavailable";
      customizeButton.disabled = !available;
      customizeButton.setAttribute("aria-label", `${available ? "Customize" : "Unavailable"} ${name}`);

      let badge = imageFrame.querySelector(".best-seller-label");
      if (bestSeller && !badge) {
        badge = document.createElement("span");
        badge.className = "best-seller-label";
        badge.textContent = "Best Seller";
        imageFrame.append(badge);
      } else if (!bestSeller) {
        badge?.remove();
      }
      if (!imageFrame.querySelector(".product-favorite-toggle")) {
        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = "product-favorite-toggle";
        imageFrame.append(favoriteButton);
      }
    });
    syncFavoriteButtons();
  }

  function toggleFavorite(product) {
    const key = getFavoriteKey();
    if (!key) {
      window.klasikNotify?.("Please log in before saving favorites.", "error");
      return;
    }
    const favorites = getFavorites();
    const found = favorites.some((item) => item.name === product.name);
    const next = found ? favorites.filter((item) => item.name !== product.name) : [
      ...favorites,
      { name: product.name, price: Number(product.price || 0), image: product.image || "" }
    ];
    try {
      write(key, next);
    } catch (error) {
      console.error("Could not save customer favorites.", error);
      window.klasikNotify?.("Your favorite could not be saved in browser storage.", "error");
      return;
    }
    renderFavorites();
    syncFavoriteButtons();
    if (modalFavoriteButton && activeProduct?.name === product.name) {
      modalFavoriteButton.textContent = found ? "♡ Save to Favorites" : "♥ Remove from Favorites";
      modalFavoriteButton.setAttribute("aria-pressed", String(!found));
    }
  }

  function renderFavorites() {
    const favoritesList = document.getElementById("customer-favorites-list");
    if (!favoritesList) return;
    const availability = getProductAvailability();
    const catalog = getCatalog();
    const menuCatalog = catalog.length ? catalog : favoriteSuggestionCatalog;
    if (!getFavoriteKey()) {
      favoritesList.innerHTML = `<p class="customer-empty-state">Please <a href="login.html">log in</a> to view and save your favorites.</p>${renderFavoriteSuggestions([], menuCatalog, availability, false)}`;
      return;
    }
    const favorites = getFavorites();
    if (!favorites.length) {
      favoritesList.innerHTML = `<p class="customer-empty-state">No favorites saved yet. Choose a menu pick below to save it here.</p>${renderFavoriteSuggestions(favorites, menuCatalog, availability, true)}`;
      return;
    }
    favoritesList.innerHTML = favorites.map((item) => {
      const product = catalog.find((entry) => entry.name === item.name);
      const available = product?.available !== false && availability[item.name] !== false;
      return `<article class="customer-favorite-item">
        ${(product?.image || item.image) ? `<img src="${escapeHtml(product?.image || item.image)}" alt="" loading="lazy">` : ""}
        <div class="customer-favorite-info"><strong>${escapeHtml(item.name)}</strong><span>${money(product?.price ?? item.price)}</span></div>
        <div class="customer-favorite-actions">
          <button class="button button-primary button-small" type="button" data-favorite-add="${escapeHtml(item.name)}" ${available ? "" : "disabled"}>${available ? "Add to Cart" : "Unavailable"}</button>
          <button class="customer-favorite-remove" type="button" data-favorite-remove="${escapeHtml(item.name)}" aria-label="Remove ${escapeHtml(item.name)} from favorites">Remove</button>
        </div>
      </article>`;
    }).join("");
  }

  function renderFavoriteSuggestions(favorites, catalog, availability, canSave) {
    const savedNames = new Set(favorites.map((item) => item.name));
    const suggestions = catalog
      .filter((product) => product?.name && !savedNames.has(product.name))
      .filter((product) => product.available !== false && availability[product.name] !== false)
      .slice(0, 3);
    if (!suggestions.length) {
      return '<p class="customer-empty-state">Browse the <a href="menu.html">menu</a> and tap a heart to save a favorite.</p>';
    }
    return `<div class="customer-favorite-suggestions">
      <p class="customer-favorite-suggestions-title">Available menu picks</p>
      ${suggestions.map((product) => `<article class="customer-favorite-item customer-favorite-suggestion">
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="" loading="lazy">` : ""}
        <div class="customer-favorite-info"><strong>${escapeHtml(product.name)}</strong><span>${money(product.price)}</span></div>
        <div class="customer-favorite-actions">
          ${canSave
            ? `<button class="button button-outline button-small" type="button" data-favorite-save="${escapeHtml(product.name)}">Save Favorite</button>`
            : '<a class="button button-outline button-small" href="login.html">Log in to save</a>'}
        </div>
      </article>`).join("")}
    </div>`;
  }

  async function loadFavoriteSuggestionCatalog() {
    const favoritesList = document.getElementById("customer-favorites-list");
    if (!favoritesList || getCatalog().length) return;
    try {
      const response = await fetch("index.html");
      if (!response.ok) throw new Error(`Menu catalog request failed (${response.status}).`);
      const source = new DOMParser().parseFromString(await response.text(), "text/html");
      favoriteSuggestionCatalog = Array.from(source.querySelectorAll("#favorites .product-card")).map((card) => {
        const title = card.querySelector(".product-title h3");
        const price = card.querySelector(".product-title span");
        if (!title || !price) return null;
        return {
          name: title.textContent.trim(),
          price: Number(price.textContent.replace(/[^\d.]/g, "")),
          image: card.querySelector(".product-image img")?.getAttribute("src") || "",
          available: true
        };
      }).filter(Boolean);
      renderFavorites();
    } catch (error) {
      console.error("Could not load menu picks for the empty Favorites panel.", error);
      window.klasikNotify?.("Menu picks could not be loaded. Please refresh the page to try again.", "error");
    }
  }

  function renderCart() {
    const cart = getCart();
    updateCartBadge();
    if (!orderItems) return;
    if (!cart.length) {
      orderItems.innerHTML = '<p class="customer-empty-state">Your cart is empty.</p>';
      if (orderTotal) orderTotal.textContent = "₱0";
      if (placeOrderButton) placeOrderButton.disabled = true;
      return;
    }

    orderItems.innerHTML = cart.map((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = getItemUnitPrice(item);
      return `
        <article class="customer-order-item">
          <div class="customer-order-main"><strong>${escapeHtml(item.name)}</strong><span>${quantity}x</span></div>
          <div class="customer-order-detail">${escapeHtml(item.customizations || "Medium")}</div>
          <div class="customer-order-detail">Add-ons: ${escapeHtml((item.addOns || []).join(", ") || "None")}</div>
          <div class="customer-order-control-row">
            <div class="customer-inline-qty">
              <button type="button" data-cart-qty="decrease" data-cart-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">−</button>
              <span>${quantity}</span>
              <button type="button" data-cart-qty="increase" data-cart-id="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="customer-order-remove" data-cart-remove="${escapeHtml(item.id)}">Remove</button>
          </div>
          <div class="customer-order-price">${money(unitPrice * quantity)}</div>
        </article>`;
    }).join("");
    const total = cart.reduce((sum, item) => sum + getItemUnitPrice(item) * Number(item.quantity || 1), 0);
    if (orderTotal) orderTotal.textContent = money(total);
    if (placeOrderButton) placeOrderButton.disabled = false;
  }

  function updateCartItemQuantity(itemId, change) {
    const cart = getCart();
    const item = cart.find((entry) => String(entry.id) === String(itemId));
    if (!item) return;
    item.quantity = Math.max(1, Number(item.quantity || 1) + change);
    item.total = Number((getItemUnitPrice(item) * item.quantity).toFixed(2));
    write(keys.cart, cart);
    renderCart();
  }

  function removeCartItem(itemId) {
    write(keys.cart, getCart().filter((item) => String(item.id) !== String(itemId)));
    renderCart();
  }

  function orderMarkup(order) {
    const statusClass = String(order.status || "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
    return `
      <article class="customer-history-item">
        <div class="customer-history-head">
          <strong>Order #${escapeHtml(order.id)}</strong>
          <span class="customer-status customer-status-${statusClass}">${escapeHtml(order.status)}</span>
        </div>
        <p><span>Date:</span> ${escapeHtml(order.date || "")}</p>
        ${order.items.map((item) => `
          <p>${Number(item.quantity || 1)}x ${escapeHtml(item.name)}</p>
          <p>${escapeHtml(item.customizations || "Medium")}</p>
          <p>Add-ons: ${escapeHtml((item.addOns || []).join(", ") || "None")}</p>
        `).join("")}
        ${order.specialRequest ? `<p>Special request: ${escapeHtml(order.specialRequest)}</p>` : ""}
        <p class="customer-history-total">Total: ${money(order.total)}</p>
      </article>`;
  }

  function renderOrders() {
    const orders = getOrders().slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    if (placedList) {
      const placed = orders.filter((order) => order.status === "Awaiting Confirmation");
      placedList.innerHTML = placed.length
        ? placed.map(orderMarkup).join("")
        : '<p class="customer-empty-state">No placed orders are awaiting confirmation.</p>';
    }
    if (historyList) {
      const history = orders.filter((order) => order.status !== "Awaiting Confirmation");
      historyList.innerHTML = history.length
        ? history.map(orderMarkup).join("")
        : '<p class="customer-empty-state">No confirmed orders yet.</p>';
    }
  }

  function renderReviews() {
    if (!reviewList) return;
    const reviews = read(keys.reviews, []);
    reviewList.innerHTML = reviews.length ? reviews.map((review) => `
      <article class="customer-review-item">
        <div class="customer-review-head"><strong>${escapeHtml(review.customer)}</strong><span>${"★".repeat(Number(review.rating))}${"☆".repeat(Math.max(0, 5 - Number(review.rating)))}</span></div>
        <p>${escapeHtml(review.comment)}</p><small>${escapeHtml(review.date)}</small>
      </article>`).join("") : '<p class="customer-empty-state">No reviews have been submitted yet.</p>';
  }

  function renderSuggestions() {
    if (!suggestionHistory) return;
    const suggestions = read(keys.suggestions, []);
    suggestionHistory.innerHTML = suggestions.map((item) => `
      <article class="customer-history-item"><strong>${escapeHtml(item.subject)}</strong><p>${escapeHtml(item.suggestion)}</p><small>${escapeHtml(item.date)}</small></article>
    `).join("");
  }

  function updateFeedbackControls() {
    const signedIn = Boolean(getSignedInCustomer());
    const reviewReady = Boolean(Number(reviewRatingInput?.value) && reviewComment?.value.trim());
    const suggestionReady = Boolean(suggestionSubject?.value.trim() && suggestionInput?.value.trim());
    if (submitReviewButton) submitReviewButton.disabled = !signedIn || !reviewReady;
    if (submitSuggestionButton) submitSuggestionButton.disabled = !signedIn || !suggestionReady;
    if (!signedIn) {
      if (reviewMessage) reviewMessage.innerHTML = 'Please <a href="login.html">log in</a> to submit a review.';
      if (suggestionStatus) suggestionStatus.innerHTML = 'Please <a href="login.html">log in</a> to submit a suggestion.';
    }
  }

  function selectedBasePrice() {
    return Number(activeProduct?.price || 0) + (selectedSize() === "Large" ? 25 : 0) + addonCost();
  }

  function updateModalTotal() {
    if (activeProduct && modalTotal) modalTotal.textContent = money(selectedBasePrice() * activeQuantity);
  }

  function openCustomization(productName, productPrice, productImage = "") {
    if (!modal) return;
    activeProduct = { name: productName, price: Number(productPrice), image: productImage };
    activeQuantity = 1;
    document.querySelectorAll("input[name='custom-addon']").forEach((input) => { input.checked = false; });
    const medium = document.querySelector("input[name='custom-size'][value='Medium']");
    if (medium) medium.checked = true;
    const defaultSweetness = document.querySelector("input[name='custom-sweetness'][value='0%']");
    const defaultIce = document.querySelector("input[name='custom-ice'][value='Less Ice']");
    if (defaultSweetness) defaultSweetness.checked = true;
    if (defaultIce) defaultIce.checked = true;
    if (modalQty) modalQty.textContent = "1";
    if (modalFavoriteButton) {
      const saved = getFavorites().some((item) => item.name === productName);
      modalFavoriteButton.textContent = saved ? "♥ Remove from Favorites" : "♡ Save to Favorites";
      modalFavoriteButton.setAttribute("aria-pressed", String(saved));
    }
    modal.hidden = false;
    updateModalTotal();
  }

  function closeCustomization() {
    if (modal) modal.hidden = true;
    activeProduct = null;
    activeQuantity = 1;
    if (modalQty) modalQty.textContent = "1";
  }

  function getConfirmationDialog() {
    let dialog = document.getElementById("customer-order-dialog");
    if (dialog) return dialog;
    dialog = document.createElement("div");
    dialog.id = "customer-order-dialog";
    dialog.className = "customer-modal";
    dialog.hidden = true;
    dialog.innerHTML = '<section class="customer-modal-dialog customer-order-dialog-content" role="dialog" aria-modal="true"></section>';
    document.body.appendChild(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-dialog-cancel]")) dialog.hidden = true;
      if (event.target.closest("[data-dialog-confirm]")) placeConfirmedOrder(dialog);
      const removeButton = event.target.closest("[data-dialog-remove]");
      if (removeButton) {
        dialog.hidden = true;
        removeCartItem(removeButton.dataset.dialogRemove);
        window.klasikNotify?.("Item removed from your order.");
      }
      if (event.target.closest("[data-dialog-close]")) dialog.hidden = true;
    });
    return dialog;
  }

  function renderConfirmation() {
    const cart = getCart();
    if (!cart.length) return;
    const dialog = getConfirmationDialog();
    const content = dialog.querySelector(".customer-order-dialog-content");
    const total = cart.reduce((sum, item) => sum + getItemUnitPrice(item) * Number(item.quantity || 1), 0);
    content.innerHTML = `
      <h3>Confirm Your <em>Order</em></h3>
      <p>Please review your items before placing the order.</p>
      <div class="customer-confirm-items">${cart.map((item) => `
        <div class="customer-confirm-item"><strong>${Number(item.quantity || 1)}x ${escapeHtml(item.name)}</strong><span>${money(getItemUnitPrice(item) * Number(item.quantity || 1))}</span>
        <small>${escapeHtml(item.customizations)} · Add-ons: ${escapeHtml((item.addOns || []).join(", ") || "None")}</small></div>
      `).join("")}</div>
      ${specialRequestInput?.value.trim() ? `<p class="customer-order-detail">Special request: ${escapeHtml(specialRequestInput.value.trim())}</p>` : ""}
      <div class="customer-total-row"><span>Total</span><strong>${money(total)}</strong></div>
      <div class="customer-dialog-actions"><button class="button button-outline" type="button" data-dialog-cancel>Go Back &amp; Edit</button><button class="button button-primary" type="button" data-dialog-confirm>Confirm Order</button></div>`;
    dialog.hidden = false;
  }

  function makeOrderNumber(orders) {
    const date = new Date();
    const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    let code;
    do {
      const token = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
      code = `KC-${day}-${token}`;
    } while (orders.some((order) => order.id === code));
    return code;
  }

  function placeConfirmedOrder(dialog) {
    const cart = getCart();
    if (!cart.length) {
      dialog.hidden = true;
      return;
    }
    const orders = getOrders();
    const order = {
      id: makeOrderNumber(orders),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      customer: getSignedInCustomer()?.name || "Guest",
      items: cart.map((item) => ({
        name: item.name, quantity: Number(item.quantity || 1), customizations: item.customizations,
        addOns: Array.isArray(item.addOns) ? item.addOns : [], unitPrice: getItemUnitPrice(item)
      })),
      specialRequest: specialRequestInput?.value.trim() || "",
      total: cart.reduce((sum, item) => sum + getItemUnitPrice(item) * Number(item.quantity || 1), 0),
      status: "Awaiting Confirmation"
    };
    orders.unshift(order);
    write(keys.orders, orders);
    write(keys.cart, []);
    if (specialRequestInput) specialRequestInput.value = "";
    renderCart();
    renderOrders();
    const content = dialog.querySelector(".customer-order-dialog-content");
    content.innerHTML = `
      <h3>Order <em>Receipt</em></h3>
      <div class="customer-receipt">
        <strong>KLASIK CAFE</strong><span>Order #${escapeHtml(order.id)}</span><span>Date: ${escapeHtml(order.date)}</span>
        <hr>${order.items.map((item) => `<div class="customer-receipt-item"><strong>${item.quantity}x ${escapeHtml(item.name)}</strong><span>${money(item.unitPrice * item.quantity)}</span><small>${escapeHtml(item.customizations)} · Add-ons: ${escapeHtml(item.addOns.join(", ") || "None")}</small></div>`).join("")}
        ${order.specialRequest ? `<p>Special request: ${escapeHtml(order.specialRequest)}</p>` : ""}
        <hr><div class="customer-total-row"><span>Total</span><strong>${money(order.total)}</strong></div>
        <p class="customer-note">Please present your order receipt or order code at the café when claiming your order.</p>
      </div>
      <div class="customer-dialog-actions"><button class="button button-outline" type="button" data-dialog-close>Close</button><a class="button button-primary" href="placed-orders.html">View Placed Orders</a></div>`;
  }

  applyProductCards();
  window.addEventListener("klasik-menu-ready", applyProductCards);

  modalClose?.addEventListener("click", closeCustomization);
  modal?.addEventListener("click", (event) => { if (event.target === modal) closeCustomization(); });
  document.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest(".product-favorite-toggle");
    if (favoriteButton) {
      const card = favoriteButton.closest(".product-card");
      const name = card?.querySelector(".product-title h3")?.textContent.trim();
      const price = Number(card?.querySelector(".product-title > span")?.textContent.replace(/[^\d.]/g, "")) || 0;
      if (name) toggleFavorite({ name, price, image: card.querySelector(".product-image img")?.src || "" });
      return;
    }
    const productButton = event.target.closest(".customer-product-button");
    if (productButton && !productButton.disabled) {
      const card = productButton.closest(".product-card");
      const title = card?.querySelector(".product-title h3");
      const priceText = card?.querySelector(".product-title span");
      if (title && priceText) {
        const amount = Number(priceText.textContent.replace(/[^\d.]/g, "")) || 0;
        openCustomization(title.textContent.trim(), amount, card?.querySelector(".product-image img")?.src || "");
      }
      return;
    }
    const quantityButton = event.target.closest(".customer-qty-button");
    if (quantityButton) {
      activeQuantity = quantityButton.dataset.qtyAction === "increase" ? activeQuantity + 1 : Math.max(1, activeQuantity - 1);
      if (modalQty) modalQty.textContent = String(activeQuantity);
      updateModalTotal();
    }
    const cartQuantityButton = event.target.closest("[data-cart-qty]");
    if (cartQuantityButton) updateCartItemQuantity(cartQuantityButton.dataset.cartId, cartQuantityButton.dataset.cartQty === "increase" ? 1 : -1);
    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      const item = getCart().find((entry) => String(entry.id) === String(removeButton.dataset.cartRemove));
      if (!item) return;
      const dialog = getConfirmationDialog();
      dialog.querySelector(".customer-order-dialog-content").innerHTML = `
        <h3>Remove Item?</h3><p>Remove ${escapeHtml(item.name)} from your order?</p>
        <div class="customer-dialog-actions"><button class="button button-outline" type="button" data-dialog-cancel>Cancel</button>
        <button class="button button-primary" type="button" data-dialog-remove="${escapeHtml(item.id)}">Confirm</button></div>`;
      dialog.hidden = false;
    }
    const favoriteRemoveButton = event.target.closest("[data-favorite-remove]");
    if (favoriteRemoveButton) {
      toggleFavorite({ name: favoriteRemoveButton.dataset.favoriteRemove });
      return;
    }
    const favoriteSaveButton = event.target.closest("[data-favorite-save]");
    if (favoriteSaveButton) {
      const name = favoriteSaveButton.dataset.favoriteSave;
      const product = getCatalog().find((entry) => entry.name === name)
        || favoriteSuggestionCatalog.find((entry) => entry.name === name);
      if (product) toggleFavorite(product);
      return;
    }
    const favoriteAddButton = event.target.closest("[data-favorite-add]");
    if (favoriteAddButton && !favoriteAddButton.disabled) {
      const name = favoriteAddButton.dataset.favoriteAdd;
      const product = getCatalog().find((entry) => entry.name === name);
      const favorite = getFavorites().find((entry) => entry.name === name);
      const price = Number(product?.price ?? favorite?.price ?? 0);
      if (!price) {
        window.klasikNotify?.("This favorite has no valid menu price and cannot be added.", "error");
        return;
      }
      const cart = getCart();
      cart.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name, quantity: 1, customizations: "Medium • Regular Milk • 0% • Less Ice",
        addOns: [], specialRequest: "", unitPrice: price, total: price
      });
      write(keys.cart, cart);
      renderCart();
      window.klasikNotify?.(`${name} added to your cart.`);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("input[name='custom-addon'], input[name='custom-size']")) updateModalTotal();
  });

  modalAddButton?.addEventListener("click", () => {
    if (!activeProduct) return;
    const addons = selectedAddons().map((input) => input.value);
    const customizations = `${selectedSize()} • Regular Milk • ${document.querySelector("input[name='custom-sweetness']:checked")?.value || "0%"} • ${document.querySelector("input[name='custom-ice']:checked")?.value || "Less Ice"}`;
    const unitPrice = selectedBasePrice();
    const cart = getCart();
    cart.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: activeProduct.name, quantity: activeQuantity, customizations, addOns: addons,
      image: activeProduct.image,
      specialRequest: "", unitPrice, total: unitPrice * activeQuantity
    });

    write(keys.cart, cart);
    renderCart();
    closeCustomization();
  });

  modalFavoriteButton?.addEventListener("click", () => {
    if (activeProduct) toggleFavorite(activeProduct);
  });

  placeOrderButton?.addEventListener("click", renderConfirmation);
  reviewComment?.addEventListener("input", updateFeedbackControls);
  suggestionSubject?.addEventListener("input", updateFeedbackControls);
  suggestionInput?.addEventListener("input", updateFeedbackControls);
  starButtons.forEach((button) => button.addEventListener("click", () => {
    if (reviewRatingInput) reviewRatingInput.value = button.dataset.rating;
    starButtons.forEach((star) => star.classList.toggle("is-active", Number(star.dataset.rating) <= Number(button.dataset.rating)));
    updateFeedbackControls();
  }));

  submitReviewButton?.addEventListener("click", () => {
    const customer = getSignedInCustomer();
    const rating = Number(reviewRatingInput?.value || 0);
    const comment = reviewComment?.value.trim() || "";
    if (!customer) {
      if (reviewMessage) reviewMessage.innerHTML = 'Please <a href="login.html">log in</a> to submit a review.';
      return;
    }
    if (!rating || !comment) return;
    const reviews = read(keys.reviews, []);
    reviews.unshift({ id: Date.now(), customer: customer.name, rating, comment, date: new Date().toISOString().slice(0, 10) });
    write(keys.reviews, reviews);
    if (reviewComment) reviewComment.value = "";
    if (reviewRatingInput) reviewRatingInput.value = "0";
    starButtons.forEach((star) => star.classList.remove("is-active"));
    if (reviewMessage) reviewMessage.textContent = "Thank you for your review.";
    renderReviews();
    updateFeedbackControls();
  });

  submitSuggestionButton?.addEventListener("click", () => {
    const customer = getSignedInCustomer();
    const subject = suggestionSubject?.value.trim() || "";
    const suggestion = suggestionInput?.value.trim() || "";
    if (!customer) {
      if (suggestionStatus) suggestionStatus.innerHTML = 'Please <a href="login.html">log in</a> to submit a suggestion.';
      return;
    }
    if (!subject || !suggestion) return;
    const suggestions = read(keys.suggestions, []);
    suggestions.unshift({ id: Date.now(), customer: customer.name, subject, suggestion, date: new Date().toISOString().slice(0, 10), status: "New" });
    write(keys.suggestions, suggestions);
    suggestionSubject.value = "";
    suggestionInput.value = "";
    if (suggestionStatus) suggestionStatus.textContent = "Thank you for your suggestion.";
    renderSuggestions();
    updateFeedbackControls();
  });

  window.addEventListener("storage", (event) => {
    if ([keys.cart, keys.orders].includes(event.key)) {
      renderCart();
      renderOrders();
    }
    if (event.key === keys.availability) {
      applyProductCards();
    }
    if ([keys.products, keys.bestSellers].includes(event.key)) applyProductCards();
    if (event.key?.startsWith("klasikCafeFavorites:")) {
      renderFavorites();
      syncFavoriteButtons();
    }
    if ([keys.reviews, keys.suggestions, keys.session].includes(event.key)) {
      renderReviews();
      renderSuggestions();
      updateFeedbackControls();
      renderFavorites();
      syncFavoriteButtons();
    }
  });

  renderCart();
  renderFavorites();
  loadFavoriteSuggestionCatalog();
  renderOrders();
  renderReviews();
  renderSuggestions();
  updateFeedbackControls();
});
