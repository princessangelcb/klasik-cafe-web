"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const menuContent = document.getElementById("menu-content");
  if (!menuContent) return;

  try {
    const response = await fetch("index.html");
    if (!response.ok) throw new Error("Menu source unavailable");

    const source = new DOMParser().parseFromString(await response.text(), "text/html");
    const menu = source.querySelector("#favorites");
    if (!menu) throw new Error("Menu section unavailable");

    menu.id = "menu";
    menu.classList.add("menu-page-section");
    menu.setAttribute("aria-labelledby", "menu-title");
    const heading = menu.querySelector("#favorites-title");
    if (heading) {
      heading.id = "menu-title";
      heading.textContent = "Menu";
    }

    const intro = menu.querySelector(".section-intro");
    if (intro) intro.textContent = "A few café favorites, made fresh. Choose a category to explore more.";
    menu.querySelector(".featured-menu-action")?.remove();
    const search = document.createElement("div");
    search.className = "menu-search";
    search.innerHTML = `
      <label for="menu-search-input">Search the menu</label>
      <div class="menu-search-field">
        <input id="menu-search-input" type="search" placeholder="Start typing a menu item..." autocomplete="off" aria-autocomplete="list" aria-controls="menu-search-suggestions">
        <span class="menu-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg></span>
      </div>
      <div id="menu-search-suggestions" class="menu-search-suggestions" role="listbox" hidden></div>`;
    menu.querySelector(".section-heading")?.after(search);

    const categoryGroups = menu.querySelector(".category-groups");
    if (categoryGroups) {
      const bestSellersGroup = document.createElement("div");
      bestSellersGroup.className = "category-group is-open";
      bestSellersGroup.innerHTML = '<button class="main-category-button is-active" type="button" data-main-category="best-sellers">Best sellers</button>';
      categoryGroups.prepend(bestSellersGroup);
      categoryGroups.querySelector('[data-main-category="add-ons"]')?.closest(".category-group")?.querySelector(".category-list")?.remove();
      categoryGroups.querySelectorAll(".category-group:not(:first-child)").forEach((group) => {
        group.classList.remove("is-open");
        group.querySelector(".main-category-button")?.classList.remove("is-active");
        group.querySelector(".category-list")?.classList.remove("is-open");
      });
    }

    menu.querySelectorAll(".product-card").forEach((card) => {
      card.hidden = false;
      const title = card.querySelector(".product-title h3");
      if (!title || !card.querySelector(".product-info")) return;

      let button = card.querySelector(".customer-product-button");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "customer-product-button";
        card.querySelector(".product-info").appendChild(button);
      }
      button.textContent = "Customize";
      button.setAttribute("aria-label", `Customize ${title.textContent.trim()}`);
    });
    const searchInput = search.querySelector("#menu-search-input");
    const suggestions = search.querySelector("#menu-search-suggestions");
    const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
    const editDistance = (first, second) => {
      let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
      for (let row = 1; row <= first.length; row += 1) {
        const current = [row];
        for (let column = 1; column <= second.length; column += 1) {
          current[column] = Math.min(
            current[column - 1] + 1,
            previous[column] + 1,
            previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1)
          );
        }
        previous = current;
      }
      return previous[second.length];
    };
    const closestMenuItems = (query, cards) => {
      const queryWords = normalize(query).split(/\s+/).filter(Boolean);
      if (!queryWords.length) return [];
      const scored = cards.map((card) => {
        const name = card.querySelector(".product-title h3")?.textContent.trim() || "";
        const words = normalize(name).split(/\s+/).filter(Boolean);
        const distances = queryWords.map((queryWord) => Math.min(...words.map((word) => editDistance(queryWord, word))));
        return { card, name, score: distances.reduce((sum, distance) => sum + distance, 0) / distances.length, worst: Math.max(...distances) };
      }).sort((first, second) => first.score - second.score || first.name.localeCompare(second.name));
      const maxDistance = Math.min(3, Math.max(1, Math.ceil(Math.max(...queryWords.map((word) => word.length)) * 0.3)));
      return scored.filter((item) => item.worst <= maxDistance).slice(0, 5);
    };
    const renderSuggestions = (entries, title, emptyMessage = "") => {
      suggestions.replaceChildren();
      if (title) {
        const heading = document.createElement("p");
        heading.className = "menu-search-heading";
        heading.textContent = title;
        suggestions.append(heading);
      }
      entries.forEach(({ card, name }) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "menu-search-suggestion";
        option.setAttribute("role", "option");
        option.dataset.productName = name;
        option.append(document.createTextNode(name));
        const price = document.createElement("span");
        price.textContent = card.querySelector(".product-title span")?.textContent.trim() || "";
        option.append(price);
        suggestions.append(option);
      });
      if (emptyMessage) {
        const empty = document.createElement("p");
        empty.className = "menu-search-empty";
        empty.textContent = emptyMessage;
        suggestions.append(empty);
      }
      suggestions.hidden = false;
    };
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLocaleLowerCase();
      if (!query) {
        suggestions.replaceChildren();
        suggestions.hidden = true;
        menu.querySelector(".main-category-button.is-active")?.click();
        return;
      }
      const availableCards = Array.from(menu.querySelectorAll(".product-card"))
        .filter((card) => card.dataset.available !== "false");
      const matches = availableCards.filter((card) =>
        normalize(card.querySelector(".product-title h3")?.textContent || "").includes(normalize(query))
      ).map((card) => ({ card, name: card.querySelector(".product-title h3").textContent.trim() }));
      if (matches.length) {
        renderSuggestions(matches.slice(0, 8), "Menu suggestions");
      } else {
        const closest = closestMenuItems(query, availableCards);
        renderSuggestions(
          closest,
          closest.length ? "Did you mean...?" : "",
          closest.length ? "" : "No close available menu items found."
        );
      }
    });
    suggestions.addEventListener("click", (event) => {
      const suggestion = event.target.closest("[data-product-name]");
      if (!suggestion) return;
      const card = Array.from(menu.querySelectorAll(".product-card"))
        .find((item) => item.querySelector(".product-title h3")?.textContent.trim() === suggestion.dataset.productName);
      if (!card || card.dataset.available === "false") return;
      menu.querySelectorAll(".product-card").forEach((item) => { item.hidden = item !== card; });
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      searchInput.value = suggestion.dataset.productName;
      suggestions.hidden = true;
    });
    menuContent.replaceChildren(menu);
    window.dispatchEvent(new Event("klasik-menu-ready"));
    menu.querySelector('.main-category-button[data-main-category="best-sellers"]')?.click();
  } catch (error) {
    console.error("Unable to load the shared menu catalog.", error);
    menuContent.innerHTML = '<p class="page-width menu-loading" role="alert">The menu could not be loaded. Please refresh the page to try again.</p>';
  }
});