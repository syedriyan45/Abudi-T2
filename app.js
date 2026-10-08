(() => {
  "use strict";

  const root = document.documentElement;
  const cart = new Map();

  const styles = document.createElement("style");
  styles.textContent = `
    .local-cart-count {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--copper);
      color: #fff;
      font: 700 9px/1 'JetBrains Mono', monospace;
    }
    .local-cart-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(18, 13, 10, .28);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
    }
    .local-cart-backdrop.is-open {
      opacity: 1;
      pointer-events: auto;
    }
    .local-cart-drawer {
      position: fixed;
      z-index: 41;
      top: 0;
      right: 0;
      width: min(420px, 100%);
      height: 100dvh;
      padding: 28px;
      overflow: auto;
      background: var(--background);
      color: var(--text);
      box-shadow: -24px 0 60px rgba(18, 13, 10, .16);
      transform: translateX(100%);
      transition: transform .25s ease;
    }
    .local-cart-drawer.is-open { transform: translateX(0); }
    .local-cart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--line-soft);
    }
    .local-cart-close {
      width: 36px;
      height: 36px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      color: var(--copper);
      cursor: pointer;
      font-size: 20px;
    }
    .local-cart-list {
      display: grid;
      gap: 12px;
      margin: 22px 0;
    }
    .local-cart-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--line-soft);
    }
    .local-cart-row small {
      display: block;
      margin-top: 4px;
      color: var(--text-dim);
      font: 10px/1.4 'JetBrains Mono', monospace;
    }
    .local-cart-row-info { min-width: 0; }
    .local-cart-row-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .local-cart-qty {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 6px;
      background: var(--surface);
    }
    .local-cart-qty-btn {
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--copper);
      cursor: pointer;
      font: 700 13px/1 'JetBrains Mono', monospace;
    }
    .local-cart-qty-btn:hover { background: var(--line-soft); }
    .local-cart-qty span {
      min-width: 14px;
      text-align: center;
      font: 600 12px/1 'JetBrains Mono', monospace;
    }
    .local-cart-remove {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text-dim);
      cursor: pointer;
      font-size: 15px;
      line-height: 1;
    }
    .local-cart-remove:hover {
      color: #fff;
      background: var(--copper);
      border-color: var(--copper);
    }
    .local-cart-empty {
      padding: 42px 0;
      color: var(--text-dim);
      text-align: center;
    }
    .local-cart-footer {
      padding-top: 18px;
      border-top: 1px solid var(--line-soft);
    }
    .local-cart-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 18px;
      font-family: var(--font-heading);
      font-weight: 600;
    }
    .local-cart-order {
      width: 100%;
      border: 0;
      border-radius: 999px;
      padding: 13px 18px;
      background: var(--copper);
      color: #fff;
      cursor: pointer;
      font: 600 13px/1 'DM Sans Variable', sans-serif;
    }
    .local-cart-order:disabled {
      cursor: not-allowed;
      opacity: .45;
    }
  `;
  document.head.appendChild(styles);

  const themeButton = document.querySelector('[data-testid="theme-toggle-button"]');
  const storedTheme = localStorage.getItem("abudi-theme");
  if (storedTheme === "dark") root.classList.add("dark");

  themeButton?.addEventListener("click", () => {
    root.classList.toggle("dark");
    localStorage.setItem("abudi-theme", root.classList.contains("dark") ? "dark" : "light");
  });

  const filterButtons = [...document.querySelectorAll('[data-testid^="category-filter-"]')];
  const categorySections = [...document.querySelectorAll('[data-testid^="menu-category-"]')];
  const searchInput = document.querySelector('input[placeholder="Search the menu"]');
  let activeCategory = "all";

  const setButtonState = (button, active) => {
    if (!button) return;
    button.classList.toggle("border-[var(--copper)]", active);
    button.classList.toggle("bg-[var(--copper)]", active);
    button.classList.toggle("text-white", active);
    button.classList.toggle("border-[var(--line)]", !active);
    button.classList.toggle("bg-[var(--surface)]", !active);
    button.classList.toggle("text-[var(--text-dim)]", !active);
  };

  const applyFilters = () => {
    const query = (searchInput?.value || "").trim().toLowerCase();
    categorySections.forEach((section) => {
      const category = (section.dataset.testid || "").replace("menu-category-", "");
      const categoryVisible = activeCategory === "all" || category === activeCategory;
      let visibleItems = 0;

      section.querySelectorAll("article").forEach((article) => {
        const text = article.textContent.toLowerCase();
        const visible = categoryVisible && (!query || text.includes(query));
        article.style.display = visible ? "" : "none";
        if (visible) visibleItems += 1;
      });

      section.style.display = visibleItems ? "" : "none";
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = (button.dataset.testid || "").replace("category-filter-", "");
      filterButtons.forEach((candidate) => setButtonState(candidate, candidate === button));
      applyFilters();
    });
  });
  searchInput?.addEventListener("input", applyFilters);

  const cartButton = document.querySelector('[data-testid="header-cart-button"]');
  let countBadge = null;
  if (cartButton) {
    countBadge = document.createElement("span");
    countBadge.className = "local-cart-count";
    countBadge.hidden = true;
    cartButton.appendChild(countBadge);
  }

  const backdrop = document.createElement("div");
  backdrop.className = "local-cart-backdrop";
  const drawer = document.createElement("aside");
  drawer.className = "local-cart-drawer";
  drawer.setAttribute("aria-label", "Your order");
  document.body.append(backdrop, drawer);

  const money = (value) => `₹${value}`;
  const parsePrice = (text) => Number(String(text).replace(/[^\d]/g, "")) || 0;

  const renderCart = () => {
    const items = [...cart.values()];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (countBadge) {
      countBadge.textContent = String(count);
      countBadge.hidden = count === 0;
    }

    drawer.innerHTML = `
      <div class="local-cart-head">
        <div>
          <div class="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--copper)]">Table-side ordering</div>
          <h2 class="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em]">Your order</h2>
        </div>
        <button class="local-cart-close" type="button" aria-label="Close cart">×</button>
      </div>
      <div class="local-cart-list">
        ${
          items.length
            ? items.map((item) => `
              <div class="local-cart-row" data-name="${escapeAttr(item.name)}">
                <div class="local-cart-row-info">
                  <strong>${item.name}</strong>
                  <small>${item.quantity} × ${money(item.price)}</small>
                </div>
                <div class="local-cart-row-right">
                  <div class="local-cart-qty">
                    <button type="button" class="local-cart-qty-btn" data-action="decrement" aria-label="Remove one ${item.name}">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" class="local-cart-qty-btn" data-action="increment" aria-label="Add one more ${item.name}">+</button>
                  </div>
                  <strong>${money(item.price * item.quantity)}</strong>
                  <button type="button" class="local-cart-remove" data-action="remove" aria-label="Remove ${item.name} from order">×</button>
                </div>
              </div>
            `).join("")
            : '<div class="local-cart-empty">Your table is waiting for something good.</div>'
        }
      </div>
      <div class="local-cart-footer">
        <div class="local-cart-total"><span>Total</span><span>${money(total)}</span></div>
        <button class="local-cart-order" type="button" ${items.length ? "" : "disabled"}>Send order to the kitchen</button>
      </div>
    `;

    drawer.querySelector(".local-cart-close")?.addEventListener("click", closeCart);

    drawer.querySelector(".local-cart-list")?.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;
      const row = actionButton.closest(".local-cart-row");
      const name = row?.dataset.name;
      if (!name || !cart.has(name)) return;

      const action = actionButton.dataset.action;
      if (action === "increment") {
        const item = cart.get(name);
        cart.set(name, { ...item, quantity: item.quantity + 1 });
      } else if (action === "decrement") {
        const item = cart.get(name);
        if (item.quantity <= 1) {
          cart.delete(name);
        } else {
          cart.set(name, { ...item, quantity: item.quantity - 1 });
        }
      } else if (action === "remove") {
        cart.delete(name);
      }
      renderCart();
    });

    drawer.querySelector(".local-cart-order")?.addEventListener("click", () => {
      if (!items.length) return;
      submitOrder(items, total);
    });
  };

  function escapeAttr(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  const ORDERS_KEY = "abudi-orders";
  const TABLE_NUMBER = 2;

  function submitOrder(items, total) {
    const order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      table: TABLE_NUMBER,
      items: items.map(({ name, price, quantity }) => ({ name, price, quantity })),
      total,
      placedAt: new Date().toISOString(),
      status: "new",
    };

    let orders = [];
    try {
      orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    } catch {
      orders = [];
    }
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    // Notify any open admin view immediately, even within the same tab
    // (the native "storage" event only fires in *other* tabs/windows).
    window.dispatchEvent(new CustomEvent("abudi-orders-updated", { detail: orders }));

    cart.clear();
    renderCart();
    closeCart();
    window.alert(`Order ${order.id} sent to the kitchen! The admin has been notified.`);
  }

  const openCart = () => {
    renderCart();
    backdrop.classList.add("is-open");
    drawer.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  function closeCart() {
    backdrop.classList.remove("is-open");
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  backdrop.addEventListener("click", closeCart);
  cartButton?.addEventListener("click", openCart);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  document.querySelectorAll('[data-testid^="add-item-"]').forEach((button) => {
    button.addEventListener("click", () => {
      const article = button.closest("article");
      const name = article?.querySelector('[data-testid^="menu-item-name-"]')?.textContent.trim() || "Menu item";
      const price = parsePrice(article?.querySelector('[data-testid^="menu-item-price-"]')?.textContent || "0");
      const existing = cart.get(name);
      cart.set(name, { name, price, quantity: (existing?.quantity || 0) + 1 });
      button.animate(
        [{ transform: "scale(1)" }, { transform: "scale(.88)" }, { transform: "scale(1)" }],
        { duration: 220, easing: "ease-out" }
      );
      renderCart();
    });
  });

  applyFilters();
})();