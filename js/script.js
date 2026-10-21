"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const themeKey = "klasikCafeTheme";
  const applyTheme = (theme) => { document.documentElement.dataset.theme = theme; };
  applyTheme(localStorage.getItem(themeKey) === "dark" ? "dark" : "light");
  const themeToggle = document.createElement("button");
  themeToggle.type = "button";
  themeToggle.className = "theme-toggle";
  const paintThemeIcon = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    themeToggle.innerHTML = dark ? '<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1.75v2.5M12 19.75v2.5M1.75 12h2.5m15.5 0h2.5M4.76 4.76l1.77 1.77m10.94 10.94 1.77 1.77m0-14.48-1.77 1.77M6.53 17.47l-1.77 1.77"/></svg>' : '<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.9 2.4a9.8 9.8 0 1 0 4.7 15.1A8.1 8.1 0 0 1 16.9 2.4Z"/><path class="moon-star" d="M18.7 3.1v3.2m-1.6-1.6h3.2"/></svg>';
    themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  };
  paintThemeIcon();
  themeToggle.setAttribute("aria-label", "Toggle dark mode");
  themeToggle.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(themeKey, theme);
    applyTheme(theme);
    paintThemeIcon();
  });
  let locationLink = [...document.querySelectorAll(".primary-nav .nav-link")].find(link => /location/i.test(link.textContent));
  if (!locationLink) {
    locationLink = document.createElement("a");
    locationLink.className = "nav-link";
    locationLink.href = "index.html#location";
    locationLink.textContent = "Location";
    const nav = document.querySelector(".primary-nav");
    nav?.insertBefore(locationLink, nav.querySelector(".nav-actions, .dashboard-logout") || null);
  }
  if (locationLink) locationLink.after(themeToggle);
  else document.querySelector(".nav-actions, .primary-nav")?.append(themeToggle);
  const actions = document.querySelector(".nav-actions");
  document.getElementById("nav-logout-btn")?.remove();
  document.querySelector(".dashboard-logout")?.remove();
  const profileDropdown = document.createElement("div");
  profileDropdown.className = "profile-dropdown";
  profileDropdown.innerHTML = '<button id="nav-profile-btn" class="button button-outline button-small profile-dropdown-toggle" type="button" aria-haspopup="true" aria-expanded="false" hidden>Profile <span aria-hidden="true">&#9662;</span></button><div class="profile-dropdown-menu" id="profile-dropdown-menu" hidden><section class="profile-dropdown-details" aria-label="Account profile"><h2>My Profile</h2><dl><div><dt>Name</dt><dd id="nav-profile-name">Loading</dd></div><div><dt>Username</dt><dd id="nav-profile-username">Loading</dd></div><div><dt>Email</dt><dd id="nav-profile-email">Loading</dd></div><div><dt>Role</dt><dd id="nav-profile-role">Loading</dd></div></dl></section><button id="nav-change-password" type="button">Change Password</button><button id="nav-logout-btn" type="button">Logout</button></div><div class="profile-password-modal" id="profile-password-modal" hidden><section class="profile-password-dialog auth-card" role="dialog" aria-modal="true" aria-labelledby="profile-password-title"><button class="profile-password-close" id="profile-password-close" type="button" aria-label="Close">&times;</button><p class="eyebrow eyebrow-blue"><span></span> ACCOUNT SECURITY</p><h1 id="profile-password-title">Change your <em>password</em></h1><p class="auth-subtitle">Choose a new password for your KLASIK CAFE account.</p><form id="profile-password-form" class="auth-form" novalidate><div class="form-field"><label for="profile-new-password">New password</label><div class="password-wrap"><input id="profile-new-password" type="password" autocomplete="new-password" placeholder="At least 8 characters, with letters and numbers" required><button class="password-toggle" type="button" data-password-toggle="profile-new-password" aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="eye-outline" d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/><path class="eye-slash" d="M4 4 20 20"/></svg></button></div></div><div class="form-field"><label for="profile-confirm-password">Confirm new password</label><div class="password-wrap"><input id="profile-confirm-password" type="password" autocomplete="new-password" placeholder="Enter your new password again" required><button class="password-toggle" type="button" data-password-toggle="profile-confirm-password" aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="eye-outline" d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/><path class="eye-slash" d="M4 4 20 20"/></svg></button></div></div><p class="form-message" id="profile-password-message" role="status" aria-live="polite"></p><button class="button button-primary button-wide" type="submit">Update password <span aria-hidden="true">&#8594;</span></button></form></section></div>';
  if (actions) actions.append(profileDropdown);
  else document.querySelector(".dashboard-primary-nav")?.append(profileDropdown);
  const profileToggle = profileDropdown.querySelector(".profile-dropdown-toggle");
  const profileMenu = profileDropdown.querySelector(".profile-dropdown-menu");
  profileToggle.addEventListener("click", () => {
    const open = profileToggle.getAttribute("aria-expanded") !== "true";
    profileToggle.setAttribute("aria-expanded", String(open));
    profileMenu.hidden = !open;
  });
  profileDropdown.querySelector("#nav-change-password").addEventListener("click", () => {
    profileMenu.hidden = true;
    profileToggle.setAttribute("aria-expanded", "false");
    profileDropdown.querySelector("#profile-password-modal").hidden = false;
    profileDropdown.querySelector("#profile-new-password").focus();
  });
  profileDropdown.querySelector("#profile-password-close").addEventListener("click", () => { profileDropdown.querySelector("#profile-password-modal").hidden = true; });
  profileDropdown.querySelector("#profile-password-modal").addEventListener("click", event => {
    if (event.target.id === "profile-password-modal") event.currentTarget.hidden = true;
  });
  document.addEventListener("click", event => {
    if (profileDropdown.contains(event.target)) return;
    profileToggle.setAttribute("aria-expanded", "false");
    profileMenu.hidden = true;
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    profileToggle.setAttribute("aria-expanded", "false");
    profileMenu.hidden = true;
  });
  const welcomeScreen = document.getElementById("welcome-screen");
  const tagline = document.getElementById("welcome-tagline");
  if (welcomeScreen && tagline) {
    const text = tagline.textContent.trim();
    let letterIndex = 0;
    tagline.replaceChildren(...Array.from(text).map((character) => {
      if (character === " ") return document.createTextNode(" ");
      const span = document.createElement("span");
      span.className = "tagline-letter";
      span.setAttribute("aria-hidden", "true");
      span.textContent = character;
      span.style.setProperty("--letter-index", String(letterIndex++));
      return span;
    }));
    const pageContent = [document.querySelector(".site-header"), document.querySelector("main"), document.querySelector(".site-footer")].filter(Boolean);
    pageContent.forEach((element) => { element.inert = true; });
    window.setTimeout(() => {
      welcomeScreen.classList.add("is-leaving");
      window.setTimeout(() => {
        pageContent.forEach((element) => { element.inert = false; });
        welcomeScreen.remove();
      }, 420);
    }, 1800);
  }

  const productAvailability = document.getElementById("product-availability");
  productAvailability?.addEventListener("change", () => {
    const label = document.getElementById("product-availability-label");
    if (label) label.textContent = productAvailability.checked ? "Available" : "Not Available";
  });
  const productBestSeller = document.getElementById("product-best-seller");
  productBestSeller?.addEventListener("change", () => {
    const label = productBestSeller.closest(".availability-switch")?.querySelector(".availability-label");
    if (label) label.textContent = productBestSeller.checked ? "Best Seller" : "Not Best Seller";
  });

  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = document.querySelector(".primary-nav");

  if (menuToggle && primaryNav) {
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      primaryNav.classList.remove("is-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      primaryNav.classList.toggle("is-open", !isOpen);
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const normalizeMainCategory = (value) => {
    const mapping = {
      iced: "coffee",
      hot: "coffee",
      "iced-coffee": "coffee",
      "hot-coffee": "coffee",
      "espesyal": "coffee",
      "espesyal2": "non-coffee",
      noncoffee: "non-coffee",
      "non-coffee": "non-coffee",
      matcha: "matcha",
      cookies: "pastries",
      smores: "pastries",
      cheesecakes: "pastries",
      pastry: "pastries",
      "add-ons": "add-ons"
    };

    return mapping[value] || value || "";
  };

  const normalizeSubcategory = (value) => {
    const mapping = {
      iced: "iced-coffee",
      hot: "hot-coffee",
      "espesyal2": "espesyal",
      noncoffee: "non-coffee",
      "non-coffee": "non-coffee",
      cookies: "cookies",
      smores: "smores",
      cheesecakes: "cheesecakes",
      "add-ons": "add-ons"
    };

    return mapping[value] || value || "";
  };

  document.addEventListener("click", (event) => {
    const mainButton = event.target.closest(".main-category-button");
    if (mainButton) {
      const group = mainButton.closest(".category-group");
      const list = group?.querySelector(".category-list");
      const menuSection = mainButton.closest(".favorites");

      document.querySelectorAll(".main-category-button").forEach((button) => {
        button.classList.toggle("is-active", button === mainButton);
      });

      document.querySelectorAll(".category-group").forEach((item) => {
        const isSelected = item === group;
        item.classList.toggle("is-open", isSelected);
        const itemList = item.querySelector(".category-list");
        if (itemList) itemList.classList.toggle("is-open", isSelected);
      });

      if (menuSection && list) {
        const firstSubcategory = list.querySelector(".category-chip");
        if (firstSubcategory) {
          firstSubcategory.click();
        }
      }
      if (menuSection && !list?.querySelector(".category-chip")) {
        menuSection.querySelectorAll(".category-chip[data-category]").forEach((chip) => {
          chip.classList.remove("category-active");
        });
        const selectedMainCategory = normalizeMainCategory(mainButton.dataset.mainCategory);
        menuSection.querySelectorAll(".product-card[data-main-category], .product-card[data-category], .product-card[data-best-seller]").forEach((card) => {
          const cardMainCategory = normalizeMainCategory(card.dataset.mainCategory || card.dataset.category);
          const isBestSeller = selectedMainCategory === "best-sellers" && card.dataset.bestSeller === "true";
          card.hidden = !isBestSeller && cardMainCategory !== selectedMainCategory;
        });
      }
      return;
    }

    const chip = event.target.closest(".category-chip[data-category]");
    if (!chip) return;

    const menuSection = chip.closest(".favorites");
    if (!menuSection) return;

    const selectedMainCategory = normalizeMainCategory(chip.dataset.mainCategory || chip.dataset.category);
    const selectedSubcategory = normalizeSubcategory(chip.dataset.subcategory || chip.dataset.category);

    menuSection.querySelectorAll(".category-chip[data-category]").forEach((item) => {
      item.classList.toggle("category-active", item === chip);
    });

    menuSection.querySelectorAll(".product-card[data-main-category], .product-card[data-category], .product-card[data-best-seller]").forEach((card) => {
      const cardMainCategory = normalizeMainCategory(card.dataset.mainCategory || card.dataset.category);
      const cardSubcategory = normalizeSubcategory(card.dataset.subcategory || card.dataset.category);
      const isBestSeller = selectedMainCategory === "best-sellers" && card.dataset.bestSeller === "true";
      const matchesMainCategory = cardMainCategory === selectedMainCategory;
      const matchesSubcategory = !selectedSubcategory || cardSubcategory === selectedSubcategory || (!card.dataset.subcategory && cardSubcategory === selectedSubcategory);
      const shouldShow = isBestSeller || (matchesMainCategory && matchesSubcategory);
      card.hidden = !shouldShow;
    });
  });

  document.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      if (!image.dataset.fallbackTried) {
        image.dataset.fallbackTried = "true";
        image.src = image.dataset.fallback;
        return;
      }

      const placeholder = image.parentElement?.querySelector(".media-placeholder");
      if (placeholder) placeholder.hidden = false;
      image.hidden = true;
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.setAttribute("aria-pressed", String(shouldShow));
      button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
      button.classList.toggle("is-visible", shouldShow);
    });
  });

  document.querySelectorAll("[data-demo-message]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const message = link.closest("form")?.querySelector(".form-message");
      if (message) {
        message.textContent = link.dataset.demoMessage;
        message.classList.remove("is-success");
      }
    });
  });

  const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const showMessage = (element, text, isSuccess = false) => {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("is-success", isSuccess);
  };

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    const message = loginForm.querySelector(".form-message");
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const identity = loginForm.elements.identity.value.trim();
      const password = loginForm.elements.password.value;

      if (!identity) return showMessage(message, "Please enter your email or username.");
      if (identity.includes("@") && !emailIsValid(identity)) return showMessage(message, "Please enter a valid email address.");
      if (!password) return showMessage(message, "Please enter your password.");

      const name = identity.includes("@") ? identity.split("@")[0] : identity;
      localStorage.setItem("klasikCafeCustomerSession", JSON.stringify({ name, identity, demo: true }));
      showMessage(message, "Login successful! Redirecting to the homepage...", true);
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 600);
    });
  }

  const signupForm = document.querySelector("#signup-form");
  if (signupForm) {
    const message = signupForm.querySelector(".form-message");
    const successPanel = document.querySelector("#signup-success");

    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstName = signupForm.elements.firstName.value.trim();
      const lastName = signupForm.elements.lastName.value.trim();
      const email = signupForm.elements.email.value.trim();
      const username = signupForm.elements.username.value.trim();
      const phone = signupForm.elements.phone.value.trim();
      const password = signupForm.elements.password.value;
      const confirmPassword = signupForm.elements.confirmPassword.value;
      const termsAccepted = signupForm.elements.terms.checked;

      if (!firstName) return showMessage(message, "Please enter your first name.");
      if (!lastName) return showMessage(message, "Please enter your last name.");
      if (!emailIsValid(email)) return showMessage(message, "Please enter a valid email address.");
      if (!username) return showMessage(message, "Please enter a username.");
      const phoneDigits = phone.replace(/\D/g, "");
      if (!/^[+\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return showMessage(message, "Please enter a valid phone number.");
      }
      if (!password) return showMessage(message, "Please enter a password.");
      if (password.length < 8) return showMessage(message, "Your password must be at least 8 characters long.");
      if (password !== confirmPassword) return showMessage(message, "Passwords do not match.");
      if (!termsAccepted) return showMessage(message, "Please accept the Terms and Conditions.");

      showMessage(message, "", true);
      if (successPanel) successPanel.hidden = false;
      signupForm.querySelector("button[type='submit']").hidden = true;
    });
  }

  window.klasikConfirm = (message, title = "Please Confirm") => new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "site-dialog-backdrop";
    backdrop.innerHTML = `
      <section class="site-dialog" role="alertdialog" aria-modal="true" aria-labelledby="site-dialog-title">
        <h2 id="site-dialog-title">${String(title).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character])}</h2>
        <p>${String(message).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character])}</p>
        <div class="site-dialog-actions"><button type="button" class="button button-outline" data-dialog-choice="cancel">Cancel</button><button type="button" class="button button-primary" data-dialog-choice="confirm">Confirm</button></div>
      </section>`;
    const close = (confirmed) => {
      document.removeEventListener("keydown", onKeydown);
      backdrop.remove();
      resolve(confirmed);
    };
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(false);
      const choice = event.target.closest("[data-dialog-choice]");
      if (choice) close(choice.dataset.dialogChoice === "confirm");
    });
    const onKeydown = (event) => {
      if (event.key !== "Escape" || !document.body.contains(backdrop)) return;
      close(false);
    };
    document.addEventListener("keydown", onKeydown);
    document.body.appendChild(backdrop);
    backdrop.querySelector("[data-dialog-choice='cancel']").focus();
  });

  window.klasikNotify = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `site-toast site-toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  };
});

document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll(".nav-link");
    
    // Dynamically find the sections based on your link hrefs
    const sections = Array.from(navLinks)
        .map(link => {
            const href = link.getAttribute("href");
            if (href && href.startsWith("#") && href.length > 1) {
                return document.querySelector(href);
            }
            return null;
        })
        .filter(Boolean); 

    // Updated options: Triggers when the element hits the top portion of the screen, regardless of its height
    const observerOptions = {
        root: null,
        rootMargin: "-80px 0px -60% 0px", 
        threshold: 0 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.getAttribute("id");
                
                navLinks.forEach(link => link.classList.remove("active"));
                
                const activeLink = document.querySelector(`.nav-link[href="#${activeId}"]`);
                if (activeLink) {
                    activeLink.classList.add("active");
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});
