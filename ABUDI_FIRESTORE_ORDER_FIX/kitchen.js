// Firebase / Firestore
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
  import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
  } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCHmFL2Mq8h84tSM0DhMI43mf7rgcIeuqg",
    authDomain: "abudi-cafe.firebaseapp.com",
    projectId: "abudi-cafe",
    storageBucket: "abudi-cafe.firebasestorage.app",
    messagingSenderId: "1051106284305",
    appId: "1:1051106284305:web:510db4835c5f91d0bc72b0"
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp);

(() => {
  "use strict";


  /* =========================================================
     STORAGE KEYS
  ========================================================= */

  const ORDERS_KEY = "abudi-orders";

  const AVAILABILITY_KEY =
    "abudi-menu-availability";

  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "abudi@0001";
  const ADMIN_SESSION_KEY = "abudi-admin-authenticated";


  /* =========================================================
     STATE
  ========================================================= */

  let orders = [];

  let activeFilter = "all";

  let soundEnabled = true;

  let availability = {};


  /* =========================================================
     ELEMENTS
  ========================================================= */

  const ordersGrid =
    document.getElementById("ordersGrid");

  const emptyState =
    document.getElementById("emptyState");

  const orderCount =
    document.getElementById("orderCount");

  const availableCount =
    document.getElementById("availableCount");

  const soundButton =
    document.getElementById("soundButton");

  const menuGrid =
    document.getElementById("menuGrid");

  const noMenu =
    document.getElementById("noMenu");

  const ordersSection =
    document.getElementById("ordersSection");

  const availabilitySection =
    document.getElementById(
      "availabilitySection"
    );

  const loginScreen = document.getElementById("loginScreen");
  const loginForm = document.getElementById("loginForm");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");
  const logoutButton = document.getElementById("logoutButton");


  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  /* =========================================================
     MONEY
  ========================================================= */

  function money(value) {

    return `₹${Number(value || 0)}`;

  }


  /* =========================================================
     TIME
  ========================================================= */

  function formatTime(dateString) {

    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Unknown time";
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }


  function formatDate(dateString) {

    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short"
      }
    );

  }


  let previousOrderIds = new Set();
  let firestoreInitialized = false;
  let ordersUnsubscribe = null;


  /* =========================================================
     LOAD ORDERS FROM FIRESTORE
  ========================================================= */

  function loadOrders() {
    // Avoid duplicate Firestore listeners after logout/login.
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
      ordersUnsubscribe = null;
    }

    previousOrderIds = new Set();
    firestoreInitialized = false;

    // Firestore sends the kitchen every order and every update in real time.
    ordersUnsubscribe = onSnapshot(
      collection(db, "orders"),
      snapshot => {
        const latestOrders = snapshot.docs.map(item => ({
          ...item.data(),
          id: item.id
        }));

        const newOrders = latestOrders.filter(
          order => !previousOrderIds.has(order.id)
        );

        if (newOrders.length && firestoreInitialized) {
          playNotificationSound();

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            newOrders.forEach(order => {
              new Notification(
                "New Kitchen Order 🍳",
                { body: `${order.id} · Table ${order.table}` }
              );
            });
          }
        }

        previousOrderIds = new Set(
          latestOrders.map(order => order.id)
        );
        firestoreInitialized = true;

        orders = latestOrders;
        renderOrders();
        renderAvailability();
      },
      error => {
        console.error("Firestore order listener error:", error);
        orders = [];
        renderOrders();
      }
    );
  }


  /* =========================================================
     SAVE ORDERS
     Firestore is updated directly by status/cancel functions.
  ========================================================= */

  function saveOrders() {
    renderOrders();
  }


  /* =========================================================
     LOAD AVAILABILITY
  ========================================================= */

  function loadAvailability() {

    try {
      availability = JSON.parse(
        localStorage.getItem(AVAILABILITY_KEY) || "{}"
      );

      if (
        !availability ||
        typeof availability !== "object" ||
        Array.isArray(availability)
      ) {
        availability = {};
      }
    } catch {
      availability = {};
    }

    renderAvailability();
  }


  /* =========================================================
     SAVE AVAILABILITY
  ========================================================= */

  function saveAvailability() {

    localStorage.setItem(
      AVAILABILITY_KEY,
      JSON.stringify(availability)
    );

    renderAvailability();

    window.dispatchEvent(
      new CustomEvent(
        "abudi-availability-updated",
        { detail: availability }
      )
    );

  }


  /* =========================================================
     ABUDI MASTER MENU
  ========================================================= */

  const MASTER_MENU = [
    { category: "ABUDI Special", items: [
      ["Paneer Cheeze Pocket",199], ["Chicken Cheeze Pocket",219],
      ["Loaded Chicken Fries",169], ["Cheezy Fries",149]
    ]},
    { category: "Milk Shake", items: [
      ["Oreo Milk Shake",149], ["Kit Kat Milk Shake",149],
      ["Biscoff Milk Shake",200], ["Chocolate Milk Shake",109],
      ["Straw Berry Milk Shake",99], ["Nutella Milk Shake",200],
      ["Butter Scoth Milk Shake",120], ["Dates & Nuts Milk Shake",179]
    ]},
    { category: "Mojito's", items: [
      ["Green Apple",109], ["Blue Berry Mojito",109],
      ["Raspberry Mojito",109], ["Mint Mojito",109],
      ["Kiwi Mojito",109], ["Water Melon Mojito",109],
      ["Blue Curaco",109]
    ]},
    { category: "Appetizers", items: [
      ["French Fries (200gm)",89], ["Peri Peri French Fries (200gm)",109],
      ["Chicken Loaded Fries",169], ["Garlic Bread (4pc)",110],
      ["Garlic Cheeze Bread",150], ["Chicken Strips (6pc)",200],
      ["Chicken Nuggets (6pc)",120], ["Chicken Popcorn (10pc)",149],
      ["Potato Wedges (8pc)",109], ["Veg Nuggets (6pc)",89]
    ]},
    { category: "Burgers & Wrap", items: [
      ["Veg Burger",109], ["Paneer Burger",129], ["Chicken Burger",149],
      ["Chicken Zinger Burger",179], ["ABUDI Special Chicken Cheeze Burger",199],
      ["Veg Wrap",119], ["Paneer Wrap",139], ["Crispy Chicken Wrap",149],
      ["Chicken Zinger Wrap",179], ["ABUDI Special Chicken Wrap",199]
    ]},
    { category: "Hot & Beverages", items: [
      ["Espresso",80], ["Americano",90], ["Cafe Latte",100],
      ["Cappuccino",100], ["Caramel",120], ["Cafe Mocha",120],
      ["Hazel Nut Cappuccino",129], ["Irish Cappuccino",129],
      ["Hot Chocolate",100]
    ]},
    { category: "Cold Coffee & Drinks", items: [
      ["Cold Coffee (300ml)",180], ["Chocolate Cold Coffee with Ice Cream",200],
      ["Cold Coffee with Chocolate Ice Cream",230], ["Nutella Frappe",170],
      ["Iced Americano (60ml)",130], ["Ice Latte (60ml)",150],
      ["Caramel Iced Latte",159], ["Ice Mocha",159],
      ["Hazel Nut Iced Latte",189], ["Spanish Latte (60ml)",150]
    ]},
    { category: "Abudi Specials", items: [
      ["Cranberry Special",280], ["Cranberry Single",120],
      ["Cranberry Double",150], ["Classic Cold Brew (Honey with cinnamon)",180],
      ["Bour Bourn",220]
    ]},
    { category: "Desserts", items: [
      ["Choco Lava",119], ["Choco Lava (with ice cream)",159],
      ["Sizzling Brownie",139], ["Brownie with ice cream",169],
      ["Pan Cake (Blue Berry / Strawberry / Banana)",0]
    ]},
    { category: "Pasta", items: [
      ["Veg Classic Alfredo",189], ["Spaghetti (Italian Pasta)",199],
      ["Chicken Alfredo",249], ["Spaghetti Chicken (Italian Pasta)",260],
      ["Basil Chicken Pasta",299], ["Veg Basil Pasta",249]
    ]},
    { category: "Sandwich", items: [
      ["Veg Sandwich",110], ["Spiced Paneer Sandwich",120],
      ["Chicken Cheeze Sandwich",139], ["ABUDI Special Chicken Sandwich",149]
    ]},
    { category: "Pizza", items: [
      ["Margherita",169], ["Veg Loaded Pizza",189], ["Spicy Paneer Pizza",199],
      ["Corn Cheeze Corn Pizza",179], ["Chicken Tikka Pizza",229],
      ["Peri Peri Chicken Pizza",249], ["ABUDI Special Pizza",349],
      ["Chicken Loaded Pizza",299]
    ]}
  ];

  /* =========================================================
     GET MENU ITEMS
  ========================================================= */

  function getMenuItems() {
    const items = new Map();

    MASTER_MENU.forEach(section => {
      section.items.forEach(([name, price]) => {
        items.set(name, {
          name,
          price,
          category: section.category
        });
      });
    });

    orders.forEach(order => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach(item => {
        if (!item || !item.name) return;
        const name = String(item.name).trim();
        if (!name || items.has(name)) return;
        items.set(name, {
          name,
          price: Number(item.price || 0),
          category: "Other"
        });
      });
    });

    Object.keys(availability).forEach(name => {
      if (!items.has(name)) {
        items.set(name, {
          name,
          price: 0,
          category: "Other"
        });
      }
    });

    return [...items.values()];
  }

  /* =========================================================
     CHECK ITEM AVAILABILITY
  ========================================================= */

  function isAvailable(name) {

    /*
      If item is not yet stored,
      it is available by default.
    */

    return availability[name] !== false;

  }


  /* =========================================================
     TOGGLE ITEM
  ========================================================= */

  function toggleAvailability(
    name
  ) {

    const current =
      isAvailable(name);

    availability[name] =
      !current;

    saveAvailability();

  }


  /* =========================================================
     RENDER AVAILABILITY
  ========================================================= */

  function renderAvailability() {
    const menuItems = getMenuItems();

    const availableItems = menuItems.filter(
      item => isAvailable(item.name)
    );

    availableCount.textContent = String(availableItems.length);

    if (!menuItems.length) {
      menuGrid.innerHTML = "";
      noMenu.hidden = false;
      return;
    }

    noMenu.hidden = true;

    const grouped = new Map();
    menuItems.forEach(item => {
      const category = item.category || "Other";
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(item);
    });

    menuGrid.innerHTML = [...grouped.entries()].map(
      ([category, categoryItems]) => `
        <div style="grid-column:1/-1;">
          <h3 style="margin:10px 0 0;font-size:18px;color:var(--copper);">
            ${escapeHtml(category)}
          </h3>
        </div>
        ${categoryItems.map(item => {
          const available = isAvailable(item.name);
          return `
            <div class="menu-card">
              <div class="menu-info">
                <div class="menu-name">${escapeHtml(item.name)}</div>
                ${
                  item.price
                    ? `<div class="menu-price">${money(item.price)}</div>`
                    : `<div class="menu-price">Price not specified</div>`
                }
                <span class="availability-status ${
                  available ? "available" : "unavailable"
                }">
                  ${available ? "Available" : "Not Available"}
                </span>
              </div>
              <button
                type="button"
                class="availability-toggle ${
                  available ? "available" : "unavailable"
                }"
                data-availability-name="${escapeHtml(item.name)}">
                ${available ? "Disable" : "Enable"}
              </button>
            </div>
          `;
        }).join("")}
      `
    ).join("");
  }

  /* =========================================================
     AVAILABILITY CLICK
  ========================================================= */

  menuGrid.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-availability-name]"
        );

      if (!button) return;


      const name =
        button.dataset
          .availabilityName;


      if (!name) return;


      toggleAvailability(
        name
      );

    }
  );


  /* =========================================================
     STATUS TEXT
  ========================================================= */

  function getStatusText(
    status
  ) {

    switch (status) {

      case "new":
        return "New";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "completed":
        return "Completed";

      default:
        return status || "New";

    }

  }


  /* =========================================================
     NEXT STATUS
  ========================================================= */

  function getNextStatus(
    status
  ) {

    switch (status) {

      case "new":
        return "preparing";

      case "preparing":
        return "ready";

      case "ready":
        return "completed";

      default:
        return null;

    }

  }


  /* =========================================================
     GENERATE BILL  ->  WHATSAPP (owner -> customer)
  ========================================================= */

  const BUSINESS_NAME = "Abudi";

  const DEFAULT_COUNTRY_CODE = "91"; // India

  function normalizePhone(phone) {

    let digits =
      String(phone || "")
        .replace(/\D/g, "");

    // remove leading zeros (e.g. 09876543210)
    digits =
      digits.replace(/^0+/, "");

    // 10 digit local number -> add country code
    if (digits.length === 10) {
      digits =
        DEFAULT_COUNTRY_CODE +
        digits;
    }

    return digits;

  }

  function buildBillMessage(order) {

    const items =
      Array.isArray(order.items)
        ? order.items
        : [];

    const customer =
      order.customer || {};

    const lines = [];

    lines.push(
      `*${BUSINESS_NAME} - Bill*`
    );

    lines.push("");

    lines.push(
      `Order: ${order.id}`
    );

    lines.push(
      `Table: ${order.table}`
    );

    lines.push(
      `Date: ${formatDate(order.placedAt)} ${formatTime(order.placedAt)}`
    );

    lines.push(
      `Customer: ${customer.name || "Customer"}`
    );

    lines.push("");

    lines.push("*Items*");

    items.forEach(item => {

      const qty =
        Number(item.quantity || 0);

      const price =
        Number(item.price || 0);

      lines.push(
        `${qty} x ${item.name} = ${money(qty * price)}`
      );

    });

    lines.push("");

    lines.push(
      `*Total: ${money(order.total)}*`
    );

    lines.push("");

    lines.push(
      `Thank you for dining with us! 🙏`
    );

    return lines.join("\n");

  }

  function generateBill(orderId) {

    const order =
      orders.find(
        item =>
          item.id === orderId
      );

    if (!order) return;

    const phone =
      normalizePhone(
        order.customer &&
        order.customer.phone
      );

    if (phone.length < 11) {

      window.alert(
        "This customer has no valid phone number."
      );

      return;

    }

    const url =
      `https://wa.me/${phone}?text=` +
      encodeURIComponent(
        buildBillMessage(order)
      );

    // Opens the owner's WhatsApp with the
    // customer's chat and the bill ready to send.
    const win =
      window.open(
        url,
        "_blank"
      );

    if (!win) {
      window.location.href = url;
    }

    // Billing is the final step of the order.
    if (order.status !== "completed") {

      order.status = "completed";

      saveOrders();

    }

  }


  /* =========================================================
     ACTION BUTTON
  ========================================================= */

  function getActionButton(
    order
  ) {

    const nextStatus =
      getNextStatus(
        order.status
      );


    if (order.status === "completed") {

      return `

        <button
          type="button"
          class="action-button bill-button"
          data-action="bill"
          data-order-id="${escapeHtml(
            order.id
          )}">

          🧾 Resend Bill

        </button>

      `;

    }

    if (!nextStatus) {
      return "";
    }


    let text = "";

    let className =
      "action-button ";


    if (
      nextStatus ===
      "preparing"
    ) {

      text =
        "Start Preparing";

      className +=
        "start-button";

    }


    if (
      nextStatus ===
      "ready"
    ) {

      text =
        "Mark Ready";

      className +=
        "ready-button";

    }


    if (
      nextStatus ===
      "completed"
    ) {

      // 4th step: Generate Bill -> WhatsApp
      return `

        <button
          type="button"
          class="action-button bill-button"
          data-action="bill"
          data-order-id="${escapeHtml(
            order.id
          )}">

          🧾 Generate Bill

        </button>

      `;

    }


    return `

      <button
        type="button"
        class="${className}"
        data-action="status"
        data-order-id="${escapeHtml(
          order.id
        )}"
        data-next-status="${nextStatus}">

        ${text}

      </button>

    `;

  }


  /* =========================================================
     CREATE ORDER CARD
  ========================================================= */

  function createOrderCard(
    order
  ) {

    const items =
      Array.isArray(
        order.items
      )
        ? order.items
        : [];


    const customer =
      order.customer ||
      {};


    const notes =
      customer.notes ||
      "";


    return `

      <article
        class="
          order-card
          ${escapeHtml(
            order.status || "new"
          )}
        ">

        <div class="order-head">

          <div>

            <h2
              class="order-number">

              ${escapeHtml(
                order.id
              )}

            </h2>

            <div
              class="order-time">

              ${formatDate(
                order.placedAt
              )}

              ·

              ${formatTime(
                order.placedAt
              )}

            </div>

            <span
              class="
                status
                status-${escapeHtml(
                  order.status ||
                  "new"
                )}
              ">

              ${getStatusText(
                order.status
              )}

            </span>

          </div>


          <div class="table-badge">

            TABLE
            ${escapeHtml(
              order.table
            )}

          </div>

        </div>


        <div class="customer">

          <strong>

            ${escapeHtml(
              customer.name ||
              "Customer"
            )}

          </strong>

          <div>

            📞
            ${escapeHtml(
              customer.phone ||
              "No phone"
            )}

          </div>

        </div>


        <div class="items">

          ${
            items.length

              ? items.map(
                  item => `

                    <div class="item">

                      <div>

                        <span
                          class="item-qty">

                          ${escapeHtml(
                            item.quantity
                          )}

                        </span>

                        <span
                          class="item-name">

                          ${escapeHtml(
                            item.name
                          )}

                        </span>

                      </div>


                      <div
                        class="item-price">

                        ${money(
                          Number(
                            item.price ||
                            0
                          ) *
                          Number(
                            item.quantity ||
                            0
                          )
                        )}

                      </div>

                    </div>

                  `
                ).join("")

              : `

                <div class="item">
                  No items
                </div>

              `
          }

        </div>


        ${
          notes

            ? `

              <div class="notes">

                <strong>
                  📝 Special Request
                </strong>

                ${escapeHtml(
                  notes
                )}

              </div>

            `

            : ""
        }


        <div class="order-total">

          <span>
            Total
          </span>

          <span>
            ${money(
              order.total
            )}
          </span>

        </div>


        <div class="order-actions">

          ${getActionButton(
            order
          )}


          ${
            order.status !==
            "completed"

              ? `

                <button
                  type="button"
                  class="
                    action-button
                    cancel-button
                  "
                  data-action="cancel"
                  data-order-id="${escapeHtml(
                    order.id
                  )}">

                  Cancel Order

                </button>

              `

              : ""
          }

        </div>

      </article>

    `;

  }


  /* =========================================================
     RENDER ORDERS
  ========================================================= */

  function renderOrders() {

    let filteredOrders =
      orders;


    if (
      activeFilter !==
      "all"
    ) {

      filteredOrders =
        orders.filter(
          order =>
            (
              order.status ||
              "new"
            ) ===
            activeFilter
        );

    }


    filteredOrders =
      [...filteredOrders]
        .sort(
          (a, b) =>
            new Date(
              b.placedAt
            ) -
            new Date(
              a.placedAt
            )
        );


    orderCount.textContent =
      String(
        orders.filter(
          order =>
            order.status !==
            "completed"
        ).length
      );


    if (
      !filteredOrders.length
    ) {

      ordersGrid.innerHTML = "";

      emptyState.hidden =
        false;

      return;

    }


    emptyState.hidden =
      true;


    ordersGrid.innerHTML =
      filteredOrders
        .map(
          createOrderCard
        )
        .join("");

  }


  /* =========================================================
     UPDATE ORDER STATUS
  ========================================================= */

  async function updateOrderStatus(
    orderId,
    status
  ) {

    const order = orders.find(
      item => item.id === orderId
    );

    if (!order) return;

    try {
      await updateDoc(
        doc(db, "orders", orderId),
        { status }
      );
    } catch (error) {
      console.error("Firestore status update error:", error);
      window.alert("Could not update the order. Please check your internet connection.");
    }

  }


  /* =========================================================
     CANCEL ORDER
  ========================================================= */

  async function cancelOrder(
    orderId
  ) {

    const order = orders.find(
      item => item.id === orderId
    );

    if (!order) return;

    const confirmed = window.confirm(
      `Cancel order ${order.id}?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "orders", orderId)
      );
    } catch (error) {
      console.error("Firestore cancel error:", error);
      window.alert("Could not cancel the order. Please check your internet connection.");
    }

  }


  /* =========================================================
     ORDER CLICK HANDLER
  ========================================================= */

  ordersGrid.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-action]"
        );


      if (!button) return;


      const action =
        button.dataset.action;


      const orderId =
        button.dataset.orderId;


      if (
        action ===
        "status"
      ) {

        updateOrderStatus(
          orderId,
          button.dataset
            .nextStatus
        );

        return;

      }


      if (
        action ===
        "bill"
      ) {

        generateBill(
          orderId
        );

        return;

      }


      if (
        action ===
        "cancel"
      ) {

        cancelOrder(
          orderId
        );

      }

    }
  );


  /* =========================================================
     ORDER FILTERS
  ========================================================= */

  document
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeFilter =
            button.dataset.filter;


          document
            .querySelectorAll(
              "[data-filter]"
            )
            .forEach(
              btn => {

                btn.classList.toggle(
                  "active",
                  btn ===
                    button
                );

              }
            );


          renderOrders();

        }
      );

    });


  /* =========================================================
     MAIN TABS
  ========================================================= */

  document
    .querySelectorAll(
      "[data-main-tab]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const tab =
            button.dataset
              .mainTab;


          document
            .querySelectorAll(
              "[data-main-tab]"
            )
            .forEach(
              btn => {

                btn.classList.toggle(
                  "active",
                  btn ===
                    button
                );

              }
            );


          if (
            tab ===
            "orders"
          ) {

            ordersSection
              .classList
              .remove(
                "hidden"
              );

            availabilitySection
              .classList
              .add(
                "hidden"
              );

          } else {

            ordersSection
              .classList
              .add(
                "hidden"
              );

            availabilitySection
              .classList
              .remove(
                "hidden"
              );

            renderAvailability();

          }

        }
      );

    });


  /* =========================================================
     SOUND
  ========================================================= */

  function playNotificationSound() {
    if (!soundEnabled) return;

    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      const audio = new AudioContext();
      const now = audio.currentTime;

      if (audio.state === "suspended") {
        audio.resume().catch(() => {});
      }

      // Loud repeating kitchen bell: three clear tones.
      [
        [880, 0.00],
        [1175, 0.42],
        [880, 0.84]
      ].forEach(([frequency, offset]) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(frequency, now + offset);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.60, now + offset + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.34);

        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.36);
      });

      setTimeout(() => audio.close().catch(() => {}), 1500);
    } catch {
      // Browsers may block audio until the admin has interacted with the page.
    }
  }


  soundButton.addEventListener(
    "click",
    () => {

      soundEnabled =
        !soundEnabled;


      soundButton.textContent =
        soundEnabled
          ? "🔔 Sound: On"
          : "🔕 Sound: Off";

    }
  );



  /* =========================================================
     ADMIN LOGIN / LOGOUT
  ========================================================= */

  function setOrdersAsDefault() {
    ordersSection.classList.remove("hidden");
    availabilitySection.classList.add("hidden");

    document.querySelectorAll("[data-main-tab]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.mainTab === "orders"
      );
    });
  }

  function setAdminLoggedIn(loggedIn) {
    if (loggedIn) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      loginScreen.style.display = "none";
      document.body.style.overflow = "";

      // Orders are always the first page after login.
      setOrdersAsDefault();
      soundEnabled = true;
      soundButton.textContent = "🔔 Sound: On";

      loadOrders();
      loadAvailability();
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      if (ordersUnsubscribe) {
        ordersUnsubscribe();
        ordersUnsubscribe = null;
      }
      loginScreen.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  loginForm.addEventListener("submit", event => {
    event.preventDefault();

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (
      username === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {
      loginError.textContent = "";
      setAdminLoggedIn(true);

      if (
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }
    } else {
      loginError.textContent = "Invalid username or password.";
      loginPassword.value = "";
      loginPassword.focus();
    }
  });

  logoutButton.addEventListener("click", () => {
    if (window.confirm("Logout from ABUDI Admin?")) {
      setAdminLoggedIn(false);
    }
  });

  if (
    sessionStorage.getItem(ADMIN_SESSION_KEY) === "true"
  ) {
    setAdminLoggedIn(true);
  } else {
    setAdminLoggedIn(false);
  }

  /* =========================================================
     REAL-TIME FIRESTORE ORDERS
  ========================================================= */

  // previousOrderIds is declared before the listener starts.
  // The first Firestore snapshot is treated as the initial state,
  // so it does not ring for every existing order.


  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  /* Initialization starts after successful admin login. */

})();
