(() => {
  "use strict";

  const root = document.documentElement;
  const cart = new Map();

  /* =========================================================
     CONFIGURATION
  ========================================================= */

  const ORDERS_KEY = "abudi-orders";
  const LAST_ORDER_KEY = "abudi-last-placed-order";
  const AVAILABILITY_KEY = "abudi-menu-availability";

  /* =========================================================
     FIREBASE / FIRESTORE — CUSTOMER ORDERS
     Orders are written to the same Firestore collection
     that the kitchen dashboard listens to.
  ========================================================= */

  let firestoreDb = null;
  let firestoreAddDoc = null;
  let firestoreCollection = null;

  const firestoreReady = Promise.all([
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
  ]).then(([firebaseAppModule, firestoreModule]) => {
    const firebaseConfig = {
      apiKey: "AIzaSyCHmFL2Mq8h84tSM0DhMI43mf7rgcIeuqg",
      authDomain: "abudi-cafe.firebaseapp.com",
      projectId: "abudi-cafe",
      storageBucket: "abudi-cafe.firebasestorage.app",
      messagingSenderId: "1051106284305",
      appId: "1:1051106284305:web:510db4835c5f91d0bc72b0"
    };

    const app = firebaseAppModule.initializeApp(firebaseConfig);
    firestoreDb = firestoreModule.getFirestore(app);
    firestoreAddDoc = firestoreModule.addDoc;
    firestoreCollection = firestoreModule.collection;
    return firestoreDb;
  }).catch(error => {
    console.error("ABUDI Firebase initialization failed:", error);
    throw error;
  });


  /*
    TABLE NUMBER

    Examples:
    index.html?t=1 → Table 1
    index.html?t=2 → Table 2
    index.html?t=3 → Table 3

    If no table is provided:
    Table 1 is used.
  */

  const urlParams = new URLSearchParams(
    window.location.search
  );

  const tableFromUrl = urlParams.get("t");

  const TABLE_NUMBER =
    tableFromUrl && /^\d+$/.test(tableFromUrl)
      ? tableFromUrl
      : "1";


  /* =========================================================
     STYLES
  ========================================================= */

  const styles = document.createElement("style");

  styles.textContent = `

    /* =====================================================
       CART BADGE
    ===================================================== */

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

      font:
        700 9px/1
        'JetBrains Mono',
        monospace;
    }


    /* =====================================================
       STICKY REVIEW CART
    ===================================================== */

    .sticky-review-cart {
      position: fixed;

      left: 50%;
      bottom: 20px;

      z-index: 50;

      width:
        min(
          560px,
          calc(100% - 28px)
        );

      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 14px;

      padding:
        12px
        14px
        12px
        18px;

      background: var(--background);
      color: var(--text);

      border:
        1px solid var(--line);

      border-radius: 999px;

      box-shadow:
        0 18px 50px
        rgba(18, 13, 10, .20),
        0 4px 16px
        rgba(18, 13, 10, .08);

      transform:
        translate(
          -50%,
          calc(100% + 40px)
        );

      opacity: 0;

      pointer-events: none;

      transition:
        transform .3s
        cubic-bezier(.22,1,.36,1),
        opacity .25s ease;
    }


    .sticky-review-cart.is-visible {
      transform:
        translate(-50%, 0);

      opacity: 1;

      pointer-events: auto;
    }


    .sticky-review-info {
      min-width: 0;

      display: flex;
      align-items: center;

      gap: 12px;
    }


    .sticky-review-icon {
      width: 38px;
      height: 38px;

      flex-shrink: 0;

      display: grid;
      place-items: center;

      border-radius: 50%;

      background: var(--copper);
      color: #fff;

      font-size: 17px;
    }


    .sticky-review-text {
      min-width: 0;
    }


    .sticky-review-count {
      font:
        600 11px/1.2
        'JetBrains Mono',
        monospace;

      color: var(--text-dim);

      text-transform: uppercase;

      letter-spacing: .05em;
    }


    .sticky-review-total {
      margin-top: 3px;

      font-family:
        var(--font-heading);

      font-size: 16px;

      font-weight: 600;
    }


    .sticky-review-button {
      flex-shrink: 0;

      border: 0;

      border-radius: 999px;

      padding:
        12px 20px;

      background: var(--copper);
      color: #fff;

      cursor: pointer;

      font:
        600 13px/1
        'DM Sans Variable',
        sans-serif;

      transition:
        transform .15s ease,
        opacity .15s ease;
    }


    .sticky-review-button:hover {
      transform:
        translateY(-1px);

      opacity: .92;
    }


    .sticky-review-button:active {
      transform:
        scale(.97);
    }


    /* =====================================================
       UNAVAILABLE ITEM
    ===================================================== */

    .local-item-unavailable {
      margin-top: 7px;

      color: #c0392b;

      font:
        700 11px/1.3
        'DM Sans Variable',
        sans-serif;
    }


    /* =====================================================
       DISABLED ADD BUTTON
    ===================================================== */

    [data-testid^="add-item-"]:disabled {
      opacity: .45 !important;

      cursor:
        not-allowed !important;

      pointer-events: auto;
    }


    /* =====================================================
       MOBILE
    ===================================================== */

    @media (max-width: 520px) {

      .sticky-review-cart {
        bottom: 12px;

        width:
          calc(100% - 20px);

        padding:
          10px
          10px
          10px
          14px;
      }


      .sticky-review-icon {
        width: 34px;
        height: 34px;

        font-size: 15px;
      }


      .sticky-review-total {
        font-size: 14px;
      }


      .sticky-review-button {
        padding:
          11px 15px;

        font-size: 12px;
      }

    }


    /* =====================================================
       CART BACKDROP
    ===================================================== */

    .local-cart-backdrop {
      position: fixed;

      inset: 0;

      z-index: 40;

      background:
        rgba(18, 13, 10, .28);

      opacity: 0;

      pointer-events: none;

      transition:
        opacity .2s ease;
    }


    .local-cart-backdrop.is-open {
      opacity: 1;

      pointer-events: auto;
    }


    /* =====================================================
       CART DRAWER
    ===================================================== */

    .local-cart-drawer {
      position: fixed;

      z-index: 41;

      top: 0;
      right: 0;

      width:
        min(
          420px,
          100%
        );

      height: 100dvh;

      padding: 28px;

      overflow: auto;

      background:
        var(--background);

      color:
        var(--text);

      box-shadow:
        -24px 0 60px
        rgba(18, 13, 10, .16);

      transform:
        translateX(100%);

      transition:
        transform .25s ease;
    }


    .local-cart-drawer.is-open {
      transform:
        translateX(0);
    }


    .local-cart-head {
      display: flex;

      align-items: center;

      justify-content: space-between;

      gap: 16px;

      padding-bottom: 20px;

      border-bottom:
        1px solid
        var(--line-soft);
    }


    .local-cart-close {
      width: 36px;
      height: 36px;

      border:
        1px solid
        var(--line);

      border-radius: 999px;

      background:
        var(--surface);

      color:
        var(--copper);

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

      border-bottom:
        1px solid
        var(--line-soft);
    }


    .local-cart-row small {
      display: block;

      margin-top: 4px;

      color:
        var(--text-dim);

      font:
        10px/1.4
        'JetBrains Mono',
        monospace;
    }


    .local-cart-row-info {
      min-width: 0;
    }


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

      border:
        1px solid
        var(--line);

      border-radius: 999px;

      padding: 4px 6px;

      background:
        var(--surface);
    }


    .local-cart-qty-btn {
      width: 22px;
      height: 22px;

      display: grid;

      place-items: center;

      border: 0;

      border-radius: 999px;

      background:
        transparent;

      color:
        var(--copper);

      cursor: pointer;

      font:
        700 13px/1
        'JetBrains Mono',
        monospace;
    }


    .local-cart-qty-btn:hover {
      background:
        var(--line-soft);
    }


    .local-cart-qty span {
      min-width: 14px;

      text-align: center;

      font:
        600 12px/1
        'JetBrains Mono',
        monospace;
    }


    .local-cart-remove {
      width: 26px;
      height: 26px;

      display: grid;

      place-items: center;

      border:
        1px solid
        var(--line);

      border-radius: 999px;

      background:
        var(--surface);

      color:
        var(--text-dim);

      cursor: pointer;

      font-size: 15px;

      line-height: 1;
    }


    .local-cart-remove:hover {
      color: #fff;

      background:
        var(--copper);

      border-color:
        var(--copper);
    }


    .local-cart-empty {
      padding: 42px 0;

      color:
        var(--text-dim);

      text-align: center;
    }


    .local-last-order {
      margin: 10px 0;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--surface);
    }

    .local-last-order-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--copper);
      font-weight: 700;
    }

    .local-last-order-id {
      margin-top: 6px;
      color: var(--text-dim);
      font-size: 12px;
    }

    .local-last-order-items {
      margin-top: 14px;
      border-top: 1px solid var(--line-soft);
    }

    .local-last-order-row,
    .local-last-order-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--line-soft);
    }

    .local-last-order-total {
      border-bottom: 0;
      padding-bottom: 0;
      font-size: 16px;
    }

    .local-cart-footer {
      padding-top: 18px;

      border-top:
        1px solid
        var(--line-soft);
    }


    .local-cart-total {
      display: flex;

      justify-content:
        space-between;

      align-items:
        baseline;

      margin-bottom: 18px;

      font-family:
        var(--font-heading);

      font-weight: 600;
    }


    .local-cart-order {
      width: 100%;

      border: 0;

      border-radius: 999px;

      padding:
        13px 18px;

      background:
        var(--copper);

      color: #fff;

      cursor: pointer;

      font:
        600 13px/1
        'DM Sans Variable',
        sans-serif;
    }


    .local-cart-order:disabled {
      cursor:
        not-allowed;

      opacity: .45;
    }


    .local-cart-back {
      width: 100%;

      border:
        1px solid
        var(--line);

      border-radius: 999px;

      padding:
        11px 18px;

      margin-bottom: 10px;

      background:
        var(--surface);

      color:
        var(--text);

      cursor: pointer;

      font:
        600 13px/1
        'DM Sans Variable',
        sans-serif;
    }


    /* =====================================================
       CHECKOUT
    ===================================================== */

    .local-cart-form {
      display: grid;

      gap: 16px;

      margin: 22px 0;
    }


    .local-cart-field {
      display: grid;

      gap: 6px;
    }


    .local-cart-field span {
      font:
        600 11px/1.2
        'JetBrains Mono',
        monospace;

      text-transform: uppercase;

      letter-spacing: .06em;

      color:
        var(--text-dim);
    }


    .local-cart-field input,
    .local-cart-field textarea {
      width: 100%;

      border:
        1px solid
        var(--line);

      border-radius: 10px;

      padding:
        10px 12px;

      background:
        var(--surface);

      color:
        var(--text);

      font:
        400 13px/1.4
        'DM Sans Variable',
        sans-serif;

      box-sizing:
        border-box;
    }


    .local-cart-field textarea {
      min-height: 72px;

      resize: vertical;
    }


    .local-cart-field input:focus,
    .local-cart-field textarea:focus {
      outline: none;

      border-color:
        var(--copper);
    }


    .local-cart-field.has-error input {
      border-color:
        #c0392b;
    }


    .local-cart-error {
      font:
        400 11px/1.3
        'DM Sans Variable',
        sans-serif;

      color:
        #c0392b;
    }


    .local-cart-summary {
      margin: 22px 0;

      padding:
        14px 16px;

      border:
        1px solid
        var(--line-soft);

      border-radius: 12px;

      background:
        var(--surface);

      display: grid;

      gap: 6px;
    }


    .local-cart-summary-row {
      display: flex;

      justify-content:
        space-between;

      gap: 10px;

      font:
        400 12px/1.4
        'DM Sans Variable',
        sans-serif;

      color:
        var(--text-dim);
    }


    /* =====================================================
       ABUDI RESPONSIVE + BRANDING
       Works across phones, foldables, tablets and laptops.
    ===================================================== */

    html,
    body {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
    }

    .abudi-logo-box {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      overflow: hidden;
      display: grid;
      place-items: center;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--surface-strong);
    }

    .abudi-logo-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .abudi-menu-image-box {
      width: 84px;
      height: 84px;
      flex: 0 0 84px;
    }

    /* Search should stay easy to use on narrow screens. */
    [data-testid="menu-section"] [data-testid="menu-search-input"] {
      width: 100%;
      box-sizing: border-box;
    }

    /* Keep menu cards comfortable at intermediate/fold widths. */
    [data-testid^="menu-item-"] {
      min-width: 0;
    }

    [data-testid^="menu-item-"] h3 {
      overflow-wrap: anywhere;
    }

    /* Category pills can scroll horizontally instead of breaking layout. */
    [data-testid="category-filter-list"] {
      max-width: 100%;
      overscroll-behavior-x: contain;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 639px) {
      .abudi-logo-box {
        width: 40px;
        height: 40px;
        flex-basis: 40px;
        border-radius: 11px;
      }

      .abudi-menu-image-box {
        width: 76px;
        height: 76px;
        flex-basis: 76px;
      }

      [data-testid="site-header"] {
        padding-top: 14px;
        padding-bottom: 14px;
      }

      [data-testid="hero-section"] {
        padding-top: 28px;
      }

      [data-testid="hero-heading"] {
        font-size: clamp(2.7rem, 14vw, 4rem);
      }

      [data-testid="hero-image-collage"] {
        min-height: 300px;
      }

      [data-testid="menu-section"] {
        scroll-margin-top: 12px;
      }

      .sticky-review-cart {
        width: calc(100% - 16px);
      }
    }

    @media (min-width: 640px) and (max-width: 1024px) {
      .abudi-menu-image-box {
        width: 82px;
        height: 82px;
        flex-basis: 82px;
      }

      [data-testid="hero-section"] {
        grid-template-columns: 1fr;
      }

      [data-testid="hero-image-collage"] {
        min-height: 380px;
      }
    }

    @media (min-width: 1025px) {
      .abudi-menu-image-box {
        width: 84px;
        height: 84px;
        flex-basis: 84px;
      }
    }

    @media (max-width: 380px) {
      [data-testid="site-header"] {
        padding-left: 12px;
        padding-right: 12px;
      }

      .abudi-menu-image-box {
        width: 72px;
        height: 72px;
        flex-basis: 72px;
      }

      [data-testid^="menu-item-"] {
        gap: 8px;
      }

      [data-testid^="menu-item-"] > div:first-child {
        gap: 9px;
      }
    }


    /* =========================================================
       SEARCH CLEAR BUTTON
    ========================================================= */

    .abudi-search-clear {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--text-dim);
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      z-index: 2;
    }

    .abudi-search-clear:hover {
      color: var(--copper);
      background: var(--surface-strong);
    }

    [data-testid="menu-search-input"] {
      padding-right: 48px !important;
    }

  `;

  document.head.appendChild(styles);


  const themeButton =
    document.querySelector(
      '[data-testid="theme-toggle-button"]'
    );

  const storedTheme =
    localStorage.getItem(
      "abudi-theme"
    );


  /* Dark mode is the default. A saved light choice is still respected. */
  if (storedTheme !== "light") {

    root.classList.add("dark");

  }


  themeButton?.addEventListener(
    "click",
    () => {

      root.classList.toggle(
        "dark"
      );

      localStorage.setItem(
        "abudi-theme",

        root.classList.contains(
          "dark"
        )
          ? "dark"
          : "light"
      );

    }
  );


  /* =========================================================
     FILTERS
  ========================================================= */

  const filterButtons = [
    ...document.querySelectorAll(
      'button[data-testid^="category-filter-"]'
    )
  ];

  const categorySections = [
    ...document.querySelectorAll(
      'section[data-testid^="menu-category-"]'
    )
  ];

  const searchInput = document.querySelector(
    'input[placeholder="Search the menu"]'
  );

  let searchClearButton = null;

  if (searchInput) {
    const searchWrap = searchInput.parentElement;
    if (searchWrap) {
      searchWrap.style.position = "relative";
      searchClearButton = document.createElement("button");
      searchClearButton.type = "button";
      searchClearButton.className = "abudi-search-clear";
      searchClearButton.setAttribute("aria-label", "Clear search");
      searchClearButton.setAttribute("title", "Clear search");
      searchClearButton.innerHTML = "×";
      searchClearButton.hidden = true;
      searchWrap.appendChild(searchClearButton);
      searchClearButton.addEventListener("click", () => {
        searchInput.value = "";
        searchInput.focus();
        applyFilters();
      });
    }
  }

  let activeCategory = "all";

  const setButtonState = (button, active) => {
    if (!button) return;

    button.classList.toggle(
      "border-[var(--copper)]",
      active
    );
    button.classList.toggle(
      "bg-[var(--copper)]",
      active
    );
    button.classList.toggle(
      "text-white",
      active
    );
    button.classList.toggle(
      "border-[var(--line)]",
      !active
    );
    button.classList.toggle(
      "bg-[var(--surface)]",
      !active
    );
    button.classList.toggle(
      "text-[var(--text-dim)]",
      !active
    );
  };

  const applyFilters = () => {
    const query = (searchInput?.value || "")
      .trim()
      .toLowerCase();

    if (searchClearButton) {
      searchClearButton.hidden = !query;
    }

    let totalVisible = 0;

    categorySections.forEach(section => {
      // Use the explicit data-category from the HTML.
      const category = (
        section.getAttribute("data-category") ||
        section.dataset.testid?.replace("menu-category-", "") ||
        ""
      ).toLowerCase();

      const categoryMatch =
        activeCategory === "all" ||
        category === activeCategory;

      let visibleItems = 0;

      section.querySelectorAll(
        'article[data-testid^="menu-item-"]'
      ).forEach(article => {
        const itemName =
          article.querySelector(
            '[data-testid^="menu-item-name-"]'
          )?.textContent
            ?.trim()
            .toLowerCase() || "";

        const visible =
          categoryMatch &&
          (!query || itemName.includes(query));

        article.style.display = visible ? "" : "none";

        if (visible) {
          article.style.visibility = "visible";
          article.style.opacity = "1";
          article.style.transform = "none";
          visibleItems++;
          totalVisible++;
        }
      });

      section.style.display =
        visibleItems > 0 ? "" : "none";

      if (visibleItems > 0) {
        section.style.visibility = "visible";
        section.style.opacity = "1";
        section.style.transform = "none";
      }
    });

    let noResults = document.querySelector(
      "[data-abudi-no-results]"
    );

    if (query && totalVisible === 0) {
      if (!noResults) {
        noResults = document.createElement("div");
        noResults.setAttribute(
          "data-abudi-no-results",
          ""
        );
        noResults.className =
          "mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] px-5 py-6 text-center text-sm text-[var(--text-dim)]";

        document
          .querySelector('[data-testid="category-filter-list"]')
          ?.insertAdjacentElement(
            "afterend",
            noResults
          );
      }

      noResults.textContent =
        `No menu item found for “${searchInput?.value.trim()}”.`;
      noResults.style.display = "";
    } else if (noResults) {
      noResults.style.display = "none";
    }
  };

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = (
        button.getAttribute("data-testid") || ""
      ).replace("category-filter-", "");

      filterButtons.forEach(candidate => {
        setButtonState(
          candidate,
          candidate === button
        );
      });

      applyFilters();
    });
  });

  searchInput?.addEventListener(
    "input",
    applyFilters
  );

  /* =========================================================
     CART BUTTON
  ========================================================= */

  const cartButton =
    document.querySelector(
      '[data-testid="header-cart-button"]'
    );


  let countBadge =
    null;


  if (cartButton) {

    if (
      getComputedStyle(
        cartButton
      ).position === "static"
    ) {

      cartButton.style.position =
        "relative";

    }


    countBadge =
      document.createElement(
        "span"
      );


    countBadge.className =
      "local-cart-count";


    countBadge.hidden =
      true;


    cartButton.appendChild(
      countBadge
    );

  }


  /* =========================================================
     STICKY CART
  ========================================================= */

  const stickyCart =
    document.createElement(
      "div"
    );


  stickyCart.className =
    "sticky-review-cart";


  stickyCart.innerHTML = `

    <div class="sticky-review-info">

      <div class="sticky-review-icon">
        🛒
      </div>

      <div class="sticky-review-text">

        <div
          class="sticky-review-count">

          <span data-cart-count>
            0
          </span>

          item(s)

        </div>

        <div
          class="sticky-review-total"
          data-cart-total>

          ₹0

        </div>

      </div>

    </div>


    <button
      type="button"
      class="sticky-review-button">

      Review cart →

    </button>

  `;


  document.body.appendChild(
    stickyCart
  );


  const stickyCount =
    stickyCart.querySelector(
      "[data-cart-count]"
    );


  const stickyTotal =
    stickyCart.querySelector(
      "[data-cart-total]"
    );


  const stickyReviewButton =
    stickyCart.querySelector(
      ".sticky-review-button"
    );


  /* =========================================================
     CART DRAWER
  ========================================================= */

  const backdrop =
    document.createElement(
      "div"
    );


  backdrop.className =
    "local-cart-backdrop";


  const drawer =
    document.createElement(
      "aside"
    );


  drawer.className =
    "local-cart-drawer";


  drawer.setAttribute(
    "aria-label",
    "Your order"
  );


  document.body.append(
    backdrop,
    drawer
  );


  /* =========================================================
     MONEY
  ========================================================= */

  const money =
    value =>
      `₹${Number(value || 0)}`;


  const parsePrice =
    text =>
      Number(
        String(text)
          .replace(
            /[^\d.]/g,
            ""
          )
      ) || 0;


  /* =========================================================
     CHECKOUT STATE
  ========================================================= */

  let checkoutStep =
    false;


  let customerInfo = {

    name: "",

    phone: "",

    notes: ""

  };


  let fieldErrors =
    {};


  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeAttr(
    value
  ) {

    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      );

  }


  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* =========================================================
     AVAILABILITY
  ========================================================= */

  function getMenuAvailability() {

    try {

      const data =
        JSON.parse(
          localStorage.getItem(
            AVAILABILITY_KEY
          ) || "{}"
        );


      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {

        return data;

      }

    } catch {

      // Ignore invalid data.

    }


    return {};

  }


  function isMenuItemAvailable(
    itemName
  ) {

    const availability =
      getMenuAvailability();


    /*
      Items are available by default.
    */

    return (
      availability[itemName] !==
      false
    );

  }


  /* =========================================================
     UPDATE MENU AVAILABILITY UI
  ========================================================= */

  function updateMenuAvailabilityUI() {

    const availability =
      getMenuAvailability();


    document
      .querySelectorAll(
        '[data-testid^="add-item-"]'
      )
      .forEach(
        button => {

          const article =
            button.closest(
              "article"
            );


          if (!article) {
            return;
          }


          const name =
            article
              .querySelector(
                '[data-testid^="menu-item-name-"]'
              )
              ?.textContent
              .trim();


          if (!name) {
            return;
          }


          const available =
            availability[name] !==
            false;


          /*
            Disable button.
          */

          button.disabled =
            !available;


          button.style.opacity =
            available
              ? ""
              : "0.45";


          button.style.cursor =
            available
              ? ""
              : "not-allowed";


          /*
            Find unavailable label.
          */

          let unavailableLabel =
            article.querySelector(
              ".local-item-unavailable"
            );


          if (!available) {

            if (
              !unavailableLabel
            ) {

              unavailableLabel =
                document.createElement(
                  "div"
                );


              unavailableLabel.className =
                "local-item-unavailable";


              unavailableLabel.textContent =
                "Currently unavailable";


              /*
                Try to put label near
                the add button.
              */

              const buttonParent =
                button.parentElement;


              if (
                buttonParent
              ) {

                buttonParent.appendChild(
                  unavailableLabel
                );

              } else {

                article.appendChild(
                  unavailableLabel
                );

              }

            }

          } else {

            unavailableLabel?.remove();

          }

        }
      );

  }


  /* =========================================================
     AVAILABILITY STORAGE EVENT
  ========================================================= */

  window.addEventListener(
    "storage",
    event => {

      if (
        event.key ===
        AVAILABILITY_KEY
      ) {

        updateMenuAvailabilityUI();

      }

    }
  );


  /* =========================================================
     AVAILABILITY CUSTOM EVENT
  ========================================================= */

  window.addEventListener(
    "abudi-availability-updated",
    () => {

      updateMenuAvailabilityUI();

    }
  );


  /* =========================================================
     UPDATE STICKY CART
  ========================================================= */

  function updateStickyCart() {

    const items =
      [...cart.values()];


    const count =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.quantity,

        0
      );


    const total =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          (
            item.price *
            item.quantity
          ),

        0
      );


    stickyCount.textContent =
      String(count);


    stickyTotal.textContent =
      money(total);


    if (count > 0) {

      stickyCart.classList.add(
        "is-visible"
      );

    } else {

      stickyCart.classList.remove(
        "is-visible"
      );

    }

  }


  /* =========================================================
     LAST PLACED ORDER
     Keep the customer's most recent order visible after checkout.
  ========================================================= */

  function getLastPlacedOrder() {
    try {
      const order = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || "null");
      return order && typeof order === "object" ? order : null;
    } catch {
      return null;
    }
  }

  function saveLastPlacedOrder(order) {
    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      // Ignore storage errors.
    }
  }

  function renderLastPlacedOrder(order) {
    if (!order || !Array.isArray(order.items) || !order.items.length) {
      return `
        <div class="local-cart-empty">
          Your table is waiting for something good.
        </div>`;
    }

    return `
      <div class="local-last-order">
        <div class="local-last-order-status">
          <span>Sent to kitchen</span>
          <span>●</span>
        </div>
        <div class="local-last-order-id">
          ${escapeHtml(order.id || "")} · Table ${escapeHtml(order.table || TABLE_NUMBER)}
        </div>
        <div class="local-last-order-items">
          ${order.items.map(item => `
            <div class="local-last-order-row">
              <span>${escapeHtml(item.name)} ×${Number(item.quantity || 0)}</span>
              <span>${money(Number(item.price || 0) * Number(item.quantity || 0))}</span>
            </div>`).join("")}
        </div>
        <div class="local-last-order-total">
          <span>Total so far</span>
          <strong>${money(order.total)}</strong>
        </div>
      </div>`;
  }


  /* =========================================================
     RENDER CART
  ========================================================= */

  const renderCart =
    () => {

      const items =
        [...cart.values()];


      const count =
        items.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.quantity,

          0
        );


      const total =
        items.reduce(
          (
            sum,
            item
          ) =>
            sum +
            (
              item.price *
              item.quantity
            ),

          0
        );


      /* Header badge */

      if (countBadge) {

        countBadge.textContent =
          String(count);

        countBadge.hidden =
          count === 0;

      }


      /* Sticky bar */

      updateStickyCart();


      /* Checkout */

      if (checkoutStep) {

        renderCheckoutForm(
          items,
          total
        );

        return;

      }


      /* Cart */

      drawer.innerHTML = `

        <div class="local-cart-head">

          <div>

            <div
              class="
                font-mono
                text-[10px]
                uppercase
                tracking-[0.22em]
                text-[var(--copper)]
              ">

              Table
              ${escapeHtml(
                TABLE_NUMBER
              )}

            </div>


            <h2
              class="
                mt-2
                font-heading
                text-3xl
                font-semibold
                tracking-[-0.04em]
              ">

              Your order

            </h2>

          </div>


          <button
            class="local-cart-close"
            type="button"
            aria-label="Close cart">

            ×

          </button>

        </div>


        <div class="local-cart-list">

          ${
            items.length

              ? items.map(
                  item => `

                    <div
                      class="local-cart-row"
                      data-name="${escapeAttr(
                        item.name
                      )}">

                      <div
                        class="
                          local-cart-row-info
                        ">

                        <strong>

                          ${escapeHtml(
                            item.name
                          )}

                        </strong>


                        <small>

                          ${item.quantity}
                          ×
                          ${money(
                            item.price
                          )}

                        </small>

                      </div>


                      <div
                        class="
                          local-cart-row-right
                        ">

                        <div
                          class="
                            local-cart-qty
                          ">

                          <button
                            type="button"
                            class="
                              local-cart-qty-btn
                            "
                            data-action="decrement">

                            −

                          </button>


                          <span>

                            ${item.quantity}

                          </span>


                          <button
                            type="button"
                            class="
                              local-cart-qty-btn
                            "
                            data-action="increment">

                            +

                          </button>

                        </div>


                        <strong>

                          ${money(
                            item.price *
                            item.quantity
                          )}

                        </strong>


                        <button
                          type="button"
                          class="
                            local-cart-remove
                          "
                          data-action="remove">

                          ×

                        </button>

                      </div>

                    </div>

                  `
                ).join("")

              : renderLastPlacedOrder(
                  getLastPlacedOrder()
                )
          }

        </div>


        <div class="local-cart-footer">

          <div class="local-cart-total">

            <span>
              Total
            </span>

            <span>
              ${money(total)}
            </span>

          </div>


          <button
            class="local-cart-order"
            type="button"
            ${
              items.length
                ? ""
                : "disabled"
            }>

            Review order

          </button>

        </div>

      `;


      /* Close */

      drawer
        .querySelector(
          ".local-cart-close"
        )
        ?.addEventListener(
          "click",
          closeCart
        );


      /* Quantity controls */

      drawer
        .querySelector(
          ".local-cart-list"
        )
        ?.addEventListener(
          "click",
          event => {

            const actionButton =
              event.target.closest(
                "[data-action]"
              );


            if (
              !actionButton
            ) {
              return;
            }


            const row =
              actionButton.closest(
                ".local-cart-row"
              );


            const name =
              row?.dataset.name;


            if (
              !name ||
              !cart.has(name)
            ) {

              return;

            }


            const action =
              actionButton
                .dataset.action;


            const item =
              cart.get(name);


            if (
              action ===
              "increment"
            ) {

              /*
                Prevent increasing an item
                after the kitchen disables it.
              */

              if (
                !isMenuItemAvailable(
                  name
                )
              ) {

                window.alert(
                  `${name} is currently unavailable.`
                );

                return;

              }


              cart.set(
                name,
                {
                  ...item,

                  quantity:
                    item.quantity +
                    1
                }
              );

            }


            else if (
              action ===
              "decrement"
            ) {

              if (
                item.quantity <=
                1
              ) {

                cart.delete(
                  name
                );

              } else {

                cart.set(
                  name,
                  {
                    ...item,

                    quantity:
                      item.quantity -
                      1
                  }
                );

              }

            }


            else if (
              action ===
              "remove"
            ) {

              cart.delete(
                name
              );

            }


            renderCart();

          }
        );


      /* Review order */

      drawer
        .querySelector(
          ".local-cart-order"
        )
        ?.addEventListener(
          "click",
          () => {

            if (
              !items.length
            ) {
              return;
            }


            /*
              Check if any item was
              disabled while in cart.
            */

            const unavailableItems =
              items.filter(
                item =>
                  !isMenuItemAvailable(
                    item.name
                  )
              );


            if (
              unavailableItems.length
            ) {

              window.alert(
                "Some items in your cart are currently unavailable: " +
                unavailableItems
                  .map(
                    item =>
                      item.name
                  )
                  .join(", ")
              );

              return;

            }


            fieldErrors = {};

            checkoutStep =
              true;

            renderCart();

          }
        );

    };


  /* =========================================================
     CHECKOUT FORM
  ========================================================= */

  function renderCheckoutForm(
    items,
    total
  ) {

    const errName =
      fieldErrors.name
        ? `

          <div
            class="local-cart-error">

            ${escapeHtml(
              fieldErrors.name
            )}

          </div>

        `
        : "";


    const errPhone =
      fieldErrors.phone
        ? `

          <div
            class="local-cart-error">

            ${escapeHtml(
              fieldErrors.phone
            )}

          </div>

        `
        : "";


    drawer.innerHTML = `

      <div class="local-cart-head">

        <div>

          <div
            class="
              font-mono
              text-[10px]
              uppercase
              tracking-[0.22em]
              text-[var(--copper)]
            ">

            Table
            ${escapeHtml(
              TABLE_NUMBER
            )}

          </div>


          <h2
            class="
              mt-2
              font-heading
              text-3xl
              font-semibold
              tracking-[-0.04em]
            ">

            Who's ordering?

          </h2>

        </div>


        <button
          class="local-cart-close"
          type="button">

          ×

        </button>

      </div>


      <div class="local-cart-summary">

        ${items
          .map(
            item => `

              <div
                class="
                  local-cart-summary-row
                ">

                <span>

                  ${item.quantity}
                  ×
                  ${escapeHtml(
                    item.name
                  )}

                </span>


                <span>

                  ${money(
                    item.price *
                    item.quantity
                  )}

                </span>

              </div>

            `
          )
          .join("")}

      </div>


      <div class="local-cart-form">

        <label
          class="
            local-cart-field
            ${
              fieldErrors.name
                ? "has-error"
                : ""
            }
          ">

          <span>
            Name
          </span>


          <input
            type="text"
            data-field="name"
            placeholder="e.g. Priya"
            value="${escapeAttr(
              customerInfo.name
            )}"
            autocomplete="name">


          ${errName}

        </label>


        <label
          class="
            local-cart-field
            ${
              fieldErrors.phone
                ? "has-error"
                : ""
            }
          ">

          <span>
            Phone number
          </span>


          <input
            type="tel"
            data-field="phone"
            placeholder="e.g. 98765 43210"
            value="${escapeAttr(
              customerInfo.phone
            )}"
            autocomplete="tel">


          ${errPhone}

        </label>


        <label
          class="local-cart-field">

          <span>

            Anything we should know?
            (optional)

          </span>


          <textarea
            data-field="notes"
            placeholder="Allergies, spice level, special requests..."
          >${escapeHtml(
            customerInfo.notes
          )}</textarea>

        </label>

      </div>


      <div class="local-cart-footer">

        <div
          class="local-cart-total">

          <span>
            Total
          </span>


          <span>
            ${money(total)}
          </span>

        </div>


        <button
          class="local-cart-back"
          type="button">

          ← Back to cart

        </button>


        <button
          class="local-cart-order"
          type="button">

          Place order

        </button>

      </div>

    `;


    /* Close */

    drawer
      .querySelector(
        ".local-cart-close"
      )
      ?.addEventListener(
        "click",
        closeCart
      );


    /* Save form fields */

    drawer
      .querySelectorAll(
        `
          .local-cart-field
          input,
          .local-cart-field
          textarea
        `
      )
      .forEach(
        el => {

          el.addEventListener(
            "input",
            () => {

              customerInfo[
                el.dataset.field
              ] =
                el.value;

            }
          );

        }
      );


    /* Back */

    drawer
      .querySelector(
        ".local-cart-back"
      )
      ?.addEventListener(
        "click",
        () => {

          checkoutStep =
            false;

          fieldErrors = {};

          renderCart();

        }
      );


    /* Place order */

    drawer
      .querySelector(
        ".local-cart-order"
      )
      ?.addEventListener(
        "click",
        () => {

          const name =
            customerInfo.name
              .trim();


          const phone =
            customerInfo.phone
              .trim();


          fieldErrors = {};


          if (!name) {

            fieldErrors.name =
              "Please tell us your name.";

          }


          if (!phone) {

            fieldErrors.phone =
              "Please add a phone number.";

          }


          /*
            Check availability again before
            finally placing the order.
          */

          const unavailableItems =
            items.filter(
              item =>
                !isMenuItemAvailable(
                  item.name
                )
            );


          if (
            unavailableItems.length
          ) {

            window.alert(
              "These items are no longer available: " +
              unavailableItems
                .map(
                  item =>
                    item.name
                )
                .join(", ")
            );

            checkoutStep =
              false;

            renderCart();

            return;

          }


          if (
            Object.keys(
              fieldErrors
            ).length
          ) {

            renderCheckoutForm(
              items,
              total
            );

            return;

          }


          submitOrder(
            items,
            total,
            {
              name,
              phone,

              notes:
                customerInfo
                  .notes
                  .trim()
            }
          );

        }
      );

  }


  /* =========================================================
     SUBMIT ORDER
  ========================================================= */

  async function submitOrder(
    items,
    total,
    customer
  ) {

    /*
      Final availability check.
    */

    const unavailableItems =
      items.filter(
        item =>
          !isMenuItemAvailable(
            item.name
          )
      );


    if (
      unavailableItems.length
    ) {

      window.alert(
        "Sorry, these items are currently unavailable: " +
        unavailableItems
          .map(
            item =>
              item.name
          )
          .join(", ")
      );

      checkoutStep =
        false;

      renderCart();

      return;

    }


    const order = {

      id:
        `ORD-${Date.now()
          .toString(36)
          .toUpperCase()}`,

      /*
        Table comes from QR URL.
      */

      table:
        TABLE_NUMBER,

      items:
        items.map(
          ({
            name,
            price,
            quantity
          }) => ({

            name,

            price,

            quantity

          })
        ),

      total,

      customer,

      placedAt:
        new Date()
          .toISOString(),

      status:
        "new"

    };


    /*
      IMPORTANT: The kitchen dashboard listens to Firestore.
      Writing only to localStorage would keep the order on this
      customer's device and the kitchen would never receive it.
    */
    try {
      await firestoreReady;
      await firestoreAddDoc(
        firestoreCollection(firestoreDb, "orders"),
        order
      );
    } catch (error) {
      console.error("ABUDI order upload failed:", error);
      window.alert(
        "Order could not be sent to the kitchen. Please check your internet connection and try again."
      );
      return;
    }

    /* Keep a local copy for the customer's My Order / Bill screen. */
    let orders = [];

    try {
      orders = JSON.parse(
        localStorage.getItem(ORDERS_KEY) || "[]"
      );
      if (!Array.isArray(orders)) orders = [];
    } catch {
      orders = [];
    }

    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    saveLastPlacedOrder(order);


    /*
      Tell other code on this page.
    */

    window.dispatchEvent(
      new CustomEvent(
        "abudi-orders-updated",
        {
          detail:
            order
        }
      )
    );


    /*
      Clear cart.
    */

    cart.clear();

    /* Reset every menu item control after the order is placed.
       Previously the cart was cleared, but the visible menu buttons
       still showed the old quantity such as − 2 +. */
    document.querySelectorAll('article[data-testid^="menu-item-"]').forEach((article) => {
      refreshMenuQuantityControl(article);
    });


    checkoutStep =
      false;


    customerInfo = {

      name: "",

      phone: "",

      notes: ""

    };


    fieldErrors = {};


    renderCart();


    closeCart();


    window.alert(
      `Thanks ${customer.name}! Order ${order.id} has been sent to the kitchen.`
    );

  }


  /* =========================================================
     OPEN CART
  ========================================================= */

  const openCart =
    () => {

      checkoutStep =
        false;

      fieldErrors = {};


      renderCart();


      backdrop.classList.add(
        "is-open"
      );


      drawer.classList.add(
        "is-open"
      );


      document.body.style.overflow =
        "hidden";

    };


  /* =========================================================
     CLOSE CART
  ========================================================= */

  function closeCart() {

    backdrop.classList.remove(
      "is-open"
    );


    drawer.classList.remove(
      "is-open"
    );


    document.body.style.overflow =
      "";

  }


  /* =========================================================
     CART EVENTS
  ========================================================= */

  backdrop.addEventListener(
    "click",
    closeCart
  );


  cartButton?.addEventListener(
    "click",
    openCart
  );


  stickyReviewButton.addEventListener(
    "click",
    openCart
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {

        closeCart();

      }

    }
  );


  /* =========================================================
     ADD TO CART
     Uses delegated clicks so the ADD button still works after
     quantity controls are replaced on mobile/desktop.
  ========================================================= */

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest('[data-testid^="add-item-"]');

    if (!addButton || event.target.closest("[data-menu-action]")) {
      return;
    }

    if (addButton.disabled) {
      return;
    }

    const article = addButton.closest("article");
    if (!article) return;

    const name =
      article
        ?.querySelector('[data-testid^="menu-item-name-"]')
        ?.textContent
        .trim() || "Menu item";

    if (!isMenuItemAvailable(name)) {
      window.alert(`${name} is currently unavailable.`);
      updateMenuAvailabilityUI();
      return;
    }

    const price = parsePrice(
      article
        ?.querySelector('[data-testid^="menu-item-price-"]')
        ?.textContent || "0"
    );

    const existing = cart.get(name);

    cart.set(name, {
      name,
      price,
      quantity: (existing?.quantity || 0) + 1
    });

    refreshMenuQuantityControl(article);
    renderCart();

    stickyCart.animate(
      [
        { transform: "translate(-50%, 8px)" },
        { transform: "translate(-50%, -3px)" },
        { transform: "translate(-50%, 0)" }
      ],
      {
        duration: 350,
        easing: "cubic-bezier(.22,1,.36,1)"
      }
    );
  });


  /* =========================================================
     MENU ITEM QUANTITY CONTROLS
     Mobile-friendly: ADD ->  −  1  +
     Uses real buttons for reliable iPhone touch interaction.
  ========================================================= */

  const refreshMenuQuantityControl = (article) => {
    if (!article) return;

    const currentControl =
      article.querySelector(
        '[data-testid^="add-item-"], .menu-quantity-control'
      );

    if (!currentControl) return;

    const name =
      article
        .querySelector('[data-testid^="menu-item-name-"]')
        ?.textContent
        ?.trim() || "";

    const item = cart.get(name);
    const quantity = item?.quantity || 0;

    if (quantity > 0) {
      if (currentControl.classList.contains("menu-quantity-control")) {
        const count = currentControl.querySelector(".menu-qty-count");
        if (count) count.textContent = quantity;
        currentControl.setAttribute(
          "aria-label",
          `${name}, quantity ${quantity}`
        );
        return;
      }

      const control = document.createElement("div");

      control.className = "menu-quantity-control";
      control.setAttribute("role", "group");
      control.setAttribute(
        "aria-label",
        `${name}, quantity ${quantity}`
      );

      control.innerHTML = `
        <button
          type="button"
          class="menu-qty-btn menu-qty-minus"
          data-menu-action="decrement"
          aria-label="Decrease ${name} quantity"
        >−</button>

        <span
          class="menu-qty-count"
          aria-live="polite"
        >${quantity}</span>

        <button
          type="button"
          class="menu-qty-btn menu-qty-plus"
          data-menu-action="increment"
          aria-label="Increase ${name} quantity"
        >+</button>
      `;

      currentControl.replaceWith(control);
    } else {
      const addButton = document.createElement("button");

      addButton.type = "button";
      addButton.className =
        "flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--copper)] hover:bg-[var(--copper)] hover:text-white";
      addButton.setAttribute(
        "aria-label",
        `Add ${name} to order`
      );

      const testId =
        currentControl.getAttribute("data-testid") ||
        `add-item-${name.toLowerCase().replace(/\s+/g, "-")}`;

      addButton.setAttribute("data-testid", testId);

      addButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg"
          width="24" height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-plus size-4"
          aria-hidden="true">
          <path d="M5 12h14"></path>
          <path d="M12 5v14"></path>
        </svg>
      `;

      currentControl.replaceWith(addButton);
    }
  };


  document.addEventListener("click", (event) => {
    const action =
      event.target.closest("[data-menu-action]");

    if (!action) return;

    const control =
      action.closest(".menu-quantity-control");

    const article =
      action.closest("article");

    if (!control || !article) return;

    event.preventDefault();
    event.stopPropagation();

    const name =
      article
        .querySelector('[data-testid^="menu-item-name-"]')
        ?.textContent
        ?.trim() || "";

    if (!name || !cart.has(name)) return;

    const item = cart.get(name);

    if (action.dataset.menuAction === "increment") {
      if (!isMenuItemAvailable(name)) {
        window.alert(`${name} is currently unavailable.`);
        return;
      }

      cart.set(name, {
        ...item,
        quantity: item.quantity + 1
      });
    }

    if (action.dataset.menuAction === "decrement") {
      if (item.quantity <= 1) {
        cart.delete(name);
      } else {
        cart.set(name, {
          ...item,
          quantity: item.quantity - 1
        });
      }
    }

    refreshMenuQuantityControl(article);
    renderCart();
  });


  document
    .querySelectorAll('[data-testid^="add-item-"]')
    .forEach((button) => {
      const article = button.closest("article");
      if (article) {
        refreshMenuQuantityControl(article);
      }
    });

  /* =========================================================
     INITIALIZE
  ========================================================= */

  applyFilters();

  updateStickyCart();

  updateMenuAvailabilityUI();

})();
