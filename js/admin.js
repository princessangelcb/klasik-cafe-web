"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const storageKeys = {
    products: "klasikCafeAdminProductsV2",
    reviews: "klasikCafeCustomerReviews",
    suggestions: "klasikCafeCustomerSuggestions",
    cafeInfo: "klasikCafeInfo",
    orders: "klasikCafeOrders",
    availability: "klasikCafeProductAvailability",
    bestSellers: "klasikCafeProductBestSellers"
  };

  const defaultReviews = [];
  const defaultSuggestions = [];
  const orderStatuses = ["Awaiting Confirmation", "Confirmed", "Preparing", "Ready for Pickup", "Completed", "Cancelled"];
  const productsPerPage = 5;
  let productPage = 0;

  const defaultCafeInfo = {
    name: "KLASIK CAFE",
    address: "Beside Chapel, Matimbubong, San Ildefonso, Bulacan",
    hours: "Mon-Sun: 7:00 AM - 9:00 PM",
    phone: "+63 912 345 6789",
    facebook: "facebook.com/klasikcafe",
    instagram: "@klasikcafe",
    tiktok: "@klasikcafe",
    description: "A neighborhood coffee haven known for handcrafted drinks and warm hospitality."
  };

  let products = loadData(storageKeys.products, null);
  let catalogError = null;
  if (!Array.isArray(products)) {
    try {
      const response = await fetch("index.html");
      if (!response.ok) throw new Error(`Menu catalog request failed (${response.status}).`);
      const source = new DOMParser().parseFromString(await response.text(), "text/html");
      products = Array.from(source.querySelectorAll("#favorites .product-card")).map((card, index) => {
        const title = card.querySelector(".product-title h3");
        const price = card.querySelector(".product-title span");
        if (!title || !price) return null;
        const category = normalizeMainCategory(card.dataset.mainCategory || card.dataset.category || "coffee");
        return {
          id: index + 1,
          name: title.textContent.trim(),
          category,
          mainCategory: category,
          subcategory: card.dataset.subcategory || card.dataset.category || category,
          description: card.querySelector(".product-info p")?.textContent.trim() || "",
          price: Number(price.textContent.replace(/[^\d.]/g, "")),
          image: card.querySelector(".product-image img")?.getAttribute("src") || "",
          available: true
        };
      }).filter(Boolean);
      if (!products.length) throw new Error("The menu catalog contains no manageable products.");
      saveData(storageKeys.products, products);
    } catch (error) {
      catalogError = error;
      products = [];
      console.error("Could not load the real homepage product catalog.", error);
    }
  }
  const availability = loadData(storageKeys.availability, {});
  const bestSellers = loadData(storageKeys.bestSellers, {});
  products.forEach((product) => {
    if (Object.prototype.hasOwnProperty.call(availability, product.name)) product.available = availability[product.name];
    if (Object.prototype.hasOwnProperty.call(bestSellers, product.name)) product.bestSeller = bestSellers[product.name];
  });

  const adminReviews = loadData(storageKeys.reviews, defaultReviews);
  const suggestions = loadData(storageKeys.suggestions, defaultSuggestions);
  const cafeInfo = { ...defaultCafeInfo, ...loadData(storageKeys.cafeInfo, defaultCafeInfo) };

  const productTableBody = document.getElementById("admin-product-table-body");
  const orderList = document.getElementById("admin-order-list");
  const reviewList = document.getElementById("admin-review-list");
  const suggestionList = document.getElementById("admin-suggestion-list");
  const productModal = document.getElementById("product-modal");
  const productForm = document.getElementById("product-form");
  const addProductTrigger = document.getElementById("add-product-trigger");
  const cancelProductModal = document.getElementById("cancel-product-modal");
  const closeProductModalButton = productModal?.querySelector(".modal-close");
  const cafeForm = document.getElementById("cafe-info-form");
  const imageDropzone = document.getElementById("product-image-dropzone");
  const imageFileInput = document.getElementById("product-image-file");
  const imageValueInput = document.getElementById("product-image");
  const imagePreview = document.getElementById("product-image-preview");
  const imagePreviewWrap = document.querySelector(".image-upload-preview-wrap");
  const imageUploadPrompt = document.querySelector(".image-upload-prompt");
  const imageUploadStatus = document.getElementById("product-image-status");
  const imageRemoveButton = document.getElementById("product-image-remove");
  let imageWasRemoved = false;
  if (catalogError && window.klasikNotify) {
    window.klasikNotify("Could not load menu products. Open the site through its local web server and refresh.", "error");
  }

  function loadData(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      console.error(`Could not read ${key} from browser storage.`, error);
      return fallback;
    }
  }

  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatCategoryLabel(value) {
    return (value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function normalizeMainCategory(value) {
    const mapping = {
      iced: "coffee", hot: "coffee", "iced-coffee": "coffee", "hot-coffee": "coffee",
      "espesyal": "coffee", "espesyal2": "non-coffee", noncoffee: "non-coffee",
      cookies: "pastries", smores: "pastries", cheesecakes: "pastries"
    };
    return mapping[value] || value || "coffee";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[character]);
  }

  function showImagePreview(source, removed = false) {
    imageWasRemoved = removed;
    imageValueInput.value = source || "";
    imagePreview.src = source || "";
    imagePreviewWrap.hidden = !source;
    imageUploadPrompt.hidden = Boolean(source);
    imageUploadStatus.textContent = source ? "Image ready to save." : removed ? "Image removed. Save changes to apply." : "";
  }

  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        reject(new Error("Choose a PNG, JPG, or WebP image."));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("Choose an image smaller than 12 MB."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("The selected image could not be read."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("The selected file is not a valid image."));
        image.onload = () => {
          const maxDimension = 1000;
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Image preview is unavailable in this browser."));
            return;
          }
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          let quality = 0.82;
          let compressed = canvas.toDataURL("image/jpeg", quality);
          while (compressed.length > 580000 && quality > 0.5) {
            quality -= 0.08;
            compressed = canvas.toDataURL("image/jpeg", quality);
          }
          if (compressed.length > 580000) {
            reject(new Error("This image cannot be compressed enough to save in browser storage."));
            return;
          }
          resolve(compressed);
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function acceptImage(file) {
    if (!file) return;
    imageUploadStatus.textContent = "Preparing image preview…";
    try {
      showImagePreview(await prepareImage(file));
    } catch (error) {
      imageUploadStatus.textContent = error.message;
      window.klasikNotify(error.message, "error");
    } finally {
      imageFileInput.value = "";
    }
  }

  imageDropzone.addEventListener("click", (event) => {
    if (!event.target.closest(".image-upload-remove")) imageFileInput.click();
  });
  imageDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      imageFileInput.click();
    }
  });
  ["dragenter", "dragover"].forEach((type) => imageDropzone.addEventListener(type, (event) => {
    event.preventDefault();
    imageDropzone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((type) => imageDropzone.addEventListener(type, (event) => {
    event.preventDefault();
    imageDropzone.classList.remove("is-dragging");
  }));
  imageDropzone.addEventListener("drop", (event) => acceptImage(event.dataTransfer.files[0]));
  imageFileInput.addEventListener("change", () => acceptImage(imageFileInput.files[0]));
  imageRemoveButton.addEventListener("click", (event) => {
    event.stopPropagation();
    showImagePreview("", true);
  });

  document.getElementById("product-best-seller").addEventListener("change", (event) => {
    event.target.closest(".availability-switch").querySelector(".availability-label").textContent = event.target.checked ? "Best Seller" : "Not a Best Seller";
  });

  document.getElementById("product-availability").addEventListener("change", (event) => {
    document.getElementById("product-availability-label").textContent = event.target.checked ? "Available" : "Unavailable";
  });

  function statusClass(status) {
    return String(status).toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  }

  function getOrders() {
    return loadData(storageKeys.orders, []);
  }

  function saveOrders(orders) {
    saveData(storageKeys.orders, orders);
  }

  function canChangeOrderStatus(current, next) {
    if (current === next) return true;
    if (current === "Awaiting Confirmation") return next === "Cancelled";
    if (current === "Confirmed") return next === "Preparing" || next === "Cancelled";
    if (current === "Preparing") return next === "Ready for Pickup" || next === "Cancelled";
    if (current === "Ready for Pickup") return next === "Completed" || next === "Cancelled";
    return false;
  }

  function getSubcategoryOptions(mainCategory) {
    const options = {
      coffee: [
        { value: "iced-coffee", label: "Iced Coffee" },
        { value: "hot-coffee", label: "Hot Coffee" },
        { value: "espesyal", label: "Espesyal" }
      ],
      "non-coffee": [
        { value: "non-coffee", label: "Non Coffee" },
        { value: "espesyal", label: "Espesyal" }
      ],
      matcha: [{ value: "matcha", label: "Matcha Series" }],
      pastries: [
        { value: "smores", label: "Smores" },
        { value: "cookies", label: "Cookies" },
        { value: "cheesecakes", label: "Cheesecakes" }
      ],
      snacks: [{ value: "snacks", label: "Snacks" }],
      pasta: [{ value: "pasta", label: "Pasta" }],
      "add-ons": [{ value: "add-ons", label: "Add-ons" }]
    };

    return options[mainCategory] || [{ value: mainCategory, label: formatCategoryLabel(mainCategory) }];
  }

  function populateSubcategoryOptions(mainCategory, selectedValue = null) {
    const subcategorySelect = document.getElementById("product-subcategory");
    if (!subcategorySelect) return;

    const options = getSubcategoryOptions(mainCategory);
    subcategorySelect.innerHTML = options.map((option) => `
      <option value="${option.value}" ${selectedValue === option.value ? "selected" : ""}>${option.label}</option>
    `).join("");

    if (!selectedValue && options[0]) {
      subcategorySelect.value = options[0].value;
    }
  }

  function renderProducts() {
    if (!productTableBody) return;

    const pageCount = Math.max(1, Math.ceil(products.length / productsPerPage));
    productPage = Math.min(productPage, pageCount - 1);
    const pageProducts = products.slice(productPage * productsPerPage, (productPage + 1) * productsPerPage);
    productTableBody.innerHTML = pageProducts.map((product) => {
      const mainCategory = product.mainCategory || product.category || "coffee";
      const subcategory = product.subcategory || product.category || mainCategory;

      return `
        <tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${formatCategoryLabel(mainCategory)} / ${formatCategoryLabel(subcategory)}</td>
          <td>₱${Number(product.price).toLocaleString("en-US")}</td>
          <td>
            <label class="availability-switch availability-control">
              <input type="checkbox" class="availability-toggle" role="switch" aria-label="Availability for ${escapeHtml(product.name)}" data-product-id="${product.id}" ${product.available ? "checked" : ""}>
              <span class="availability-switch-track"></span><span class="availability-label">${product.available ? "Available" : "Unavailable"}</span>
            </label>
          </td>
          <td>
            <label class="availability-switch best-seller-control">
              <input type="checkbox" class="best-seller-toggle" role="switch" aria-label="Best seller for ${escapeHtml(product.name)}" data-product-id="${product.id}" ${product.bestSeller ? "checked" : ""}>
              <span class="availability-switch-track"></span><span class="availability-label">${product.bestSeller ? "Best Seller" : "Not a Best Seller"}</span>
            </label>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-button edit-btn" data-product-id="${product.id}">Edit</button>
              <button type="button" class="table-button delete" data-product-id="${product.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
    const pageLabel = document.getElementById("admin-products-page");
    const previous = document.getElementById("admin-products-previous");
    const next = document.getElementById("admin-products-next");
    if (pageLabel) pageLabel.textContent = `Page ${productPage + 1} of ${pageCount}`;
    if (previous) previous.disabled = productPage === 0;
    if (next) next.disabled = productPage >= pageCount - 1;
    const productCount = document.getElementById("admin-product-count");
    const availableCount = document.getElementById("admin-available-count");
    if (productCount) productCount.textContent = String(products.length);
    if (availableCount) availableCount.textContent = String(products.filter((product) => product.available).length);
  }

  function renderOrders() {
    if (!orderList) return;
    const orders = getOrders();
    const orderCount = document.getElementById("admin-order-count");
    if (orderCount) orderCount.textContent = String(orders.length);
    if (!orders.length) {
      orderList.innerHTML = '<p class="customer-empty-state">No customer orders have been placed.</p>';
      return;
    }
    orderList.innerHTML = orders.map((order) => `
      <article class="admin-order-item">
        <div class="admin-order-summary">
          <strong>Order #${escapeHtml(order.id)}</strong>
          <span class="order-status-tag status-${statusClass(order.status)}">${escapeHtml(order.status)}</span>
          <p>${order.items.map((item) => `${Number(item.quantity || 1)}x ${escapeHtml(item.name)}`).join(", ")}</p>
          <strong>₱${Number(order.total || 0).toLocaleString("en-US")}</strong>
        </div>
        <label class="admin-status-control">Order status
          <select class="small-select order-status-select status-${statusClass(order.status)}" data-order-id="${escapeHtml(order.id)}">
            ${orderStatuses.map((status) => {
              const blocked = !canChangeOrderStatus(order.status, status);
              return `<option class="status-${statusClass(status)}" value="${status}" ${order.status === status ? "selected" : ""} ${blocked ? "disabled" : ""}>${status}</option>`;
            }).join("")}
          </select>
        </label>
      </article>
    `).join("");
  }

  function renderReviews() {
    if (!reviewList) return;

    const count = document.getElementById("admin-review-count");
    if (count) count.textContent = String(adminReviews.length);
    reviewList.innerHTML = adminReviews.map((review) => `
      <div class="admin-review-item">
        <strong>${escapeHtml(review.customer)}</strong>
        <span class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
        <p>${escapeHtml(review.comment)}</p>
        <span>${escapeHtml(review.date)}</span>
        <button type="button" class="inline-button delete-review" data-review-id="${review.id}">Delete</button>
      </div>
    `).join("");
  }

  function renderSuggestions() {
    if (!suggestionList) return;

    const count = document.getElementById("admin-suggestion-count");
    if (count) count.textContent = String(suggestions.length);
    suggestionList.innerHTML = suggestions.map((item) => `
      <div class="admin-suggestion-item">
        <div>
          <strong>${escapeHtml(item.customer || "Customer")}</strong>
          <p>${escapeHtml(item.subject)}</p>
          <small>${escapeHtml(item.suggestion)}</small>
        </div>
        <span>${escapeHtml(item.date)}</span>
        <select class="small-select suggestion-status" data-suggestion-id="${item.id}">
          <option value="New" ${item.status === "New" ? "selected" : ""}>New</option>
          <option value="Reviewing" ${item.status === "Reviewing" ? "selected" : ""}>Reviewing</option>
          <option value="Resolved" ${item.status === "Resolved" ? "selected" : ""}>Resolved</option>
        </select>
      </div>
    `).join("");
  }

  function populateCafeInfo() {
    document.getElementById("cafe-name").value = cafeInfo.name;
    document.getElementById("cafe-address").value = cafeInfo.address;
    document.getElementById("cafe-hours").value = cafeInfo.hours;
    document.getElementById("cafe-phone").value = cafeInfo.phone;
    document.getElementById("cafe-facebook").value = cafeInfo.facebook;
    document.getElementById("cafe-instagram").value = cafeInfo.instagram;
    document.getElementById("cafe-tiktok").value = cafeInfo.tiktok;
    document.getElementById("cafe-description").value = cafeInfo.description;
  }

  function openProductModal(product = null) {
    if (!productModal) return;

    const mainCategory = product ? (product.mainCategory || product.category || "coffee") : "coffee";
    const subcategory = product ? (product.subcategory || product.category || "iced-coffee") : "iced-coffee";

    if (product) {
      document.getElementById("product-id").value = product.id;
      document.getElementById("product-name").value = product.name;
      document.getElementById("product-main-category").value = mainCategory;
      populateSubcategoryOptions(mainCategory, subcategory);
      document.getElementById("product-description").value = product.description;
      document.getElementById("product-price").value = product.price;
      document.getElementById("product-image").value = product.image;
      document.getElementById("product-availability").checked = Boolean(product.available);
      document.getElementById("product-availability-label").textContent = product.available ? "Available" : "Unavailable";
      document.getElementById("product-best-seller").checked = Boolean(product.bestSeller);
      document.getElementById("product-best-seller").closest(".availability-switch").querySelector(".availability-label").textContent = product.bestSeller ? "Best Seller" : "Not a Best Seller";
      showImagePreview(product.image || "");
      document.querySelector("#product-form button[type='submit']").textContent = "Save Changes";
      document.getElementById("product-modal-title").textContent = "Edit Product";
    } else {
      productForm.reset();
      document.getElementById("product-id").value = "";
      document.getElementById("product-main-category").value = "coffee";
      populateSubcategoryOptions("coffee", "iced-coffee");
      document.getElementById("product-availability").checked = true;
      document.getElementById("product-availability-label").textContent = "Available";
      document.getElementById("product-best-seller").checked = false;
      document.getElementById("product-best-seller").closest(".availability-switch").querySelector(".availability-label").textContent = "Not a Best Seller";
      showImagePreview("");
      document.querySelector("#product-form button[type='submit']").textContent = "Add Product";
      document.getElementById("product-modal-title").textContent = "Add Product";
    }

    productModal.hidden = false;
  }

  function closeProductModal() {
    if (productModal) productModal.hidden = true;
  }

  const productMainCategory = document.getElementById("product-main-category");
  const productSubcategory = document.getElementById("product-subcategory");

  productMainCategory?.addEventListener("change", (event) => {
    populateSubcategoryOptions(event.target.value, null);
  });

  addProductTrigger.addEventListener("click", () => openProductModal());
  document.getElementById("admin-products-previous")?.addEventListener("click", () => {
    if (productPage > 0) { productPage -= 1; renderProducts(); }
  });
  document.getElementById("admin-products-next")?.addEventListener("click", () => {
    if ((productPage + 1) * productsPerPage < products.length) { productPage += 1; renderProducts(); }
  });
  cancelProductModal.addEventListener("click", closeProductModal);
  closeProductModalButton?.addEventListener("click", closeProductModal);
  productModal?.addEventListener("click", (event) => {
    if (event.target === productModal) closeProductModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && productModal && !productModal.hidden) closeProductModal();
  });

  productForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const id = document.getElementById("product-id").value;
    const oldName = id ? products.find((item) => item.id === Number(id))?.name : null;
    const mainCategory = document.getElementById("product-main-category").value;
    const subcategory = document.getElementById("product-subcategory").value || mainCategory;
    const record = {
      id: id ? Number(id) : Date.now(),
      name: document.getElementById("product-name").value.trim(),
      category: mainCategory,
      mainCategory,
      subcategory,
      description: document.getElementById("product-description").value.trim(),
      price: Number(document.getElementById("product-price").value),
      image: imageValueInput.value.trim() || (imageWasRemoved ? "" : id ? products.find((item) => item.id === Number(id))?.image || "" : ""),
      available: document.getElementById("product-availability").checked,
      bestSeller: document.getElementById("product-best-seller").checked
    };

    if (!record.name || !record.description || !Number.isFinite(record.price) || record.price <= 0) {
      window.klasikNotify("Enter a product name, description, and valid positive price.", "error");
      return;
    }

    const existingIndex = products.findIndex((item) => item.id === record.id);
    const nextProducts = products.slice();
    const nextAvailability = { ...availability };
    const nextBestSellers = { ...bestSellers };
    if (existingIndex >= 0) {
      nextProducts[existingIndex] = record;
      if (oldName && oldName !== record.name && Object.prototype.hasOwnProperty.call(availability, oldName)) {
        nextAvailability[record.name] = nextAvailability[oldName];
        delete nextAvailability[oldName];
        nextBestSellers[record.name] = nextBestSellers[oldName] || record.bestSeller;
        delete nextBestSellers[oldName];
      }
    } else {
      nextProducts.push(record);
    }

    nextAvailability[record.name] = record.available;
    nextBestSellers[record.name] = record.bestSeller;
    try {
      saveData(storageKeys.products, nextProducts);
      saveData(storageKeys.availability, nextAvailability);
      saveData(storageKeys.bestSellers, nextBestSellers);
    } catch (error) {
      console.error("Could not save the product changes in browser storage.", error);
      window.klasikNotify("Product could not be saved. Browser storage may be full; try a smaller image.", "error");
      return;
    }
    products.splice(0, products.length, ...nextProducts);
    Object.assign(availability, nextAvailability);
    Object.assign(bestSellers, nextBestSellers);
    productPage = Math.floor((products.length - 1) / productsPerPage);
    renderProducts();
    closeProductModal();
    window.klasikNotify(existingIndex >= 0 ? "Product changes saved." : "Product added.");
  });

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest(".edit-btn");
    if (editButton) {
      const product = products.find((item) => item.id === Number(editButton.dataset.productId));
      if (product) openProductModal(product);
      return;
    }

    const deleteButton = event.target.closest(".delete");
    if (deleteButton) {
      const id = Number(deleteButton.dataset.productId);
      const product = products.find((item) => item.id === id);
      if (!product) return;
      window.klasikConfirm(`Delete ${product.name} from the menu?`, "Delete Product").then((confirmDelete) => {
        if (!confirmDelete) return;
        const index = products.findIndex((item) => item.id === id);
        if (index >= 0) {
          products.splice(index, 1);
          saveData(storageKeys.products, products);
          delete availability[product.name];
          saveData(storageKeys.availability, availability);
          productPage = Math.min(productPage, Math.max(0, Math.ceil(products.length / productsPerPage) - 1));
          renderProducts();
          window.klasikNotify("Product deleted.");
        }
      });
      return;
    }

    const reviewDeleteButton = event.target.closest(".delete-review");
    if (reviewDeleteButton) {
      const id = Number(reviewDeleteButton.dataset.reviewId);
      const review = adminReviews.find((item) => item.id === id);
      if (!review) return;
      window.klasikConfirm(`Delete this review from ${review.customer}?`, "Delete Review").then((confirmDelete) => {
        if (!confirmDelete) return;
        const index = adminReviews.findIndex((item) => item.id === id);
        if (index >= 0) {
          adminReviews.splice(index, 1);
          saveData(storageKeys.reviews, adminReviews);
          renderReviews();
          window.klasikNotify("Review deleted.");
        }
      });
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const availabilityToggle = event.target.closest(".availability-toggle");
    if (availabilityToggle) {
      const product = products.find((item) => item.id === Number(availabilityToggle.dataset.productId));
      if (product) {
        const previous = product.available;
        product.available = availabilityToggle.checked;
        availability[product.name] = product.available;
        try {
          saveData(storageKeys.availability, availability);
          saveData(storageKeys.products, products);
        } catch (error) {
          product.available = previous;
          availability[product.name] = previous;
          console.error("Could not save product availability.", error);
          window.klasikNotify("Availability could not be saved in browser storage.", "error");
          renderProducts();
          return;
        }
        renderProducts();
        window.klasikNotify(`${product.name} is now ${product.available ? "Available" : "Unavailable"}.`);
      }
    }

    const bestSellerToggle = event.target.closest(".best-seller-toggle");
    if (bestSellerToggle) {
      const product = products.find((item) => item.id === Number(bestSellerToggle.dataset.productId));
      if (product) {
        const previous = product.bestSeller;
        product.bestSeller = bestSellerToggle.checked;
        bestSellers[product.name] = product.bestSeller;
        try {
          saveData(storageKeys.bestSellers, bestSellers);
          saveData(storageKeys.products, products);
        } catch (error) {
          product.bestSeller = previous;
          bestSellers[product.name] = previous;
          console.error("Could not save best-seller status.", error);
          window.klasikNotify("Best Seller status could not be saved in browser storage.", "error");
          renderProducts();
          return;
        }
        renderProducts();
        window.klasikNotify(product.bestSeller ? `${product.name} is marked Best Seller.` : `Best Seller label removed from ${product.name}.`);
      }
    }

    const orderStatusSelect = event.target.closest(".order-status-select");
    if (orderStatusSelect) {
      const order = getOrders().find((item) => String(item.id) === orderStatusSelect.dataset.orderId);
      if (order) {
        if (!canChangeOrderStatus(order.status, orderStatusSelect.value)) {
          window.klasikNotify(order.status === "Awaiting Confirmation"
            ? "A bartender must confirm this order before it leaves Placed Orders."
            : "Orders can only move forward through the preparation stages.", "error");
          renderOrders();
          return;
        }
        const orders = getOrders();
        const record = orders.find((item) => String(item.id) === orderStatusSelect.dataset.orderId);
        record.status = orderStatusSelect.value;
        record.updatedAt = new Date().toISOString();
        saveOrders(orders);
        renderOrders();
        orderStatusSelect.className = `small-select order-status-select status-${statusClass(record.status)}`;
        window.klasikNotify(`Order #${record.id} status updated.`);
      }
    }

    const suggestionStatusSelect = event.target.closest(".suggestion-status");
    if (suggestionStatusSelect) {
      const suggestion = suggestions.find((item) => item.id === Number(suggestionStatusSelect.dataset.suggestionId));
      if (suggestion) {
        suggestion.status = suggestionStatusSelect.value;
        saveData(storageKeys.suggestions, suggestions);
        renderSuggestions();
        window.klasikNotify("Suggestion status updated.");
      }
    }
  });

  cafeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedInfo = {
      name: document.getElementById("cafe-name").value.trim(),
      address: document.getElementById("cafe-address").value.trim(),
      hours: document.getElementById("cafe-hours").value.trim(),
      phone: document.getElementById("cafe-phone").value.trim(),
      facebook: document.getElementById("cafe-facebook").value.trim(),
      instagram: document.getElementById("cafe-instagram").value.trim(),
      tiktok: document.getElementById("cafe-tiktok").value.trim(),
      description: document.getElementById("cafe-description").value.trim()
    };

    Object.assign(cafeInfo, updatedInfo);
    saveData(storageKeys.cafeInfo, cafeInfo);
    window.klasikNotify("Café information saved.");
  });

  renderProducts();
  renderOrders();
  renderReviews();
  renderSuggestions();
  populateCafeInfo();

  window.addEventListener("storage", (event) => {
    if (event.key === storageKeys.orders) renderOrders();
    if (event.key === storageKeys.availability) {
      const saved = loadData(storageKeys.availability, {});
      products.forEach((product) => {
        if (Object.prototype.hasOwnProperty.call(saved, product.name)) product.available = saved[product.name];
      });
      Object.assign(availability, saved);
      renderProducts();
    }
    if (event.key === storageKeys.bestSellers) {
      const saved = loadData(storageKeys.bestSellers, {});
      products.forEach((product) => {
        if (Object.prototype.hasOwnProperty.call(saved, product.name)) product.bestSeller = saved[product.name];
      });
      Object.assign(bestSellers, saved);
      renderProducts();
    }
    if (event.key === storageKeys.reviews) {
      adminReviews.splice(0, adminReviews.length, ...loadData(storageKeys.reviews, []));
      renderReviews();
    }
    if (event.key === storageKeys.suggestions) {
      suggestions.splice(0, suggestions.length, ...loadData(storageKeys.suggestions, []));
      renderSuggestions();
    }
  });
});
