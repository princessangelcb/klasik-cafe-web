"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const storageKey = "klasikCafeOrders";
  const statuses = ["Awaiting Confirmation", "Confirmed", "Preparing", "Ready for Pickup", "Completed", "Cancelled"];
  const queueContainer = document.getElementById("barista-order-queue");
  const detailPanel = document.getElementById("barista-order-detail");
  let selectedOrderId = null;

  function loadOrders() {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    try {
      const orders = JSON.parse(stored);
      return Array.isArray(orders) ? orders : [];
    } catch (error) {
      console.error("Could not read placed orders from browser storage.", error);
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(storageKey, JSON.stringify(orders));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[character]);
  }

  function statusClass(status) {
    return String(status).toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  }

  function canChangeOrderStatus(current, next) {
    if (current === next) return true;
    if (current === "Awaiting Confirmation") return next === "Confirmed" || next === "Cancelled";
    if (current === "Confirmed") return next === "Preparing" || next === "Cancelled";
    if (current === "Preparing") return next === "Ready for Pickup" || next === "Cancelled";
    if (current === "Ready for Pickup") return next === "Completed" || next === "Cancelled";
    return false;
  }

  function renderStats(orders) {
    const counts = {
      "barista-awaiting-count": orders.filter((order) => order.status === "Awaiting Confirmation").length,
      "barista-confirmed-count": orders.filter((order) => order.status === "Confirmed").length,
      "barista-preparing-count": orders.filter((order) => order.status === "Preparing").length,
      "barista-ready-count": orders.filter((order) => order.status === "Ready for Pickup").length,
      "barista-completed-count": orders.filter((order) => order.status === "Completed").length
    };
    Object.entries(counts).forEach(([id, count]) => {
      const target = document.getElementById(id);
      if (target) target.textContent = String(count);
    });
  }

  function renderQueue() {
    const orders = loadOrders();
    renderStats(orders);
    if (!queueContainer) return;
    if (!orders.some((order) => order.id === selectedOrderId)) selectedOrderId = orders[0]?.id || null;
    if (!orders.length) {
      queueContainer.innerHTML = '<p class="customer-empty-state">No customer orders have been placed.</p>';
      if (detailPanel) detailPanel.innerHTML = '<p class="customer-empty-state">Order details will appear here.</p>';
      return;
    }

    queueContainer.innerHTML = orders.map((order) => `
      <article class="queue-item ${selectedOrderId === order.id ? "is-selected" : ""}" data-order-id="${escapeHtml(order.id)}">
        <div class="queue-header"><strong>Order #${escapeHtml(order.id)}</strong><span class="order-status-tag status-${statusClass(order.status)}">${escapeHtml(order.status)}</span></div>
        <p>Customer: ${escapeHtml(order.customer || "Guest")} · ₱${Number(order.total || 0).toLocaleString("en-US")}</p>
        <ul>${order.items.map((item) => `<li>${Number(item.quantity || 1)}x ${escapeHtml(item.name)}</li>`).join("")}</ul>
        ${order.status === "Awaiting Confirmation" ? `<button class="queue-action" type="button" data-action="confirm" data-order-id="${escapeHtml(order.id)}">Confirm Order</button>` : ""}
        <label class="barista-status-control">Order status
          <select class="order-status-select status-${statusClass(order.status)}" aria-label="Status for order ${escapeHtml(order.id)}" data-order-id="${escapeHtml(order.id)}">
            ${statuses.map((status) => `<option class="status-${statusClass(status)}" value="${status}" ${order.status === status ? "selected" : ""} ${canChangeOrderStatus(order.status, status) ? "" : "disabled"}>${status}</option>`).join("")}
          </select>
        </label>
      </article>
    `).join("");

    renderDetail(orders.find((order) => order.id === selectedOrderId) || orders[0]);
  }

  function renderDetail(order) {
    if (!detailPanel || !order) return;
    const itemsMarkup = order.items.map((item) => `
      <li><strong>${Number(item.quantity || 1)}x ${escapeHtml(item.name)}</strong>
        <div>${escapeHtml(item.customizations || "")}</div>
        <div>Add-ons: ${escapeHtml((item.addOns || []).join(", ") || "None")}</div>
        <div>Unit price: ₱${Number(item.unitPrice || 0).toLocaleString("en-US")}</div>
      </li>`).join("");
    detailPanel.innerHTML = `
      <h3>Order #${escapeHtml(order.id)}</h3>
      <div class="order-status-tag status-${statusClass(order.status)}">${escapeHtml(order.status)}</div>
      <dl>
        <dt>Customer</dt><dd>${escapeHtml(order.customer || "Guest")}</dd>
        <dt>Order Date</dt><dd>${escapeHtml(order.date || "")}</dd>
        <dt>Total</dt><dd>₱${Number(order.total || 0).toLocaleString("en-US")}</dd>
        <dt>Special Request</dt><dd>${escapeHtml(order.specialRequest || "None")}</dd>
      </dl>
      <ul class="detail-items">${itemsMarkup}</ul>`;
  }

  function changeStatus(orderId, status) {
    const orders = loadOrders();
    const order = orders.find((item) => String(item.id) === String(orderId));
    if (!order || !statuses.includes(status)) return;
    if (!canChangeOrderStatus(order.status, status)) {
      window.klasikNotify(order.status === "Awaiting Confirmation"
        ? "Review the order and confirm it before preparation."
        : "Orders can only move forward through the preparation stages.", "error");
      renderQueue();
      return;
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveOrders(orders);
    renderQueue();
    window.klasikNotify(`Order #${order.id} is now ${status}.`);
  }

  queueContainer?.addEventListener("click", (event) => {
    const confirmButton = event.target.closest("[data-action='confirm']");
    if (confirmButton) {
      changeStatus(confirmButton.dataset.orderId, "Confirmed");
      return;
    }
    if (event.target.closest("select")) return;
    const card = event.target.closest(".queue-item");
    if (card) {
      selectedOrderId = card.dataset.orderId;
      renderQueue();
    }
  });

  queueContainer?.addEventListener("change", (event) => {
    const select = event.target.closest(".order-status-select");
    if (select) {
      select.className = `order-status-select status-${statusClass(select.value)}`;
      changeStatus(select.dataset.orderId, select.value);
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) renderQueue();
  });

  renderQueue();
});
