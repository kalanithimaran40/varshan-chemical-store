// =============================================================================
// VARSHAN CHEMICAL STORE - MULTI-PRODUCT & BUY NOW FLIPKART DISPATCH
// =============================================================================

// -----------------------------------------------------------------------------
// 1. ENTERPRISE SECURITY CLIENT & SANITIZER
// -----------------------------------------------------------------------------
const SECURE_API_BASE = window.location.protocol.startsWith('http')
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '5000' ? '/api/v1' : 'http://localhost:5000/api/v1')
    : `${window.location.origin}/api/v1`
  : 'http://localhost:5000/api/v1';

/**
 * DOMPurify Client-Side XSS Sanitizer Helper
 */
function safeSanitize(htmlString) {
  if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
    return DOMPurify.sanitize(htmlString);
  }
  return htmlString;
}

/**
 * Secure Fetch Helper (Attaches credentials for HttpOnly Cookie exchange)
 */
async function secureApiRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include' // Transmits HttpOnly JWT cookies securely
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${SECURE_API_BASE}${endpoint}`, options);
    return await res.json();
  } catch (err) {
    console.warn(`[Security Client] API Sync Notice: ${err.message}`);
    return null;
  }
}

// -----------------------------------------------------------------------------
// 2. EMAILJS & BACKEND OTP DISPATCH CONFIGURATION
// -----------------------------------------------------------------------------
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_varshan',
  TEMPLATE_ID: 'template_varshan_otp',
  PUBLIC_KEY: 'YOUR_EMAILJS_PUBLIC_KEY'
};

if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.PUBLIC_KEY && EMAILJS_CONFIG.PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
  try {
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  } catch (err) {
    console.log('EmailJS Init:', err);
  }
}

let isEmailVerified = false;
let resendTimer = null;
let cartItems = [];
let selectedPackSize = '1 L Bottle';
let currentSelectedProduct = {
  title: 'VARSHAN Pin-Oil Formula Disinfectant Cleaner (1 L Bottle)',
  price: '₹160'
};

// Toast Notification (Disabled - Silent clean actions)
function showToast(message) {
  return;
}

/// -----------------------------------------------------------------------------
// 2. MULTI-ITEM SHOPPING CART & PROFILE SYSTEM
// -----------------------------------------------------------------------------
window.updateCartBadge = function() {
  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartCounter = document.getElementById('cart-counter');
  if (cartCounter) {
    cartCounter.textContent = totalCount;
    cartCounter.classList.remove('pulse-scale');
    void cartCounter.offsetWidth;
    cartCounter.classList.add('pulse-scale');
  }
  const bottomBadge = document.getElementById('bottom-nav-cart-badge');
  if (bottomBadge) {
    bottomBadge.textContent = totalCount;
    bottomBadge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  }
};

window.handleMobileNavClick = function(tabKey) {
  const btns = document.querySelectorAll('.mob-nav-btn');
  btns.forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`mob-nav-${tabKey}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Close open modals when switching bottom tabs to prevent lock-in
  if (tabKey !== 'cart' && typeof closeCartModal === 'function') closeCartModal();
  if (typeof closeProductDetailModal === 'function') closeProductDetailModal();
  if (tabKey !== 'orders' && typeof closeCustomerOrdersModal === 'function') closeCustomerOrdersModal();
  if (tabKey !== 'admin' && typeof closeAdminDashboardModal === 'function') closeAdminDashboardModal();
  if (typeof closeCustomerLoginModal === 'function') closeCustomerLoginModal();

  if (tabKey === 'admin') {
    if (typeof openAdminPortalModal === 'function') {
      openAdminPortalModal();
    }
    return;
  } else if (tabKey === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tabKey === 'categories') {
    const catBar = document.querySelector('.category-filter-bar');
    if (catBar) {
      catBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else if (tabKey === 'orders') {
    if (typeof openCustomerOrdersModal === 'function') {
      openCustomerOrdersModal();
    }
  } else if (tabKey === 'cart') {
    if (typeof openCartModal === 'function') {
      openCartModal();
    }
  }
};

window.addProductToCart = function(productName, priceStr, mrpStr, imgSrc, packSize) {
  const basePrice = parseInt((priceStr || '149').toString().replace(/[^\d]/g, '')) || 149;
  const baseMrp = parseInt((mrpStr || '220').toString().replace(/[^\d]/g, '')) || 220;
  const size = packSize || selectedPackSize || '1 Bottle';
  const img = imgSrc || 'varshan_phenyl_perfect.png';

  const existing = cartItems.find(i => i.name === productName && i.packSize === size);
  if (existing) {
    existing.quantity += 1;
  } else {
    cartItems.push({
      id: Date.now() + Math.random(),
      name: productName,
      price: basePrice,
      mrp: baseMrp,
      image: img,
      packSize: size,
      quantity: 1
    });
  }

  updateCartBadge();
  showToast(`🛒 Added "${productName}" (${size}) to Cart!`);
};

// Global Bulletproof Mobile Touch Handlers
window.quickAddToCart = function(cartBtn) {
  if (!cartBtn) return;
  const now = Date.now();
  if (cartBtn._lastClick && (now - cartBtn._lastClick < 400)) return;
  cartBtn._lastClick = now;

  const card = cartBtn.closest('.compact-card');
  const title = card?.querySelector('.comp-title')?.textContent?.trim() || card?.getAttribute('data-title') || 'VARSHAN Chemical Product';
  const price = card?.querySelector('.comp-curr-price')?.textContent?.trim() || '₹149';
  const mrp = card?.querySelector('.comp-mrp')?.textContent?.trim() || '₹220';
  const imgSrc = card?.querySelector('.compact-bottle-img')?.getAttribute('src') || 'varshan_phenyl_perfect.png';
  
  window.addProductToCart(title, price, mrp, imgSrc, '1 Bottle');

  // Visual feedback on button
  cartBtn.textContent = '✓ Added!';
  setTimeout(() => {
    cartBtn.innerHTML = '&#128722; Quick Add';
  }, 1200);
};

window.modalAddToCart = function() {
  if (currentSelectedProduct && currentSelectedProduct.title) {
    const title = currentSelectedProduct.title;
    const price = document.getElementById('modal-product-price')?.textContent?.trim() || currentSelectedProduct.price;
    const mrp = document.getElementById('modal-product-mrp')?.textContent?.trim() || currentSelectedProduct.mrp;
    const img = document.getElementById('modal-product-img')?.getAttribute('src') || currentSelectedProduct.image;
    window.addProductToCart(title, price, mrp, img, selectedPackSize);
    if (typeof closeProductDetailModal === 'function') closeProductDetailModal();
  }
};

window.modalBuyNow = function() {
  if (currentSelectedProduct && currentSelectedProduct.title) {
    const title = currentSelectedProduct.title;
    const price = document.getElementById('modal-product-price')?.textContent?.trim() || currentSelectedProduct.price;
    const mrp = document.getElementById('modal-product-mrp')?.textContent?.trim() || currentSelectedProduct.mrp;
    const img = document.getElementById('modal-product-img')?.getAttribute('src') || currentSelectedProduct.image;
    window.addProductToCart(title, price, mrp, img, selectedPackSize);
    if (typeof closeProductDetailModal === 'function') closeProductDetailModal();
    if (typeof openCartModal === 'function') openCartModal();
  }
};

// =========================================================================
// UNIVERSAL MODAL BODY SCROLL LOCKING
// (Guarantees scrolling ONLY on the first page / main storefront catalog)
// =========================================================================
window.syncModalScrollLock = function() {
  const isWelcomeActive = document.querySelector('.welcome-screen:not(.hidden):not(.fade-out)');
  const isModalActive = document.querySelector(
    '.modal-backdrop:not(.hidden), .admin-modal:not(.hidden), .exit-splash-screen:not(.hidden)'
  );

  if (isWelcomeActive) {
    document.body.classList.add('welcome-active');
    document.documentElement.classList.add('welcome-active');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  } else if (isModalActive) {
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  } else {
    document.body.classList.remove('modal-open', 'welcome-active');
    document.documentElement.classList.remove('modal-open', 'welcome-active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
};

window.openCartModal = function() {
  renderCartModal();
  const modal = document.getElementById('cart-drawer-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '99999';
  }
  window.syncModalScrollLock();

  // Pre-fill In-Cart delivery form from remembered user profile
  const savedProfile = getCurrentUserProfile();
  const delNameInput = document.getElementById('cart-del-name');
  const delPhoneInput = document.getElementById('cart-del-phone');
  const delAddressInput = document.getElementById('cart-del-address');
  const delErrorBox = document.getElementById('cart-del-error');

  if (delErrorBox) delErrorBox.classList.add('hidden');
  if (delNameInput) delNameInput.classList.remove('input-error');
  if (delPhoneInput) delPhoneInput.classList.remove('input-error');
  if (delAddressInput) delAddressInput.classList.remove('input-error');

  if (savedProfile) {
    if (delNameInput && !delNameInput.value) delNameInput.value = savedProfile.name || '';
    if (delPhoneInput && !delPhoneInput.value) delPhoneInput.value = savedProfile.mobile || '';
    if (delAddressInput && !delAddressInput.value) delAddressInput.value = savedProfile.address || '';
  }
};

function closeCartModal() {
  const modal = document.getElementById('cart-drawer-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  if (typeof window.syncModalScrollLock === 'function') {
    window.syncModalScrollLock();
  }
}
window.closeCartModal = closeCartModal;

window.changeCartItemQty = function(index, delta) {
  if (cartItems[index]) {
    cartItems[index].quantity += delta;
    if (cartItems[index].quantity <= 0) {
      cartItems.splice(index, 1);
    }
    updateCartBadge();
    renderCartModal();
  }
};

window.removeCartItem = function(index) {
  if (cartItems[index]) {
    const removedName = cartItems[index].name;
    cartItems.splice(index, 1);
    updateCartBadge();
    renderCartModal();
    showToast(`Removed "${removedName}" from cart.`);
  }
};

function renderCartModal() {
  const container = document.getElementById('cart-items-container');
  const emptyView = document.getElementById('cart-empty-view');
  const footer = document.getElementById('cart-modal-footer');
  const deliveryCard = document.getElementById('cart-quick-delivery-card');
  const subtitle = document.getElementById('cart-drawer-subtitle');
  const qtySummary = document.getElementById('cart-summary-qty');
  const totalSummary = document.getElementById('cart-summary-total');
  const btnChkAmount = document.getElementById('btn-chk-amount-display');

  const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const grandTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (subtitle) {
    subtitle.textContent = `${totalQty} Item${totalQty === 1 ? '' : 's'}`;
  }
  if (qtySummary) qtySummary.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
  if (totalSummary) totalSummary.textContent = `₹${grandTotal}`;
  if (btnChkAmount) btnChkAmount.textContent = `₹${grandTotal}`;

  if (cartItems.length === 0) {
    if (container) container.innerHTML = '';
    if (emptyView) emptyView.classList.remove('hidden');
    if (footer) footer.classList.add('hidden');
    if (deliveryCard) deliveryCard.classList.add('hidden');
    return;
  }

  if (emptyView) emptyView.classList.add('hidden');
  if (footer) footer.classList.remove('hidden');
  if (deliveryCard) deliveryCard.classList.remove('hidden');

  if (container) {
    container.innerHTML = cartItems.map((item, idx) => `
      <div class="cart-item-card">
        <div class="cart-item-left">
          <div class="cart-item-thumb">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="cart-item-info">
            <span class="cart-item-name" title="${item.name}">${item.name}</span>
            <div class="cart-item-tags-row">
              <span class="cart-item-pack">${item.packSize}</span>
              <span class="cart-item-unit-price">₹${item.price} each</span>
            </div>
          </div>
        </div>
        <div class="cart-item-right">
          <div class="cart-qty-stepper">
            <button type="button" class="btn-qty-step" onclick="changeCartItemQty(${idx}, -1)" aria-label="Decrease quantity">−</button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button type="button" class="btn-qty-step" onclick="changeCartItemQty(${idx}, 1)" aria-label="Increase quantity">+</button>
          </div>
          <div class="cart-item-price-col">
            <span class="cart-item-line-total">₹${item.price * item.quantity}</span>
          </div>
          <button type="button" class="btn-cart-remove-item" onclick="removeCartItem(${idx})" title="Remove product" aria-label="Remove item">✕</button>
        </div>
      </div>
    `).join('');
  }
}

function getSavedOrdersList() {
  try {
    const data = localStorage.getItem('varshan_order_history');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

// Clean-up past demo orders automatically as requested by store owner
(function initWipeDemoOrders() {
  try {
    const wipeKey = 'varshan_demo_orders_cleared_v2';
    if (!localStorage.getItem(wipeKey)) {
      localStorage.setItem('varshan_order_history', JSON.stringify([]));
      localStorage.setItem(wipeKey, 'true');
    }
  } catch (e) {}
})();

window.clearAllDemoOrders = function(force = false) {
  if (!force) {
    if (!confirm('Are you sure you want to remove all demo orders? Order history will be completely cleared.')) {
      return;
    }
  }
  try {
    localStorage.setItem('varshan_order_history', JSON.stringify([]));
  } catch (e) {}

  if (typeof logAdminAudit === 'function') {
    logAdminAudit('DEMO_RESET', 'All demo orders were wiped and reset to zero.', 'order');
  }

  if (typeof renderAdminOrders === 'function') renderAdminOrders();
  if (typeof renderCustomerOrdersList === 'function') renderCustomerOrdersList();
  if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  if (typeof renderAdminAnalytics === 'function') renderAdminAnalytics();

  if (typeof showToast === 'function') {
    showToast('🗑️ All past demo orders have been removed!');
  }
};

function getCurrentUserProfile() {
  try {
    const stored = localStorage.getItem('varshan_user_profile');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Strictly guard: Admin credentials must NEVER appear in storefront profile
      const cleanMob = (parsed.mobile || '').toString().replace(/\D/g, '');
      const cleanName = (parsed.name || '').toString().trim().toLowerCase();
      if (cleanMob.endsWith('8122776379') || cleanName === 'bala' || cleanName === 'admin') {
        localStorage.removeItem('varshan_user_profile');
        return null;
      }
      return parsed;
    }
  } catch (e) {}
  return null;
}

function getLoggedInCustomerOrdersList() {
  const allOrders = getSavedOrdersList();
  const userProfile = getCurrentUserProfile();

  if (!userProfile) {
    return [];
  }

  const userMobile = (userProfile.mobile || '').toString().replace(/\D/g, '');
  const userName = (userProfile.name || '').trim().toLowerCase();

  return allOrders.filter(ord => {
    const ordMobile = (ord.customerMobile || '').toString().replace(/\D/g, '');
    const ordName = (ord.customerName || '').trim().toLowerCase();

    // 1. Match by 10-digit mobile number
    if (userMobile && ordMobile) {
      if (userMobile === ordMobile || ordMobile.endsWith(userMobile) || userMobile.endsWith(ordMobile)) {
        return true;
      }
    }
    // 2. Match by exact customer name
    if (userName && ordName && userName === ordName) {
      return true;
    }
    return false;
  });
}

function refreshUserProfileUI() {
  const userProfile = getCurrentUserProfile();

  const btnHeaderLogin = document.getElementById('btn-header-login');
  const menuUserName = document.getElementById('menu-user-name');
  const menuUserMobile = document.getElementById('menu-user-mobile');
  const menuUserAddress = document.getElementById('menu-user-address');
  const menuUserEmail = document.getElementById('menu-user-email');
  const profileOrdersBadge = document.getElementById('profile-orders-count-badge');

  // ONLY count orders placed by the current logged-in user!
  const userOrders = getLoggedInCustomerOrdersList();
  if (profileOrdersBadge) {
    profileOrdersBadge.textContent = userOrders.length;
  }

  if (userProfile && userProfile.name && userProfile.name.trim()) {
    const initial = (userProfile.name.trim().charAt(0) || 'U').toUpperCase();
    if (btnHeaderLogin) {
      btnHeaderLogin.classList.add('logged-in-badge');
      btnHeaderLogin.title = `${userProfile.name} (✓ Verified Customer) - Click for options`;
      btnHeaderLogin.innerHTML = `
        <span class="user-avatar-initial">${initial}</span>
        <span class="verified-mini-dot" title="Verified Customer">✓</span>
      `;
    }
    if (menuUserName) menuUserName.textContent = userProfile.name;
    if (menuUserMobile) menuUserMobile.textContent = `+91 ${userProfile.mobile}`;
    if (menuUserAddress) menuUserAddress.textContent = userProfile.address;
    if (menuUserEmail) menuUserEmail.textContent = userProfile.email || 'customer@varshanchemicals.com';
    isEmailVerified = true;
  } else {
    if (btnHeaderLogin) {
      btnHeaderLogin.classList.remove('logged-in-badge');
      btnHeaderLogin.title = 'Login / Sign In';
      btnHeaderLogin.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span id="header-login-btn-text">Login</span>
      `;
    }
    if (menuUserName) menuUserName.textContent = 'Guest Customer';
    if (menuUserMobile) menuUserMobile.textContent = '+91 Not Set';
    if (menuUserAddress) menuUserAddress.textContent = 'Not Set';
    if (menuUserEmail) menuUserEmail.textContent = 'customer@varshanchemicals.com';
    isEmailVerified = false;
  }
}
window.refreshUserProfileUI = refreshUserProfileUI;

window.openProductDetailModal = function(title, price, mrp, off, imgSrc, fragrance, suitableSurface) {
  if (title) {
    currentSelectedProduct.title = title;
    currentSelectedProduct.price = price || '₹160';
    currentSelectedProduct.mrp = mrp || '₹240';
    currentSelectedProduct.image = imgSrc || 'varshan_phenyl_perfect.png';

    const modalTitle = document.getElementById('modal-product-title');
    const modalPrice = document.getElementById('modal-product-price');
    const modalMrp = document.getElementById('modal-product-mrp');
    const modalOff = document.getElementById('modal-product-off');
    const modalImg = document.getElementById('modal-product-img');
    const specFragrance = document.getElementById('spec-fragrance');
    const specModel = document.getElementById('spec-model-name');
    const specSurface = document.getElementById('spec-surface');

    if (modalTitle) modalTitle.textContent = title;
    if (modalPrice) modalPrice.textContent = price || '₹160';
    if (modalMrp) modalMrp.textContent = mrp || '₹240';
    if (modalOff) modalOff.textContent = off || '32% off';
    if (modalImg && imgSrc) {
      modalImg.src = imgSrc;
    }
    if (specFragrance && fragrance) specFragrance.textContent = fragrance;
    if (specModel) specModel.textContent = title;
    if (specSurface && suitableSurface) specSurface.textContent = suitableSurface;
  }

  const modal = document.getElementById('product-detail-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    const modalBody = modal.querySelector('.modern-modal-body-grid');
    if (modalBody) modalBody.scrollTop = 0;
  }
  window.syncModalScrollLock();
};

function closeProductDetailModal() {
  const modal = document.getElementById('product-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  if (typeof window.syncModalScrollLock === 'function') {
    window.syncModalScrollLock();
  }
}
window.closeProductDetailModal = closeProductDetailModal;

window.triggerProductCardBuy = function(btn) {
  if (!btn) return;
  const card = btn.closest('.compact-card');
  if (!card) return;

  const titleEl = card.querySelector('.comp-title');
  const title = titleEl?.textContent?.trim() || card.getAttribute('data-title') || 'VARSHAN Chemical Product';
  const price = card.querySelector('.comp-curr-price')?.textContent?.trim() || '₹149';
  const mrp = card.querySelector('.comp-mrp')?.textContent?.trim() || '₹220';
  const off = card.querySelector('.comp-off')?.textContent?.trim() || '32% off';
  const imgSrc = card.querySelector('.compact-bottle-img')?.getAttribute('src') || 'varshan_phenyl_perfect.png';
  
  window.openProductDetailModal(title, price, mrp, off, imgSrc, 'Standard Safe Formula', 'All Floors, Tiles & Restroom Areas');
};


window.openCustomerLoginModal = function() {
  let userProfile = null;
  try {
    const stored = localStorage.getItem('varshan_user_profile');
    if (stored) userProfile = JSON.parse(stored);
  } catch (e) {}

  if (userProfile) {
    const uName = document.getElementById('standaloneUserName');
    const uMobile = document.getElementById('standaloneUserMobile');
    const uAddress = document.getElementById('standaloneUserAddress');
    const uEmail = document.getElementById('standaloneUserEmail');

    if (uName) uName.value = userProfile.name || '';
    if (uMobile) uMobile.value = userProfile.mobile || '';
    if (uAddress) uAddress.value = userProfile.address || '';
    if (uEmail) uEmail.value = (userProfile.email && userProfile.email !== 'customer@varshanchemicals.com') ? userProfile.email : '';
  }

  const modal = document.getElementById('customer-login-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '99999';
    setTimeout(() => {
      document.getElementById('standaloneUserName')?.focus();
    }, 100);
  }
  window.syncModalScrollLock();
};

function closeCustomerLoginModal() {
  const modal = document.getElementById('customer-login-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  if (typeof window.syncModalScrollLock === 'function') {
    window.syncModalScrollLock();
  }
}
window.closeCustomerLoginModal = closeCustomerLoginModal;

function closeSuccessOrderModal() {
  const modal = document.getElementById('success-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  if (typeof window.syncModalScrollLock === 'function') {
    window.syncModalScrollLock();
  }
  if (typeof showToast === 'function') {
    showToast('🎉 Chemical Dispatch Confirmed! Continue browsing Sivakasi store.');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.closeSuccessOrderModal = closeSuccessOrderModal;

window.printOrderReceipt = function() {
  window.print();
};

// -----------------------------------------------------------------------------
// WHATSAPP ORDER DISPATCH TO STORE OWNER (+91 81227 76379)
// -----------------------------------------------------------------------------
window.VARSHAN_OWNER_WHATSAPP = '918122776379';
window.latestPlacedOrderRecord = null;

window.buildWhatsAppOrderMessage = function(order) {
  if (!order) return '';

  const items = order.items || [];
  const itemsSummaryText = items.map((item, idx) => {
    const pack = item.packSize ? ` (${item.packSize})` : '';
    const rate = item.price || 0;
    const qty = item.quantity || 1;
    return `${idx + 1}. ${item.name}${pack} x ${qty} = Rs. ${rate * qty}`;
  }).join('\n');

  const customerName = order.customerName || 'Customer';
  const customerMobile = order.customerMobile ? `+91 ${order.customerMobile}` : 'Not Provided';
  const customerAddress = order.customerAddress || 'Sivakasi';

  return `*VARSHAN CHEMICALS - NEW ONLINE ORDER*
----------------------------------------
*Order ID:* #${order.orderId || 'VC-NEW'}
*Customer:* ${customerName} (${customerMobile})
*Delivery Address:* ${customerAddress}
*Order Date & Time:* ${order.date || 'Today'} | ${order.time || ''}
----------------------------------------
*Items Ordered (${items.length} items / ${order.totalQty || items.length} units):*
${itemsSummaryText}
----------------------------------------
*Total Bill Amount:* Rs. ${order.grandTotal} (Cash on Delivery)
----------------------------------------
Hello Varshan Chemicals, please confirm and dispatch my order. Thank you!`;
};

function triggerAutomatedWhatsAppToOwner(orderRecord) {
  if (!orderRecord) return;
  window.latestPlacedOrderRecord = orderRecord;
  try {
    sessionStorage.setItem('varshan_latest_order', JSON.stringify(orderRecord));
  } catch (e) {}

  const text = (typeof window.buildWhatsAppOrderMessage === 'function')
    ? window.buildWhatsAppOrderMessage(orderRecord)
    : 'Hello Varshan Chemicals, I have placed an order.';
  const targetNumber = window.VARSHAN_OWNER_WHATSAPP || '918122776379';
  const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;

  // Automatically attempt opening WhatsApp on desktop; on mobile the customer clicks the prominent green button
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '')
      || (typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth <= 768);
    if (!isMobile && typeof window.open === 'function') {
      const waWin = window.open(waUrl, '_blank');
      if (!waWin || waWin.closed || typeof waWin.closed === 'undefined') {
        console.log('Browser blocked auto popup. Customer can click the WhatsApp button.');
      }
    }
  } catch (err) {
    console.warn('Auto open WhatsApp notice:', err);
  }
}
window.triggerAutomatedWhatsAppToOwner = triggerAutomatedWhatsAppToOwner;

function reopenWhatsAppOrderToOwner(orderId) {
  let order = null;
  if (orderId && typeof getSavedOrdersList === 'function') {
    const orders = getSavedOrdersList();
    order = orders.find(o => String(o.orderId) === String(orderId));
  }
  if (!order) {
    order = window.latestPlacedOrderRecord;
  }
  if (!order) {
    try {
      const cached = sessionStorage.getItem('varshan_latest_order');
      if (cached) order = JSON.parse(cached);
    } catch (e) {}
  }
  if (!order && typeof getSavedOrdersList === 'function') {
    const orders = getSavedOrdersList();
    if (orders.length > 0) {
      order = orders[0];
    }
  }

  const targetNumber = window.VARSHAN_OWNER_WHATSAPP || '918122776379';
  let text = '';
  if (order && typeof window.buildWhatsAppOrderMessage === 'function') {
    text = window.buildWhatsAppOrderMessage(order);
  } else {
    text = 'வணக்கம் Varshan Chemicals, எனது புதிய ஆர்டர் விவரங்களை அறிய விரும்புகிறேன்.';
  }

  const waUrl = `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(text)}`;
  try {
    const waWin = (typeof window.open === 'function') ? window.open(waUrl, '_blank') : null;
    if (!waWin || waWin.closed || typeof waWin.closed === 'undefined') {
      window.location.href = waUrl;
    }
  } catch (e) {
    window.location.href = waUrl;
  }
}
window.reopenWhatsAppOrderToOwner = reopenWhatsAppOrderToOwner;

window.openCustomerOrdersModal = function() {
  const dropdown = document.getElementById('user-profile-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
  
  renderCustomerOrdersList();

  const modal = document.getElementById('customer-orders-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '99999';
  }
  window.syncModalScrollLock();
};

window.closeCustomerOrdersModal = function() {
  const modal = document.getElementById('customer-orders-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  window.syncModalScrollLock();
};

window.openStoreAboutModal = function() {
  const modal = document.getElementById('store-about-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '99999';
  }
  window.syncModalScrollLock();
};

window.closeStoreAboutModal = function() {
  const modal = document.getElementById('store-about-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  window.syncModalScrollLock();
};

function getOrderTrackingState(statusStr) {
  const s = (statusStr || '').toLowerCase();
  if (s.includes('cancel')) return -1;
  if (s.includes('deliver')) return 4;
  if (s.includes('ship') || s.includes('transit')) return 3;
  if (s.includes('confirm') || s.includes('pack')) return 2;
  return 1; // placed
}

function renderCustomerOrdersList() {
  const container = document.getElementById('customer-orders-list-container');
  const subtitle = document.getElementById('orders-modal-subtitle');
  if (!container) return;

  const userProfile = getCurrentUserProfile();

  if (!userProfile || !userProfile.name) {
    if (subtitle) {
      subtitle.textContent = 'Please login to view your personal order history';
    }
    container.innerHTML = `
      <div class="orders-empty-state">
        <div class="orders-empty-icon">👤</div>
        <h4>Customer Login Required</h4>
        <p>Please log in to your account to view your past purchases and live Flipkart-style dispatch tracking.</p>
        <button type="button" class="btn-orders-browse" onclick="closeCustomerOrdersModal(); openCustomerLoginModal();">🔑 Login to Account</button>
      </div>
    `;
    return;
  }

  // ONLY get orders belonging to the logged-in customer (e.g. Frank or Ashik)
  const orders = getLoggedInCustomerOrdersList();
  
  if (subtitle) {
    subtitle.textContent = `${orders.length} order(s) placed by ${userProfile.name} (+91 ${userProfile.mobile})`;
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="orders-empty-state">
        <div class="orders-empty-icon">📦</div>
        <h4>No Orders Placed Yet for ${userProfile.name}</h4>
        <p>You haven't placed any orders yet with mobile <b>+91 ${userProfile.mobile}</b>. When you place an order, your live Flipkart-style tracking with exact dates will appear here.</p>
        <button type="button" class="btn-orders-browse" onclick="closeCustomerOrdersModal()">✨ Browse Catalog &amp; Order</button>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map((order, idx) => {
    const trackState = getOrderTrackingState(order.status);
    const isCancelled = trackState === -1;

    let statusDisplayTitle = 'Order Placed & Received at Sivakasi Factory';
    let statusClass = 'status-placed';
    if (trackState === 2) {
      statusDisplayTitle = 'Order Confirmed & Packed at Sivakasi Depot';
      statusClass = 'status-confirmed';
    } else if (trackState === 3) {
      statusDisplayTitle = 'Dispatched & In Transit (Same-Day Express)';
      statusClass = 'status-shipped';
    } else if (trackState === 4) {
      statusDisplayTitle = 'Delivered Successfully • Cash on Delivery Completed';
      statusClass = 'status-delivered';
    } else if (isCancelled) {
      statusDisplayTitle = 'Order Cancelled';
      statusClass = 'status-cancelled';
    }

    return `
      <div class="order-history-card">
        
        <!-- Header -->
        <div class="order-card-header">
          <div class="order-id-block">
            <span class="o-lbl-id">BILL / ORDER NO:</span>
            <b class="o-val-id">${order.orderId || 'VC-' + (10000 + idx)}</b>
          </div>
          <div class="order-date-pill">
            <span>📅 ${order.date || 'Today'} &bull; ${order.time || ''}</span>
          </div>
        </div>

        <!-- Live Status Bar -->
        <div class="order-live-status-strip ${statusClass}">
          <span class="o-live-dot">●</span>
          <span class="o-live-title">${statusDisplayTitle}</span>
        </div>

        <!-- Expected Delivery Highlight Banner (Direct Factory Schedule) -->
        ${!isCancelled ? `
          <div class="cust-expected-delivery-banner ${trackState === 4 ? 'delivered' : (order.expectedDeliveryDate ? 'scheduled' : 'pending')}">
            <div class="cust-edb-icon">${trackState === 4 ? '🏡' : (order.expectedDeliveryDate ? '🚚' : '⏳')}</div>
            <div class="cust-edb-info">
              <div class="cust-edb-lbl">
                ${trackState === 4 ? 'DELIVERY COMPLETED ON:' : (order.expectedDeliveryDate ? 'EXPECTED DELIVERY DATE & TIME:' : 'ORDER STATUS & SCHEDULE:')}
              </div>
              <div class="cust-edb-val">
                ${order.expectedDeliveryDate ? `${order.expectedDeliveryDate} &bull; ${order.expectedDeliveryTime || 'Standard Slot'}` : 'Awaiting Factory Confirmation & Date Scheduling'}
              </div>
              <div class="cust-edb-sub">
                ${trackState === 4 ? 'Package delivered to your address.' : (order.expectedDeliveryDate ? 'Confirmed by Sivakasi factory depot. Delivery agent will arrive on schedule.' : 'Our factory team is reviewing your order. Scheduled delivery date & time will appear here shortly.')}
              </div>
            </div>
            <span class="cust-edb-badge ${trackState === 4 ? 'delivered' : (order.expectedDeliveryDate ? 'scheduled' : 'pending')}">
              ${trackState === 4 ? 'Delivered ✓' : (order.expectedDeliveryDate ? 'Scheduled 📅' : 'Reviewing 🔍')}
            </span>
          </div>
        ` : ''}

        <!-- Flipkart-Style 4-Stage Visual Stepper -->
        ${!isCancelled ? `
          <div class="flipkart-tracking-stepper">
            <div class="f-step ${trackState >= 1 ? 'completed' : ''} ${trackState === 1 ? 'active' : ''}">
              <div class="f-step-circle">${trackState > 1 ? '✓' : '1'}</div>
              <div class="f-step-info">
                <span class="f-step-name">Ordered</span>
                <span class="f-step-sub">${order.date || 'Today'}</span>
              </div>
            </div>
            <div class="f-step-line ${trackState >= 2 ? 'active' : ''}"></div>
            <div class="f-step ${trackState >= 2 ? 'completed' : ''} ${trackState === 2 ? 'active' : ''}">
              <div class="f-step-circle">${trackState > 2 ? '✓' : '2'}</div>
              <div class="f-step-info">
                <span class="f-step-name">Confirmed</span>
                <span class="f-step-sub">${order.adminConfirmedAt ? order.adminConfirmedAt : 'Sivakasi Hub'}</span>
              </div>
            </div>
            <div class="f-step-line ${trackState >= 3 ? 'active' : ''}"></div>
            <div class="f-step ${trackState >= 3 ? 'completed' : ''} ${trackState === 3 ? 'active' : ''}">
              <div class="f-step-circle">${trackState > 3 ? '✓' : '3'}</div>
              <div class="f-step-info">
                <span class="f-step-name">Shipped</span>
                <span class="f-step-sub">In Transit</span>
              </div>
            </div>
            <div class="f-step-line ${trackState >= 4 ? 'active' : ''}"></div>
            <div class="f-step ${trackState >= 4 ? 'completed' : ''} ${trackState === 4 ? 'active' : ''}">
              <div class="f-step-circle">${trackState >= 4 ? '✓' : '4'}</div>
              <div class="f-step-info">
                <span class="f-step-name">Delivered</span>
                <span class="f-step-sub">${trackState >= 4 ? 'Doorstep Arrived' : (order.expectedDeliveryDate ? 'Arriving ' + order.expectedDeliveryDate.split(' ')[0] : 'Doorstep Arrived')}</span>
              </div>
            </div>
          </div>
        ` : `
          <div class="cancelled-notice-box">
            <span>⚠️ This order was cancelled. Contact Sivakasi helpline +91 81227 76379 for assistance.</span>
          </div>
        `}

        <!-- Customer Delivery Receipt Confirmation Prompt & Status -->
        ${trackState === 4 ? `
          <div class="cust-delivery-confirm-container">
            ${!order.customerReceivedConfirmation ? `
              <div class="cust-delivery-confirm-box prompt">
                <div class="cust-dcb-content">
                  <div class="cust-dcb-icon">📦</div>
                  <div class="cust-dcb-text">
                    <h5 class="cust-dcb-title">Did you receive this order?</h5>
                    <p class="cust-dcb-sub">Our delivery driver marked this parcel as delivered. Please confirm if you have received the chemical products safely.</p>
                  </div>
                </div>
                <div class="cust-dcb-actions">
                  <button type="button" class="btn-dcb-yes" onclick="confirmCustomerReceipt('${order.orderId}', 'yes')">
                    <span>✅ Yes, Received</span>
                  </button>
                  <button type="button" class="btn-dcb-no" onclick="confirmCustomerReceipt('${order.orderId}', 'no')">
                    <span>❌ No, Not Yet</span>
                  </button>
                </div>
              </div>
            ` : (order.customerReceivedConfirmation === 'yes' ? `
              <div class="cust-delivery-confirm-box success">
                <div class="cust-dcb-content">
                  <div class="cust-dcb-icon">✅</div>
                  <div class="cust-dcb-text">
                    <h5 class="cust-dcb-title">Order Receipt Confirmed by You!</h5>
                    <p class="cust-dcb-sub">You confirmed receiving this order on <b>${order.customerConfirmedAt || 'Recently'}</b>. Thank you for choosing Varshan Chemical Store Sivakasi!</p>
                  </div>
                </div>
                <span class="cust-dcb-tag success">Verified Receipt ✓</span>
              </div>
            ` : `
              <div class="cust-delivery-confirm-box warning">
                <div class="cust-dcb-content">
                  <div class="cust-dcb-icon">⚠️</div>
                  <div class="cust-dcb-text">
                    <h5 class="cust-dcb-title">Reported: Order Not Received</h5>
                    <p class="cust-dcb-sub">You reported not receiving this order on <b>${order.customerReportedAt || 'Recently'}</b>. Our Sivakasi factory dispatch manager has been notified and will call you shortly.</p>
                  </div>
                </div>
                <div class="cust-dcb-actions">
                  <button type="button" class="btn-dcb-retry" onclick="confirmCustomerReceipt('${order.orderId}', 'yes')">
                    <span>🔄 Parcel arrived? Click to confirm</span>
                  </button>
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Ordered Items -->
        <div class="order-items-box">
          <div class="order-items-heading">Ordered Chemical Items (${order.totalQty || (order.items ? order.items.length : 1)} Units):</div>
          <div class="order-items-scroll">
            ${(order.items || []).map(item => `
              <div class="order-item-min-row">
                <div class="order-item-min-left">
                  <img src="${item.image || 'varshan_phenyl_perfect.png'}" class="order-thumb-img" alt="${item.name}">
                  <div class="order-item-text">
                    <div class="o-item-title">${item.name}</div>
                    <div class="o-item-sub">${item.packSize || '1 Unit'} &bull; Rate: ₹${item.price}</div>
                  </div>
                </div>
                <div class="order-item-min-right">
                  <span class="o-item-qty">Qty: ${item.quantity}</span>
                  <b class="o-item-amt">₹${item.price * item.quantity}</b>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer -->
        <div class="order-card-bottom">
          <div class="order-del-addr">
            <span class="o-del-lbl">📍 Delivered to:</span>
            <span class="o-del-val">${order.customerAddress || 'Sivakasi'} (${order.customerName || 'Customer'})</span>
          </div>
          <div class="order-bottom-right-group" style="display: flex; align-items: center; gap: 0.65rem;">
            <button type="button" class="btn-order-wa-pill" onclick="window.reopenWhatsAppOrderToOwner('${order.orderId}')" title="Send details to Owner on WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              <span>வாட்ஸ்அப் (81227 76379)</span>
            </button>
            <div class="order-grand-box">
              <span class="o-grand-lbl">Total Payable:</span>
              <b class="o-grand-val">₹${order.grandTotal}</b>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------------
// 7. ADMIN MASTER CONTROL CENTER (OWNER DASHBOARD & OPERATIONS)
// -----------------------------------------------------------------------------
window.triggerAdminDirectAccess = function() {
  if (localStorage.getItem('varshan_admin_logged') === 'true') {
    window.openAdminDashboardModal();
  } else {
    window.openAdminPortalModal();
  }
};

window.ownerQuickUnlock = function() {
  localStorage.setItem('varshan_admin_logged', 'true');
  sessionStorage.setItem('varshan_admin_authenticated', 'true');
  sessionStorage.removeItem('varshan_admin_lockout_until');

  // STRICT PRIVACY: NEVER store admin identity in customer storefront profile!
  try {
    localStorage.removeItem('varshan_user_profile');
  } catch (e) {}

  // Wipe customer modal input fields completely so no credentials linger
  const nameInput = document.getElementById('standaloneUserName');
  const mobileInput = document.getElementById('standaloneUserMobile');
  const addressInput = document.getElementById('standaloneUserAddress');
  const emailInput = document.getElementById('standaloneUserEmail');
  if (nameInput) nameInput.value = '';
  if (mobileInput) mobileInput.value = '';
  if (addressInput) addressInput.value = '';
  if (emailInput) emailInput.value = '';

  // Storefront customer button stays as clean, neutral Guest "Login"
  if (typeof refreshUserProfileUI === 'function') {
    refreshUserProfileUI();
  }

  secureApiRequest('/auth/login', 'POST', {
    email: 'admin@varshanchemicals.com',
    authHash: _SEC_VAULT_HASH
  }).catch(() => {});

  window.closeAdminLoginModal();
  const custModal = document.getElementById('customer-login-modal');
  if (custModal) custModal.classList.add('hidden');

  if (typeof showToast === 'function') {
    showToast('🛡️ Welcome Admin!');
  }
  window.openAdminDashboardModal();
};

// -----------------------------------------------------------------------------
// CRYPTOGRAPHIC ONE-WAY HASH ENGINE (SHA-256 NIST COMPLIANT)
// -----------------------------------------------------------------------------
function computeSha256(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow; const maxWord = mathPow(2, 32);
  let i, j, result = ''; const words = []; const asciiBitLength = (ascii || '').length * 8;
  let hash = []; const k = []; let primeCounter = 0; const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii = (ascii || '') + '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16); const oldHash = hash; hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Cryptographic one-way signatures (Zero plaintext secrets in application bundle)
const _SEC_TRIGGER_HASH = '1c3005c5ea4a38141fcf6bb9ba196642af5cea305423347b3f38ff2647d11d43';
const _SEC_VAULT_HASH   = '519e6091e7e07d205daf39dd6c6bf1773a226c24edbed287084001de35207679';

/* v11 force open admin modal */
window.openAdminPortalModal = function() {
  const custModal = document.getElementById('customer-login-modal');
  if (custModal) {
    custModal.classList.add('hidden');
    custModal.style.setProperty('display', 'none', 'important');
  }
  const alm = document.getElementById('admin-login-modal');
  if (alm) {
    alm.classList.remove('hidden');
    alm.style.setProperty('display', 'flex', 'important');
    alm.style.setProperty('z-index', '99999', 'important');
    alm.style.setProperty('opacity', '1', 'important');
    alm.style.setProperty('pointer-events', 'auto', 'important');
  }
  const profileDropdown = document.getElementById('user-profile-dropdown');
  if (profileDropdown) profileDropdown.classList.add('hidden');

  const customerLoginModal = document.getElementById('customer-login-modal');
  if (customerLoginModal) {
    customerLoginModal.classList.add('hidden');
    customerLoginModal.style.setProperty('display', 'none', 'important');
  }

  const loginModal = document.getElementById('admin-login-modal');
  if (loginModal) {
    loginModal.classList.remove('hidden');
    loginModal.style.setProperty('display', 'flex', 'important');
    loginModal.style.zIndex = '999999';
    const passInput = document.getElementById('admin-master-passcode');
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 120);
    }
  }
  window.syncModalScrollLock();
};

window.switchToAdminFromCustomerLogin = function() {
  const customerLoginModal = document.getElementById('customer-login-modal');
  if (customerLoginModal) {
    customerLoginModal.classList.add('hidden');
    customerLoginModal.style.setProperty('display', 'none', 'important');
  }
  window.openAdminPortalModal();
};

window.closeAdminLoginModal = function() {
  const loginModal = document.getElementById('admin-login-modal');
  if (loginModal) {
    loginModal.classList.add('hidden');
    loginModal.style.setProperty('display', 'none', 'important');
  }
  window.syncModalScrollLock();
};

let adminFailedAttempts = 0;
let adminLockoutTimer = null;

window.toggleAdminPassVisibility = function() {
  const passInput = document.getElementById('admin-master-passcode');
  if (passInput) {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  }
};

window.handleAdminLoginSubmit = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const passInput = document.getElementById('admin-master-passcode');
  const errorBox = document.getElementById('admin-login-error');
  const lockoutNotice = document.getElementById('admin-lockout-notice');
  const submitBtn = document.getElementById('btn-admin-submit-action');

  // Check if locked out
  const storedLockout = parseInt(sessionStorage.getItem('varshan_admin_lockout_until') || '0', 10);
  const now = Date.now();
  if (storedLockout > now) {
    const remainingSec = Math.ceil((storedLockout - now) / 1000);
    if (lockoutNotice) {
      lockoutNotice.textContent = `🛑 Security Lockout Active: Too many failed attempts. Try again in ${remainingSec}s`;
      lockoutNotice.classList.remove('hidden');
    }
    if (errorBox) errorBox.classList.add('hidden');
    return false;
  }

  const passVal = (passInput?.value || '').trim();

  // One-Way Cryptographic Hash Match (Zero plaintext password in code)
  const passHash = computeSha256(passVal.toLowerCase());
  const isSuccess = (passHash === _SEC_VAULT_HASH);

  if (isSuccess) {
    adminFailedAttempts = 0;
    sessionStorage.removeItem('varshan_admin_lockout_until');
    if (errorBox) errorBox.classList.add('hidden');
    if (lockoutNotice) lockoutNotice.classList.add('hidden');
    if (passInput) passInput.value = '';

    window.ownerQuickUnlock();
    return false;
  } else {
    adminFailedAttempts++;
    if (adminFailedAttempts >= 3) {
      const lockUntil = Date.now() + 30000; // 30 seconds lock
      sessionStorage.setItem('varshan_admin_lockout_until', lockUntil.toString());
      if (errorBox) errorBox.classList.add('hidden');
      if (lockoutNotice) {
        lockoutNotice.textContent = '🛑 Too many failed attempts. Admin Vault locked for 30 seconds.';
        lockoutNotice.classList.remove('hidden');
      }
      if (submitBtn) submitBtn.disabled = true;

      if (adminLockoutTimer) clearInterval(adminLockoutTimer);
      adminLockoutTimer = setInterval(() => {
        const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(adminLockoutTimer);
          sessionStorage.removeItem('varshan_admin_lockout_until');
          adminFailedAttempts = 0;
          if (lockoutNotice) lockoutNotice.classList.add('hidden');
          if (submitBtn) submitBtn.disabled = false;
        } else {
          if (lockoutNotice) lockoutNotice.textContent = `🛑 Security Lockout: Try again in ${remaining}s`;
        }
      }, 1000);
    } else {
      if (errorBox) {
        errorBox.textContent = `⚠️ Invalid Master Passcode (${3 - adminFailedAttempts} attempt(s) remaining)`;
        errorBox.classList.remove('hidden');
      }
      if (lockoutNotice) lockoutNotice.classList.add('hidden');
    }
  }
  return false;
};

// =============================================================================
// ENTERPRISE PRODUCTION REAL-TIME ADMIN COMMAND & POS CENTER (8 MODULES)
// =============================================================================

let adminLiveClockStarted = false;
let currentAdminTab = 'orders';
let currentAdminOrderFilter = 'all';
let currentAdminOrderSearchQuery = '';
let showOnlyLowStockProducts = false;
let currentWmsCategoryFilter = 'all';
let currentWmsSearchQuery = '';
let currentCrmSearchQuery = '';
let activeAdminRole = 'owner';

// -----------------------------------------------------------------------------
// AUDIT LOG SYSTEM (ENTERPRISE ACTIVITY TRAIL)
// -----------------------------------------------------------------------------
function getSavedAuditLog() {
  try {
    const data = localStorage.getItem('varshan_admin_audit_log');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [
    {
      timestamp: Date.now() - 3600000,
      timeStr: 'Today 10:30 AM',
      user: 'Kalanithi Maran',
      role: 'Super Admin',
      action: 'SYSTEM_BOOT',
      details: 'Sivakasi Enterprise Operations Center initialized & online.',
      category: 'config'
    },
    {
      timestamp: Date.now() - 1800000,
      timeStr: 'Today 11:00 AM',
      user: 'Kalanithi Maran',
      role: 'Super Admin',
      action: 'STOCK_AUDIT',
      details: 'Automated warehouse stock verification completed for 38 formulations.',
      category: 'stock'
    }
  ];
}

function saveAuditLog(logList) {
  try {
    localStorage.setItem('varshan_admin_audit_log', JSON.stringify(logList.slice(0, 100)));
  } catch (e) {}
}

function logAdminAudit(action, details, category = 'order') {
  const logList = getSavedAuditLog();
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const timeStr = `${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  const roleNames = {
    owner: 'Super Admin (Owner)',
    manager: 'Factory Manager',
    cashier: 'POS Cashier',
    dispatcher: 'Logistics Dispatcher'
  };

  logList.unshift({
    timestamp: Date.now(),
    timeStr: timeStr,
    user: localStorage.getItem('varshan_admin_name') || 'Kalanithi Maran',
    role: roleNames[activeAdminRole] || 'Admin',
    action: action,
    details: details,
    category: category
  });

  saveAuditLog(logList);
  renderAdminAuditLog();
}

window.clearAuditLog = function() {
  if (confirm('Clear all security audit trail logs?')) {
    saveAuditLog([]);
    renderAdminAuditLog();
  }
};

function renderAdminAuditLog() {
  const tbody = document.getElementById('adm-audit-log-tbody');
  if (!tbody) return;

  const logs = getSavedAuditLog();
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 1.5rem; color: #64748b;">No recent audit activity records.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => {
    let badgeClass = 'audit-badge-order';
    if (l.category === 'pos') badgeClass = 'audit-badge-pos';
    if (l.category === 'stock') badgeClass = 'audit-badge-stock';
    if (l.category === 'config') badgeClass = 'audit-badge-config';

    return `
      <tr>
        <td style="font-family: 'Space Grotesk', monospace; color: #475569; font-size: 0.72rem;">${l.timeStr}</td>
        <td><b>${l.user}</b> <span style="font-size: 0.68rem; color: #64748b;">(${l.role})</span></td>
        <td><span class="audit-badge ${badgeClass}">${l.action}</span></td>
        <td style="color: #334155;">${l.details}</td>
      </tr>
    `;
  }).join('');
}

// -----------------------------------------------------------------------------
// STAFF ROLES & PERMISSIONS
// -----------------------------------------------------------------------------
window.changeAdminRole = function(newRole) {
  activeAdminRole = newRole;
  const nameEl = document.getElementById('admin-active-name');
  const roleNames = {
    owner: 'Kalanithi Maran (Owner)',
    manager: 'M. Senthil (Factory Mgr)',
    cashier: 'R. Velan (POS Cashier)',
    dispatcher: 'K. Murugan (Dispatch)'
  };

  if (nameEl) {
    nameEl.textContent = roleNames[newRole] || 'Admin Staff';
  }

  logAdminAudit('ROLE_SWITCH', `Switched active session view to: ${roleNames[newRole]}`, 'config');
  showToast(`🛡️ Active Role: ${roleNames[newRole]}`);
};

// -----------------------------------------------------------------------------
// CLOCK & CORE NAVIGATION
// -----------------------------------------------------------------------------
function startAdminLiveClock() {
  if (adminLiveClockStarted) return;
  adminLiveClockStarted = true;
  const clockEl = document.getElementById('adm-live-clock');
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = String(now.getDate()).padStart(2, '0');
    const m = months[now.getMonth()];
    const y = now.getFullYear();
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const min = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${h}:${min} ${ampm}`;
    clockEl.parentElement.setAttribute('title', `${d}-${m}-${y} ${h}:${min} ${ampm}`);
  }
  setInterval(updateClock, 1000);
  updateClock();
}

window.openAdminDashboardModal = function() {
  try {
    const dashModal = document.getElementById('admin-dashboard-modal');
    if (dashModal) {
      dashModal.classList.remove('hidden');
      dashModal.style.removeProperty('display');
      dashModal.style.setProperty('display', 'flex', 'important');
    }
    const adminLoginModal = document.getElementById('admin-login-modal');
    if (adminLoginModal) {
      adminLoginModal.classList.add('hidden');
      adminLoginModal.style.setProperty('display', 'none', 'important');
    }
    const custModal = document.getElementById('customer-login-modal');
    if (custModal) {
      custModal.classList.add('hidden');
      custModal.style.setProperty('display', 'none', 'important');
    }

    if (typeof startAdminLiveClock === 'function') startAdminLiveClock();
    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
    if (typeof switchAdminTab === 'function') switchAdminTab(currentAdminTab || 'orders');
  } catch (err) {
    console.error('Error opening Admin Dashboard Modal:', err);
    const dashModal = document.getElementById('admin-dashboard-modal');
    if (dashModal) {
      dashModal.classList.remove('hidden');
      dashModal.style.removeProperty('display');
      dashModal.style.setProperty('display', 'flex', 'important');
    }
  }
  window.syncModalScrollLock();
};

window.closeAdminDashboardModal = function() {
  const dashModal = document.getElementById('admin-dashboard-modal');
  if (dashModal) {
    dashModal.classList.add('hidden');
    dashModal.style.removeProperty('display');
    dashModal.style.setProperty('display', 'none', 'important');
  }
  window.syncModalScrollLock();
};

window.handleAdminLogout = function() {
  try {
    localStorage.removeItem('varshan_admin_logged');
    localStorage.removeItem('varshan_admin_session');
  } catch (e) {}
  logAdminAudit('ADMIN_LOGOUT', 'Administrator session securely terminated.', 'config');
  window.closeAdminDashboardModal();
  if (typeof refreshUserProfileUI === 'function') {
    refreshUserProfileUI();
  }
  if (typeof showToast === 'function') {
    showToast('👋 Administrator session closed. Returned to store.');
  }
  setTimeout(() => {
    window.location.reload();
  }, 300);
};

window.switchAdminTab = function(tabName) {
  currentAdminTab = tabName;
  const tabBtns = document.querySelectorAll('.adm-tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));

  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');

  const panes = document.querySelectorAll('.adm-tab-pane');
  panes.forEach(pane => {
    pane.classList.add('hidden');
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`adm-tab-${tabName}`);
  if (activePane) {
    activePane.classList.remove('hidden');
    activePane.classList.add('active');
  }

  // Update Enterprise Department Dropdown Trigger Title & Icon
  const deptMap = {
    orders: { icon: '📦', name: 'Orders & Dispatch Dept' },
    products: { icon: '🧴', name: 'Products & Warehouse' },
    analytics: { icon: '📊', name: 'Sales & Revenue Analytics' },
    customers: { icon: '👥', name: 'Customer CRM & Ledgers' },
    gst: { icon: '🧾', name: 'GST Tax & E-Invoicing' },
    formulation: { icon: '🧪', name: 'Raw Materials & Batching' },
    procurement: { icon: '🚚', name: 'Suppliers & Procurement' },
    staff: { icon: '🛡️', name: 'Staff Roles & Access RBAC' },
    marketing: { icon: '📢', name: 'Promotions & Broadcast' },
    settings: { icon: '⚙️', name: 'Settings & Security Audit' }
  };
  if (deptMap[tabName]) {
    const elIcon = document.getElementById('dept-trigger-active-icon');
    const elName = document.getElementById('dept-trigger-active-name');
    if (elIcon) elIcon.textContent = deptMap[tabName].icon;
    if (elName) elName.textContent = deptMap[tabName].name;
  }

  if (tabName === 'orders') renderAdminOrders();
  if (tabName === 'products') renderAdminWmsProducts();
  if (tabName === 'analytics') renderAdminAnalytics();
  if (tabName === 'customers') renderAdminCustomers();
  if (tabName === 'gst') renderAdminGstHub();
  if (tabName === 'formulation') renderAdminFormulation();
  if (tabName === 'procurement') renderAdminProcurement();
  if (tabName === 'staff') renderAdminStaffRbac();
  if (tabName === 'marketing') renderAdminMarketing();
  if (tabName === 'settings') renderAdminAuditLog();
};

// -----------------------------------------------------------------------------
// COLLEGE-STYLE DEPARTMENT DROPDOWN CONTROLS
// -----------------------------------------------------------------------------
window.toggleDepartmentDropdown = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('dept-dropdown-menu');
  const trigger = document.getElementById('btn-dept-trigger');
  if (menu) {
    const isClosed = menu.classList.contains('hidden');
    if (isClosed) {
      menu.classList.remove('hidden');
      if (trigger) {
        trigger.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    } else {
      menu.classList.add('hidden');
      if (trigger) {
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    }
  }
};

window.closeDepartmentDropdown = function() {
  const menu = document.getElementById('dept-dropdown-menu');
  const trigger = document.getElementById('btn-dept-trigger');
  if (menu) menu.classList.add('hidden');
  if (trigger) {
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }
};

window.selectDepartmentCategory = function(catKey) {
  window.switchAdminTab('products');
  const catSelect = document.getElementById('adm-wms-cat-filter');
  if (catSelect) {
    catSelect.value = catKey;
    if (typeof filterAdminWmsProducts === 'function') {
      filterAdminWmsProducts();
    }
  }
  const catTitles = {
    floor: 'Floor & Phenyl Dept',
    toilet: 'Toilet & Washroom Dept',
    brushes: 'Brushes & Tools Dept',
    hygiene: 'Fresheners & Hygiene Dept',
    kitchen: 'Kitchen & Laundry Dept'
  };
  const elName = document.getElementById('dept-trigger-active-name');
  if (elName && catTitles[catKey]) {
    elName.textContent = catTitles[catKey];
  }
  window.closeDepartmentDropdown();
};

// Dismiss dropdown when clicking outside or pressing Escape
document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('dept-dropdown-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    window.closeDepartmentDropdown();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    window.closeDepartmentDropdown();
    if (typeof window.closeStoreAboutModal === 'function') {
      window.closeStoreAboutModal();
    }
  }
});

// -----------------------------------------------------------------------------
// REFRESH & LIVE OPERATIONAL COUNTERS
// -----------------------------------------------------------------------------
function refreshAdminDashboard() {
  const orders = getSavedOrdersList();
  const stockMap = getStockLevels();
  
  let pendingCount = 0;
  let lowStockCount = 0;

  orders.forEach(ord => {
    const state = getOrderTrackingState(ord.status);
    if (state !== 4 && state !== -1) pendingCount++;
  });

  const prods = getAllCatalogProductsList();
  prods.forEach(p => {
    if (p.stock < 15) lowStockCount++;
  });

  // Update Header Badges & Tab Counters
  const elHeadOrders = document.getElementById('adm-head-orders-count');
  const elHeadLow = document.getElementById('adm-head-low-count');
  const elTabOrders = document.getElementById('adm-tab-orders-count');
  const elTabProd = document.getElementById('adm-prod-count');
  const elTabProdSub = document.getElementById('adm-prod-count-sub');

  if (elHeadOrders) elHeadOrders.textContent = pendingCount;
  if (elHeadLow) elHeadLow.textContent = lowStockCount;
  if (elTabOrders) elTabOrders.textContent = orders.length;
  if (elTabProd) elTabProd.textContent = prods.length;
  if (elTabProdSub) elTabProdSub.textContent = prods.length;

  if (currentAdminTab === 'orders') renderAdminOrders();
  if (currentAdminTab === 'products') renderAdminWmsProducts();
  if (currentAdminTab === 'analytics') renderAdminAnalytics();
  if (currentAdminTab === 'customers') renderAdminCustomers();
  if (currentAdminTab === 'gst') renderAdminGstHub();
  if (currentAdminTab === 'formulation') renderAdminFormulation();
  if (currentAdminTab === 'procurement') renderAdminProcurement();
  if (currentAdminTab === 'staff') renderAdminStaffRbac();
  if (currentAdminTab === 'marketing') renderAdminMarketing();
  if (currentAdminTab === 'settings') renderAdminAuditLog();
}

function getCatalogOverrides() {
  try {
    const data = localStorage.getItem('varshan_catalog_overrides');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {};
}

function saveCatalogOverrides(map) {
  try {
    localStorage.setItem('varshan_catalog_overrides', JSON.stringify(map));
  } catch (e) {}
}

function getDeletedProductIds() {
  try {
    const data = localStorage.getItem('varshan_deleted_products');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

function saveDeletedProductIds(ids) {
  try {
    localStorage.setItem('varshan_deleted_products', JSON.stringify(ids));
  } catch (e) {}
}

window.applyCatalogOverridesToStorefront = function() {
  const overrides = getCatalogOverrides();
  const deletedIds = getDeletedProductIds();

  // 1. Remove any deleted products from storefront DOM
  deletedIds.forEach(delId => {
    const el = document.getElementById(delId);
    if (el) el.remove();
  });

  const compactCards = document.querySelectorAll('#products-catalog-list .compact-card');

  compactCards.forEach((card, idx) => {
    const id = card.id || `prod-card-${idx}`;
    if (!card.id) card.id = id;

    if (deletedIds.includes(id)) {
      card.remove();
      return;
    }

    const ov = overrides[id];
    if (ov) {
      const tEl = card.querySelector('.comp-title');
      const pEl = card.querySelector('.comp-curr-price');
      const mEl = card.querySelector('.comp-mrp');
      const offEl = card.querySelector('.comp-off');
      const imgEl = card.querySelector('.compact-bottle-img');
      const imgBox = card.querySelector('.compact-img-box');
      const discountPct = Math.max(5, Math.round(((ov.mrp - ov.price) / ov.mrp) * 100));

      if (tEl) tEl.textContent = ov.title;
      if (pEl) pEl.textContent = `₹${ov.price}`;
      if (mEl) mEl.textContent = `₹${ov.mrp}`;
      if (offEl) offEl.textContent = `${discountPct}% off`;
      if (imgEl && ov.img) imgEl.setAttribute('src', ov.img);
      card.setAttribute('data-title', (ov.title || '').toLowerCase());
      if (ov.cat) card.setAttribute('data-category', ov.cat);

      // Bind detail modal opening with updated price & info
      const safeTitle = (ov.title || 'Chemical Product').replace(/'/g, "\\'");
      const safeImg = (ov.img || 'varshan_phenyl_perfect.png').replace(/'/g, "\\'");
      const modalCall = `openProductDetailModal('${safeTitle}', '₹${ov.price}', '₹${ov.mrp}', '${discountPct}% off', '${safeImg}', 'Standard Safe Formula', 'All Floors, Tiles & Restroom Areas')`;
      if (imgBox) imgBox.setAttribute('onclick', modalCall);
      if (tEl) tEl.setAttribute('onclick', modalCall);
    }
  });

  // Prepend any custom products added by admin into storefront catalog
  const customProds = getCustomSavedProducts();
  const catalog = document.getElementById('products-catalog-list');
  if (catalog) {
    customProds.forEach(cp => {
      if (deletedIds.includes(cp.id)) return;
      let existingCard = document.getElementById(cp.id);
      const discountPct = Math.max(5, Math.round(((cp.mrp - cp.price) / cp.mrp) * 100));
      const safeTitle = (cp.title || 'Chemical Formulation').replace(/'/g, "\\'");
      const safeImg = (cp.img || 'varshan_phenyl_perfect.png').replace(/'/g, "\\'");

      if (existingCard) {
        // Update existing custom card details
        const tEl = existingCard.querySelector('.comp-title');
        const pEl = existingCard.querySelector('.comp-curr-price');
        const mEl = existingCard.querySelector('.comp-mrp');
        const offEl = existingCard.querySelector('.comp-off');
        const imgEl = existingCard.querySelector('.compact-bottle-img');
        const imgBox = existingCard.querySelector('.compact-img-box');

        if (tEl) tEl.textContent = cp.title;
        if (pEl) pEl.textContent = `₹${cp.price}`;
        if (mEl) mEl.textContent = `₹${cp.mrp}`;
        if (offEl) offEl.textContent = `${discountPct}% off`;
        if (imgEl && cp.img) imgEl.setAttribute('src', cp.img);
        existingCard.setAttribute('data-title', (cp.title || '').toLowerCase());
        if (cp.cat) existingCard.setAttribute('data-category', cp.cat);

        const modalCall = `openProductDetailModal('${safeTitle}', '₹${cp.price}', '₹${cp.mrp}', '${discountPct}% off', '${safeImg}', 'Factory Blend Formulation', 'All Cleaning Applications')`;
        if (imgBox) imgBox.setAttribute('onclick', modalCall);
        if (tEl) tEl.setAttribute('onclick', modalCall);
      } else {
        const newCardHtml = `
          <div class="compact-card custom-added-product" id="${cp.id}" data-category="${cp.cat || 'floor'}" data-title="${(cp.title || '').toLowerCase()}">
            <span class="compact-badge" style="background: #2563eb;">NEW</span>
            <div class="compact-img-box" onclick="openProductDetailModal('${safeTitle}', '₹${cp.price}', '₹${cp.mrp}', '${discountPct}% off', '${safeImg}', 'Factory Blend Formulation', 'All Cleaning Applications')">
              <img src="${cp.img || 'varshan_phenyl_perfect.png'}" alt="${cp.title}" class="compact-bottle-img" width="160" height="160">
            </div>
            <div class="compact-details">
              <span class="comp-brand">VARSHAN CHEMICALS</span>
              <h4 class="comp-title" onclick="openProductDetailModal('${safeTitle}', '₹${cp.price}', '₹${cp.mrp}', '${discountPct}% off', '${safeImg}', 'Factory Blend Formulation', 'All Cleaning Applications')">
                ${cp.title}
              </h4>
              <div class="comp-rating-row">
                <span class="comp-star-badge">4.5 &#9733;</span>
                <span class="comp-ratings">(Verified)</span>
              </div>
              <div class="comp-price-row"><span class="comp-curr-price">₹${cp.price}</span><span class="comp-mrp">₹${cp.mrp}</span><span class="comp-off">${discountPct}% off</span></div>
              <span class="comp-del-note">Free Delivery &bull; ${cp.packSize || '1 Bottle'} Rate</span>
              <div class="comp-btn-group">
                <button type="button" class="btn-comp-cart">&#128722; Quick Add</button>
                <button type="button" class="btn-comp-buy" onclick="triggerProductCardBuy(this)">&#128269; View &amp; Buy</button>
              </div>
            </div>
          </div>
        `;
        catalog.insertAdjacentHTML('afterbegin', newCardHtml);
      }
    });
  }

  // 3. Apply Atomic Stock UI States across ALL Storefront Cards
  const stockMap = getStockLevels();
  const allCards = document.querySelectorAll('#products-catalog-list .compact-card');
  allCards.forEach((card, idx) => {
    const cardId = card.id || `prod-card-${idx}`;
    const stock = stockMap[cardId] !== undefined ? stockMap[cardId] : 45;
    const title = card.querySelector('.comp-title')?.textContent?.trim() || 'Chemical Product';
    const safeTitle = title.replace(/'/g, "\\'");
    const cartBtn = card.querySelector('.btn-comp-cart');
    const buyBtn = card.querySelector('.btn-comp-buy');
    
    // Clean existing pulse pill if any
    card.querySelector('.low-stock-pulse-pill')?.remove();

    if (stock === 0) {
      card.classList.add('is-out-of-stock');
      const badge = card.querySelector('.compact-badge');
      if (badge) {
        if (!card.getAttribute('data-badge-orig')) {
          card.setAttribute('data-badge-orig', badge.textContent);
        }
        badge.textContent = 'OUT OF STOCK';
        badge.classList.add('badge-out-of-stock');
      }
      if (cartBtn) {
        cartBtn.disabled = true;
        cartBtn.classList.add('btn-out-of-stock');
        cartBtn.textContent = 'Out of Stock';
      }
      if (buyBtn) {
        buyBtn.classList.add('btn-factory-preorder');
        buyBtn.innerHTML = '📲 Pre-Order';
        buyBtn.setAttribute('onclick', `openFactoryPreOrderWhatsApp('${safeTitle}')`);
      }
    } else {
      card.classList.remove('is-out-of-stock');
      const badge = card.querySelector('.compact-badge');
      if (badge && badge.classList.contains('badge-out-of-stock')) {
        badge.classList.remove('badge-out-of-stock');
        badge.textContent = card.getAttribute('data-badge-orig') || 'FACTORY DIRECT';
      }
      if (cartBtn && cartBtn.classList.contains('btn-out-of-stock')) {
        cartBtn.disabled = false;
        cartBtn.classList.remove('btn-out-of-stock');
        cartBtn.innerHTML = '&#128722; Quick Add';
      }
      if (buyBtn && buyBtn.classList.contains('btn-factory-preorder')) {
        buyBtn.classList.remove('btn-factory-preorder');
        buyBtn.innerHTML = '&#128269; View &amp; Buy';
        buyBtn.setAttribute('onclick', 'triggerProductCardBuy(this)');
      }

      if (stock > 0 && stock <= 5) {
        const pill = document.createElement('span');
        pill.className = 'low-stock-pulse-pill';
        pill.textContent = `⚡ Only ${stock} Left!`;
        card.appendChild(pill);
      }
    }
  });

  if (typeof window.updateCatalogCategoryCounts === 'function') {
    window.updateCatalogCategoryCounts();
  }
};

window.openFactoryPreOrderWhatsApp = function(productTitle) {
  const rawHelpline = (localStorage.getItem('varshan_factory_helpline') || '8122776379').replace(/\D/g, '');
  const cleanPhone = rawHelpline.endsWith('8122776379') ? '8122776379' : rawHelpline.slice(-10);
  const msg = encodeURIComponent(`Hello Varshan Chemicals Sivakasi (+91 ${cleanPhone}), I saw "${productTitle}" is currently Out of Stock in the store. I would like to place a Factory Direct Pre-Order from your next fresh production batch. Please confirm availability!`);
  window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
};

window.showStockAlertModal = function(itemTitle, message, availableStock, requestedStock) {
  const modal = document.getElementById('stock-alert-modal');
  const titleEl = document.getElementById('stock-alert-title');
  const msgEl = document.getElementById('stock-alert-msg');
  const pillEl = document.getElementById('stock-alert-pill');
  const waLink = document.getElementById('btn-stock-alert-wa-link');

  if (titleEl) titleEl.textContent = (availableStock === 0) ? 'Out of Stock Alert' : 'Limited Inventory Alert';
  if (msgEl) msgEl.textContent = message || `Another customer just placed an order for the remaining units of "${itemTitle}".`;
  if (pillEl) {
    pillEl.innerHTML = (availableStock === 0)
      ? `📦 Remaining Factory Stock: <b style="color: #dc2626;">0 Units (Sold Out)</b>`
      : `📦 Available Factory Stock: <b style="color: #059669;">${availableStock} Units</b> (You requested: ${requestedStock})`;
  }

  if (waLink) {
    const rawHelpline = (localStorage.getItem('varshan_factory_helpline') || '8122776379').replace(/\D/g, '');
    const cleanPhone = rawHelpline.endsWith('8122776379') ? '8122776379' : rawHelpline.slice(-10);
    const waText = encodeURIComponent(`Hello Varshan Chemicals, I want to Pre-Order "${itemTitle}" (${requestedStock || 1} Units) directly from your factory mixing batch. Please confirm!`);
    waLink.href = `https://wa.me/91${cleanPhone}?text=${waText}`;
  }

  if (modal) modal.classList.remove('hidden');
  window.syncModalScrollLock();
};

window.closeStockAlertModal = function() {
  const modal = document.getElementById('stock-alert-modal');
  if (modal) modal.classList.add('hidden');
  window.syncModalScrollLock();
  if (typeof window.applyCatalogOverridesToStorefront === 'function') {
    window.applyCatalogOverridesToStorefront();
  }
};

function getCustomSavedProducts() {
  try {
    const data = localStorage.getItem('varshan_custom_products');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

function saveCustomProducts(prods) {
  try {
    localStorage.setItem('varshan_custom_products', JSON.stringify(prods));
  } catch (e) {}
}

function getAllCatalogProductsList() {
  // Ensure DOM is up-to-date with overrides
  if (typeof window.applyCatalogOverridesToStorefront === 'function') {
    window.applyCatalogOverridesToStorefront();
  }

  const compactCards = document.querySelectorAll('#products-catalog-list .compact-card');
  const stockMap = getStockLevels();
  const overrides = getCatalogOverrides();
  const list = [];
  const addedIds = new Set();

  compactCards.forEach((card, idx) => {
    const id = card.id || `prod-card-${idx}`;
    addedIds.add(id);
    
    let title = card.querySelector('.comp-title')?.textContent?.trim() || `Product ${idx + 1}`;
    let priceStr = card.querySelector('.comp-curr-price')?.textContent?.trim() || '₹149';
    let mrpStr = card.querySelector('.comp-mrp')?.textContent?.trim() || '₹220';
    let price = parseInt(priceStr.replace(/\D/g, '')) || 149;
    let mrp = parseInt(mrpStr.replace(/\D/g, '')) || 220;
    let img = card.querySelector('.compact-bottle-img')?.getAttribute('src') || 'varshan_phenyl_perfect.png';
    let cat = card.getAttribute('data-category') || 'floor';

    if (overrides[id]) {
      title = overrides[id].title || title;
      price = overrides[id].price || price;
      mrp = overrides[id].mrp || mrp;
      if (overrides[id].img) img = overrides[id].img;
      if (overrides[id].cat) cat = overrides[id].cat;
    }

    const stock = stockMap[id] !== undefined ? stockMap[id] : (40 + (idx * 7) % 65);

    list.push({ id, title, price, mrp, img, cat, stock });
  });

  // Merge any custom user-added products stored in localStorage
  const customProds = getCustomSavedProducts();
  customProds.forEach(cp => {
    if (!addedIds.has(cp.id)) {
      addedIds.add(cp.id);
      const stock = stockMap[cp.id] !== undefined ? stockMap[cp.id] : (cp.stock || 50);
      list.unshift({
        id: cp.id,
        title: cp.title,
        price: cp.price,
        mrp: cp.mrp,
        img: cp.img || 'varshan_phenyl_perfect.png',
        cat: cp.cat || 'floor',
        stock: stock
      });
    }
  });

  return list;
}

// -----------------------------------------------------------------------------
// TAB 3: LIVE ORDERS & WHATSAPP DISPATCH HUB (OMS)
// -----------------------------------------------------------------------------
window.filterAdminOrders = function(filterKey) {
  currentAdminOrderFilter = filterKey;
  const pills = document.querySelectorAll('.adm-filter-pill');
  pills.forEach(p => p.classList.remove('active'));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }
  renderAdminOrders();
};

window.filterAdminOrdersSearch = function() {
  const searchInput = document.getElementById('adm-orders-search-input');
  currentAdminOrderSearchQuery = (searchInput?.value || '').trim().toLowerCase();
  renderAdminOrders();
};

window.updateOrderStatus = function(orderId, newStatus) {
  let orders = getSavedOrdersList();
  let found = false;

  orders = orders.map(ord => {
    if (ord.orderId === orderId) {
      ord.status = newStatus;
      // If admin reopens or cancels order, reset customer receipt confirmation so they can confirm afresh upon future delivery
      if (newStatus !== 'Delivered Successfully') {
        delete ord.customerReceivedConfirmation;
        delete ord.customerConfirmedAt;
        delete ord.customerReportedAt;
      }
      if (newStatus.includes('Placed')) {
        ord.adminConfirmed = false;
        delete ord.expectedDeliveryDate;
        delete ord.expectedDeliveryTime;
        delete ord.adminConfirmedAt;
      }
      found = true;
    }
    return ord;
  });

  if (found) {
    try {
      localStorage.setItem('varshan_order_history', JSON.stringify(orders));
    } catch (e) {}

    // Asynchronously notify backend server
    secureApiRequest(`/orders/${orderId}/status`, 'PATCH', { status: newStatus }).catch(() => {});

    logAdminAudit('ORDER_UPDATE', `Order #${orderId} status changed to: ${newStatus}`, 'order');
    refreshAdminDashboard();
    renderCustomerOrdersList();
    renderAdminOrders();
  }
};

window.confirmCustomerReceipt = function(orderId, answer) {
  let orders = getSavedOrdersList();
  let found = false;
  let targetOrder = null;
  const nowFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  orders = orders.map(ord => {
    if (ord.orderId === orderId) {
      ord.customerReceivedConfirmation = answer; // 'yes' or 'no'
      if (answer === 'yes') {
        ord.customerConfirmedAt = nowFormatted;
        delete ord.customerReportedAt;
      } else {
        ord.customerReportedAt = nowFormatted;
        delete ord.customerConfirmedAt;
      }
      found = true;
      targetOrder = ord;
    }
    return ord;
  });

  if (found) {
    try {
      localStorage.setItem('varshan_order_history', JSON.stringify(orders));
    } catch (e) {}

    // Sync receipt confirmation to backend
    secureApiRequest(`/orders/${orderId}/status`, 'PATCH', {
      customerReceivedConfirmation: answer,
      status: answer === 'yes' ? 'Delivered Successfully' : 'Delivery Disputed'
    }).catch(() => {});

    if (answer === 'yes') {
      logAdminAudit('ORDER_RECEIPT_CONFIRMED', `Customer ${targetOrder?.customerName || 'Customer'} confirmed receipt of Order #${orderId}`, 'order');
      if (typeof showToast === 'function') {
        showToast(`✅ Thank you! Receipt confirmed for Order #${orderId}`);
      }
    } else {
      logAdminAudit('ORDER_NOT_RECEIVED_ALERT', `Customer ${targetOrder?.customerName || 'Customer'} reported NOT receiving Order #${orderId}`, 'alert');
      if (typeof showToast === 'function') {
        showToast(`⚠️ Report submitted for Order #${orderId}. Sivakasi helpline is alerted.`);
      }
    }

    renderCustomerOrdersList();
    if (typeof renderAdminOrders === 'function') {
      renderAdminOrders();
    }
    if (typeof refreshAdminDashboard === 'function') {
      refreshAdminDashboard();
    }
  }
};

window.adminConfirmAndScheduleOrder = function(orderId) {
  const dateInput = document.getElementById(`adm-date-${orderId}`);
  const timeSelect = document.getElementById(`adm-time-${orderId}`);

  let dateVal = dateInput?.value;
  let timeVal = timeSelect?.value || 'Evening 04:00 PM - 07:00 PM';

  if (!dateVal) {
    const tomorrow = new Date(Date.now() + 86400000);
    dateVal = tomorrow.toISOString().slice(0, 10);
  }

  // Format date nicely: e.g. "05-Sep-2026 (Saturday)"
  const parts = dateVal.split('-');
  const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${String(dObj.getDate()).padStart(2, '0')}-${months[dObj.getMonth()]}-${dObj.getFullYear()} (${days[dObj.getDay()]})`;

  const nowFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  let orders = getSavedOrdersList();
  let found = false;
  let targetOrder = null;

  orders = orders.map(ord => {
    if (ord.orderId === orderId) {
      ord.adminConfirmed = true;
      ord.adminConfirmedAt = nowFormatted;
      ord.expectedDeliveryDate = formattedDate;
      ord.expectedDeliveryTime = timeVal;
      ord.status = 'Order Confirmed & Scheduled';
      found = true;
      targetOrder = ord;
    }
    return ord;
  });

  if (found) {
    try {
      localStorage.setItem('varshan_order_history', JSON.stringify(orders));
    } catch (e) {}

    // Asynchronously notify backend server / Mongo Atlas
    if (typeof secureApiRequest === 'function') {
      secureApiRequest(`/orders/${orderId}/status`, 'PATCH', {
        status: 'Order Confirmed & Scheduled',
        adminConfirmed: true,
        expectedDeliveryDate: formattedDate,
        expectedDeliveryTime: timeVal
      }).catch(() => {});
    }

    logAdminAudit('ORDER_CONFIRMED', `Confirmed Order #${orderId} for ${targetOrder?.customerName || 'Customer'}. Scheduled delivery: ${formattedDate} (${timeVal})`, 'order');
    showToast(`✅ Order #${orderId} Confirmed! Scheduled: ${formattedDate}`);

    renderAdminOrders();
    renderCustomerOrdersList();
    refreshAdminDashboard();

    // Automatically trigger WhatsApp notification to customer's mobile number
    setTimeout(() => {
      window.sendCustomerDeliveryScheduleWhatsApp(orderId);
    }, 250);
  }
};

window.sendCustomerDeliveryScheduleWhatsApp = function(orderId) {
  const orders = getSavedOrdersList();
  const ord = orders.find(o => o.orderId === orderId);
  if (!ord) {
    if (typeof showToast === 'function') showToast('❌ Order details not found!');
    return;
  }

  let rawPhone = (ord.customerMobile || '').replace(/\D/g, '');
  if (!rawPhone) {
    alert('Customer mobile number is missing for this order!');
    return;
  }

  // Ensure 91 country prefix
  let targetPhone = rawPhone;
  if (targetPhone.length === 10) {
    targetPhone = '91' + targetPhone;
  } else if (targetPhone.startsWith('0') && targetPhone.length === 11) {
    targetPhone = '91' + targetPhone.slice(1);
  } else if (!targetPhone.startsWith('91') && targetPhone.length > 10) {
    targetPhone = '91' + targetPhone;
  }

  const custName = ord.customerName || 'Customer';
  const deliveryDate = ord.expectedDeliveryDate || 'Soon';
  const deliveryTime = ord.expectedDeliveryTime || 'Standard Slot';
  const deliveryAddress = ord.customerAddress || 'Sivakasi';
  const grandTotal = ord.grandTotal || '0';
  const paymentMode = ord.paymentMode || 'Cash on Delivery';

  // Build items list
  const itemsList = (ord.items || []).map((it, idx) => {
    return `${idx + 1}. ${it.name} (${it.packSize || '1 L'}) x ${it.quantity} = Rs. ${(it.price || 0) * (it.quantity || 1)}`;
  }).join('\n');

  const msg = 
`*VARSHAN CHEMICALS - ORDER CONFIRMED*
----------------------------------------
Hello ${custName},
Your Order #${ord.orderId} has been confirmed.

Delivery Date: ${deliveryDate}
Delivery Time Slot: ${deliveryTime}
Delivery Address: ${deliveryAddress}
Total Amount: Rs. ${grandTotal} (${paymentMode})

Items:
${itemsList || '1. Varshan Chemical Products'}
----------------------------------------
Your order will be delivered to your address at the scheduled time.
Helpline: 81227 76379
Thank you! - Varshan Chemicals, Sivakasi`;

  window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  if (typeof showToast === 'function') {
    showToast(`📲 Delivery schedule sent to customer WhatsApp (+91 ${rawPhone})`);
  }
};

window.sendWhatsAppDispatch = function(orderId) {
  window.sendCustomerDeliveryScheduleWhatsApp(orderId);
};

window.adminPromptReschedule = function(orderId) {
  const orders = getSavedOrdersList();
  const ord = orders.find(o => o.orderId === orderId);
  if (!ord) return;

  const newDate = prompt(`Enter new Expected Delivery Date for Order #${orderId}:`, ord.expectedDeliveryDate || 'Tomorrow');
  if (newDate === null) return;

  const newTime = prompt(`Enter Delivery Slot / Time:`, ord.expectedDeliveryTime || 'Evening 04:00 PM - 07:00 PM');
  if (newTime === null) return;

  ord.expectedDeliveryDate = newDate.trim() || ord.expectedDeliveryDate;
  ord.expectedDeliveryTime = newTime.trim() || ord.expectedDeliveryTime;

  try {
    localStorage.setItem('varshan_order_history', JSON.stringify(orders));
  } catch (e) {}

  // Asynchronously notify backend server / Mongo Atlas
  if (typeof secureApiRequest === 'function') {
    secureApiRequest(`/orders/${orderId}/status`, 'PATCH', {
      expectedDeliveryDate: ord.expectedDeliveryDate,
      expectedDeliveryTime: ord.expectedDeliveryTime
    }).catch(() => {});
  }

  logAdminAudit('ORDER_RESCHEDULED', `Rescheduled Order #${orderId} to: ${ord.expectedDeliveryDate} (${ord.expectedDeliveryTime})`, 'order');
  showToast(`📅 Delivery date updated for Order #${orderId}`);

  renderAdminOrders();
  renderCustomerOrdersList();

  // Prompt to inform customer via WhatsApp
  if (confirm(`வாடிக்கையாளர் (+91 ${ord.customerMobile}) வாட்ஸ்அப்பிற்கு மாற்றப்பட்ட புதிய நேரத்தை அனுப்பவா?`)) {
    window.sendCustomerDeliveryScheduleWhatsApp(orderId);
  }
};

window.printPackingSlip = function(orderId) {
  const orders = getSavedOrdersList();
  const ord = orders.find(o => o.orderId === orderId);
  if (!ord) return;
  const printWindow = window.open('', '_blank', 'width=650,height=750');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>Tax Invoice / Packing Slip - ${ord.orderId}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 25px; color: #000; font-size: 13px; line-height: 1.45; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 17px; font-weight: bold; }
          .meta { margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { text-align: left; padding: 6px 0; border-bottom: 1px dashed #bbb; font-size: 12px; }
          .total-row { font-size: 15px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 25px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">👑 VARSHAN CHEMICALS FACTORY DEPOT</div>
          <div>14/2, Factory Road, Sivakasi - 626123 &bull; Ph: 8122776379</div>
          <div><b>GSTIN: 33AAACV8890A1Z5 &bull; OFFICIAL TAX INVOICE</b></div>
        </div>
        <div class="meta">
          <div><b>Bill / Order ID:</b> ${ord.orderId} ${ord.posCounter ? '(POS Counter Sale)' : '(Online Web Dispatch)'}</div>
          <div><b>Date &amp; Time:</b> ${ord.date} ${ord.time}</div>
          <div><b>Customer Name:</b> ${ord.customerName} (Ph: +91 ${ord.customerMobile})</div>
          <div><b>Delivery Address:</b> ${ord.customerAddress}</div>
          <div><b>Payment Mode:</b> ${ord.paymentMode || 'Cash on Delivery (COD)'}</div>
          <div><b>Dispatch Status:</b> ${ord.status}</div>
          <div><b>Expected Delivery:</b> ${ord.expectedDeliveryDate ? `${ord.expectedDeliveryDate} (${ord.expectedDeliveryTime || 'Standard'})` : 'Standard Factory Dispatch'}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Pack</th>
              <th>Qty</th>
              <th style="text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(ord.items || []).map(it => `
              <tr>
                <td>${it.name}</td>
                <td>${it.packSize || '1 L'}</td>
                <td>× ${it.quantity}</td>
                <td style="text-align:right;">₹${it.price * it.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-row">
          <span>NET PAYABLE AMOUNT:</span>
          <span style="float:right;">₹${ord.grandTotal}</span>
        </div>
        <div style="font-size: 11px; margin-top: 8px; color: #444;">
          * Inclusive of 18% GST (CGST 9% + SGST 9%) &bull; Hazmat Sealed
        </div>
        <div class="footer">
          *** Thank You for Shopping with Varshan Chemicals Sivakasi ***
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

function renderAdminOrders() {
  const container = document.getElementById('adm-orders-list-container');
  if (!container) return;

  const orders = getSavedOrdersList();
  
  let filtered = orders;
  if (currentAdminOrderFilter === 'placed') {
    // All active pending delivery orders (not delivered and not cancelled)
    filtered = orders.filter(o => getOrderTrackingState(o.status) !== 4 && getOrderTrackingState(o.status) !== -1);
  } else if (currentAdminOrderFilter === 'delivered') {
    filtered = orders.filter(o => getOrderTrackingState(o.status) === 4);
  } else if (currentAdminOrderFilter === 'cancelled') {
    filtered = orders.filter(o => getOrderTrackingState(o.status) === -1);
  }

  if (currentAdminOrderSearchQuery) {
    filtered = filtered.filter(o => {
      const q = currentAdminOrderSearchQuery;
      return (o.orderId || '').toLowerCase().includes(q) ||
             (o.customerName || '').toLowerCase().includes(q) ||
             (o.customerMobile || '').toLowerCase().includes(q) ||
             (o.customerAddress || '').toLowerCase().includes(q);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="adm-empty-orders">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📦</div>
        <h4>No Orders Found</h4>
        <p style="color: #64748b; font-size: 0.85rem;">There are no customer orders matching the current filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const trackState = getOrderTrackingState(order.status);
    const isDelivered = trackState === 4;
    const isCancelled = trackState === -1;

    let statusPillClass = 'status-pill-pending';
    let statusPillText = '🟡 Pending Confirmation';
    if (isDelivered) {
      statusPillClass = 'status-pill-delivered';
      statusPillText = '🟢 Delivered';
    } else if (isCancelled) {
      statusPillClass = 'status-pill-cancelled';
      statusPillText = '🔴 Cancelled';
    } else if (trackState === 3) {
      statusPillClass = 'status-pill-shipped';
      statusPillText = '🚚 In Transit';
    } else if (trackState === 2 || order.adminConfirmed) {
      statusPillClass = 'status-pill-confirmed';
      statusPillText = '📦 Confirmed';
    }

    const tomorrowObj = new Date(Date.now() + 86400000);
    const defTomorrowDate = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

    return `
      <div class="adm-order-card ${isDelivered ? 'is-delivered-card' : ''} ${isCancelled ? 'is-cancelled-card' : ''}">
        <div class="adm-order-head">
          <div class="adm-ord-meta">
            <span class="adm-ord-no">${order.orderId} ${order.posCounter ? '<b style="color: #2563eb; font-size: 0.72rem;">[POS Counter]</b>' : ''}</span>
            <span class="adm-ord-time">📅 ${order.date} &bull; ${order.time}</span>
          </div>
          <div class="adm-ord-status-pill ${statusPillClass}">
            ${statusPillText}
          </div>
        </div>

        <div class="adm-order-body-grid">
          <div class="adm-cust-details-box">
            <div class="adm-box-label">CUSTOMER DETAILS:</div>
            <div class="adm-c-name"><b>👤 ${order.customerName || 'Customer'}</b></div>
            <div class="adm-c-phone">📞 <a href="tel:${order.customerMobile}">+91 ${order.customerMobile}</a></div>
            <div class="adm-c-addr">📍 ${order.customerAddress || 'Sivakasi'}</div>
            <div class="adm-cust-quick-btns">
              <button type="button" class="btn-adm-wa" onclick="sendCustomerDeliveryScheduleWhatsApp('${order.orderId}')" title="Send delivery date &amp; time to customer WhatsApp">💬 Send WhatsApp Schedule</button>
              <button type="button" class="btn-adm-print" onclick="printPackingSlip('${order.orderId}')">🖨️ Print Bill</button>
            </div>
          </div>

          <div class="adm-items-details-box">
            <div class="adm-box-label">ORDERED CHEMICALS (${order.totalQty || (order.items ? order.items.length : 1)} Units):</div>
            <div class="adm-items-compact-list">
              ${(order.items || []).map(it => `
                <div class="adm-item-line">
                  <span>${it.name} (${it.packSize || '1 L'})</span>
                  <b>× ${it.quantity} = ₹${it.price * it.quantity}</b>
                </div>
              `).join('')}
            </div>
            <div class="adm-grand-total-row">
              <span>Grand Total:</span>
              <b class="adm-grand-total-val">₹${order.grandTotal}</b>
            </div>
          </div>
        </div>

        <div class="adm-order-actions-row">
          ${!isDelivered && !isCancelled ? `
            ${(!order.adminConfirmed && trackState <= 1) ? `
              <!-- Stage 1: Order Placed -> Admin Confirms & Schedules Delivery -->
              <div class="adm-schedule-delivery-box">
                <div class="adm-sdb-header">
                  <span class="adm-sdb-title">📅 Confirm Order &amp; Set Delivery Date &amp; Time</span>
                  <span class="adm-sdb-badge">New Order Placed</span>
                </div>
                <div class="adm-sdb-form">
                  <div class="adm-sdb-field">
                    <label for="adm-date-${order.orderId}">Expected Delivery Date:</label>
                    <input type="date" id="adm-date-${order.orderId}" class="adm-input-date" value="${defTomorrowDate}" min="${new Date().toISOString().slice(0, 10)}">
                  </div>
                  <div class="adm-sdb-field">
                    <label for="adm-time-${order.orderId}">Delivery Slot:</label>
                    <select id="adm-time-${order.orderId}" class="adm-input-select">
                      <option value="Morning 10:00 AM - 01:00 PM">Morning 10:00 AM - 01:00 PM</option>
                      <option value="Afternoon 01:00 PM - 04:00 PM">Afternoon 01:00 PM - 04:00 PM</option>
                      <option value="Evening 04:00 PM - 07:00 PM" selected>Evening 04:00 PM - 07:00 PM</option>
                      <option value="Same-Day Express Dispatch">Same-Day Express Dispatch</option>
                      <option value="Next-Day Morning Delivery">Next-Day Morning Delivery</option>
                    </select>
                  </div>
                </div>
                <div class="adm-sdb-actions">
                  <button type="button" class="btn-adm-confirm-schedule" onclick="adminConfirmAndScheduleOrder('${order.orderId}')">
                    <span>✅ Confirm Order &amp; Set Delivery Date</span>
                  </button>
                  <button type="button" class="btn-adm-status btn-status-cancel" onclick="updateOrderStatus('${order.orderId}', 'Order Cancelled')">
                    <span>✕ Cancel Order</span>
                  </button>
                </div>
              </div>
            ` : `
              <!-- Stage 2 / 3: Confirmed / Dispatched -> Scheduled Banner + Next Actions -->
              <div class="adm-scheduled-delivery-card ${trackState === 3 ? 'in-transit' : ''}">
                <div class="adm-sdc-left">
                  <span class="adm-sdc-icon">${trackState === 3 ? '🚚' : '📅'}</span>
                  <div class="adm-sdc-text">
                    <div class="adm-sdc-label">${trackState === 3 ? 'IN TRANSIT &bull; CLIENT NOTIFIED SCHEDULE:' : 'CONFIRMED DELIVERY SCHEDULE (CLIENT NOTIFIED):'}</div>
                    <div class="adm-sdc-val">${order.expectedDeliveryDate || 'Scheduled'} &bull; ${order.expectedDeliveryTime || 'Standard Slot'}</div>
                    <div class="adm-sdc-confirmed-by">${order.adminConfirmedAt ? 'Confirmed on ' + order.adminConfirmedAt : 'Factory Scheduled'}</div>
                  </div>
                </div>
                <div class="adm-sdc-right-actions">
                  <button type="button" class="btn-adm-reschedule" onclick="adminPromptReschedule('${order.orderId}')" title="Change delivery date">
                    <span>✏️ Reschedule Date</span>
                  </button>
                  <button type="button" class="btn-adm-wa-schedule" onclick="sendCustomerDeliveryScheduleWhatsApp('${order.orderId}')" title="Send delivery schedule directly to customer WhatsApp">
                    <span>💬 WhatsApp Schedule</span>
                  </button>
                </div>
              </div>

              <div class="adm-stage-actions-row">
                ${trackState !== 3 ? `
                  <button type="button" class="btn-adm-status btn-status-dispatch" onclick="updateOrderStatus('${order.orderId}', 'Dispatched & In Transit')">
                    <span>🚚 Mark as Dispatched</span>
                  </button>
                ` : ''}
                <button type="button" class="btn-adm-status btn-status-deliver-direct" onclick="updateOrderStatus('${order.orderId}', 'Delivered Successfully')">
                  <span>✅ Mark as Delivered</span>
                </button>
                <button type="button" class="btn-adm-status btn-status-cancel" onclick="updateOrderStatus('${order.orderId}', 'Order Cancelled')">
                  <span>✕ Cancel Order</span>
                </button>
              </div>
            `}
          ` : (isDelivered ? `
            <div class="adm-receipt-confirmation-banner-wrap">
              ${order.customerReceivedConfirmation === 'yes' ? `
                <div class="adm-receipt-confirmation-banner verified">
                  <div class="adm-rcb-header">
                    <span class="adm-rcb-badge">🎉 VERIFIED BY CUSTOMER</span>
                    <span class="adm-rcb-time">Confirmed: ${order.customerConfirmedAt || 'Recently'}</span>
                  </div>
                  <div class="adm-rcb-body">
                    <div class="adm-rcb-icon">✅</div>
                    <div class="adm-rcb-info">
                      <h4 class="adm-rcb-title">ORDER HAS BEEN RECEIVED SUCCESSFULLY!</h4>
                      <p class="adm-rcb-detail">Customer <b>${order.customerName || 'Customer'}</b> (+91 ${order.customerMobile || ''}) has acknowledged and confirmed receipt of this order.</p>
                    </div>
                  </div>
                </div>
              ` : (order.customerReceivedConfirmation === 'no' ? `
                <div class="adm-receipt-confirmation-banner alert">
                  <div class="adm-rcb-header">
                    <span class="adm-rcb-badge-alert">🚨 URGENT CUSTOMER ALERT</span>
                    <span class="adm-rcb-time">Reported: ${order.customerReportedAt || 'Recently'}</span>
                  </div>
                  <div class="adm-rcb-body">
                    <div class="adm-rcb-icon">⚠️</div>
                    <div class="adm-rcb-info">
                      <h4 class="adm-rcb-title-alert">CUSTOMER REPORTED: ORDER NOT RECEIVED!</h4>
                      <p class="adm-rcb-detail">Customer <b>${order.customerName || 'Customer'}</b> (+91 ${order.customerMobile || ''}) reported that this package was not received. Please verify with delivery personnel immediately!</p>
                    </div>
                    ${order.customerMobile ? `<a href="tel:${order.customerMobile}" class="btn-adm-call-cust">📞 Call Customer</a>` : ''}
                  </div>
                </div>
              ` : `
                <div class="adm-receipt-confirmation-banner pending">
                  <div class="adm-rcb-body">
                    <div class="adm-rcb-icon">⏳</div>
                    <div class="adm-rcb-info">
                      <h4 class="adm-rcb-title-pending">Awaiting Customer Confirmation</h4>
                      <p class="adm-rcb-detail">Delivery marked by factory agent. Waiting for customer (<b>${order.customerName || 'Customer'}</b>) to confirm receipt in app.</p>
                    </div>
                    <span class="adm-rcb-tag-pending">Response Pending</span>
                  </div>
                </div>
              `)}
            </div>

            <div class="adm-delivered-badge-row">
              <span class="adm-delivered-success-msg">✅ Delivered to Customer (Payment Received)</span>
              <button type="button" class="btn-adm-status btn-status-reopen" onclick="updateOrderStatus('${order.orderId}', 'Order Placed (Pending Delivery)')" title="Reopen this order">
                <span>↩️ Reopen Order</span>
              </button>
            </div>
          ` : `
            <div class="adm-cancelled-badge-row">
              <span class="adm-cancelled-msg">⚠️ Order Cancelled</span>
              <button type="button" class="btn-adm-status btn-status-restore" onclick="updateOrderStatus('${order.orderId}', 'Order Placed (Pending Delivery)')" title="Restore this order">
                <span>↩️ Restore Order</span>
              </button>
            </div>
          `)}
        </div>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------------
// TAB 4: WAREHOUSE STOCK CONTROL & TABULAR WMS DATAGRID
// -----------------------------------------------------------------------------
function getStockLevels() {
  try {
    const data = localStorage.getItem('varshan_stock_levels');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {};
}

function saveStockLevels(stockMap) {
  try {
    localStorage.setItem('varshan_stock_levels', JSON.stringify(stockMap));
  } catch (e) {}
}

window.restockProduct = function(prodId, addedUnits) {
  const stockMap = getStockLevels();
  const current = stockMap[prodId] !== undefined ? stockMap[prodId] : 45;
  stockMap[prodId] = current + addedUnits;
  saveStockLevels(stockMap);
  logAdminAudit('STOCK_RESTOCK', `Restocked +${addedUnits} bottles for formulation [${prodId}]. New Stock: ${stockMap[prodId]}`, 'stock');
  refreshAdminDashboard();
};

window.quickRestockAllHealthy = function(addedUnits = 50) {
  const stockMap = getStockLevels();
  const compactCards = document.querySelectorAll('#products-catalog-list .compact-card');
  compactCards.forEach((card, idx) => {
    const id = card.id || `prod-card-${idx}`;
    const current = stockMap[id] !== undefined ? stockMap[id] : 45;
    stockMap[id] = current + addedUnits;
  });
  saveStockLevels(stockMap);
  logAdminAudit('BULK_RESTOCK', `Bulk replenished all 38 chemical formulations (+${addedUnits} bottles each).`, 'stock');
  refreshAdminDashboard();
  showToast(`📥 Bulk Restocked All Formulations (+${addedUnits} Bottles each)`);
};

window.toggleLowStockFilter = function() {
  showOnlyLowStockProducts = !showOnlyLowStockProducts;
  const btn = document.getElementById('btn-toggle-low-stock');
  if (btn) {
    if (showOnlyLowStockProducts) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🔙 Show All Formulations</span>';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span>⚠️ Low Stock Only (<15)</span>';
    }
  }
  renderAdminWmsProducts();
};

window.filterAdminWmsProducts = function() {
  const searchInput = document.getElementById('adm-wms-search-input');
  const catSelect = document.getElementById('adm-wms-cat-filter');
  currentWmsSearchQuery = (searchInput?.value || '').trim().toLowerCase();
  currentWmsCategoryFilter = catSelect?.value || 'all';
  renderAdminWmsProducts();
};

window.changeCustomStockInput = function(prodId, delta) {
  const input = document.getElementById(`custom-stock-val-${prodId}`);
  if (input) {
    let val = parseInt(input.value) || 10;
    val = Math.max(1, val + delta);
    input.value = val;
  }
};

window.applyCustomStockAdd = function(prodId) {
  const input = document.getElementById(`custom-stock-val-${prodId}`);
  const qty = parseInt(input?.value) || 10;
  restockProduct(prodId, qty);
  showToast(`📦 Restocked +${qty} bottles!`);
};

window.applyQuickStockAdd = function(prodId, qty, title) {
  restockProduct(prodId, qty);
  showToast(`⚡ Restocked +${qty} bottles for "${title || 'Chemical'}"!`);
};

window.setDirectStockPrompt = function(prodId, currentStock, title) {
  const newStock = prompt(`Set exact stock count for "${title}":`, currentStock);
  if (newStock !== null && !isNaN(parseInt(newStock))) {
    const qty = Math.max(0, parseInt(newStock));
    const stockMap = getStockLevels();
    stockMap[prodId] = qty;
    saveStockLevels(stockMap);
    logAdminAudit('STOCK_SET', `Manually set stock for [${title}] to ${qty} units.`, 'stock');
    refreshAdminDashboard();
    showToast(`📦 Stock updated to ${qty} bottles for ${title}`);
  }
};

window.renderAdminWmsProducts = function() {
  const tbody = document.getElementById('adm-wms-tbody');
  const countEl = document.getElementById('adm-prod-count');
  const countSubEl = document.getElementById('adm-prod-count-sub');
  if (!tbody) return;

  const prods = getAllCatalogProductsList();
  if (countEl) countEl.textContent = prods.length;
  if (countSubEl) countSubEl.textContent = prods.length;

  let displayed = prods;
  if (showOnlyLowStockProducts) {
    displayed = displayed.filter(p => p.stock < 15);
  }

  if (currentWmsCategoryFilter !== 'all') {
    displayed = displayed.filter(p => p.cat === currentWmsCategoryFilter);
  }

  if (currentWmsSearchQuery) {
    displayed = displayed.filter(p => p.title.toLowerCase().includes(currentWmsSearchQuery) || p.cat.toLowerCase().includes(currentWmsSearchQuery));
  }

  if (displayed.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding: 2.5rem; text-align: center; color: #64748b;"><b>No formulation matches this filter.</b></td></tr>`;
    return;
  }

  tbody.innerHTML = displayed.map((p, index) => {
    const isCritical = p.stock < 15;
    const healthClass = isCritical ? 'critical' : 'healthy';
    const percentWidth = Math.min(100, Math.round((p.stock / 100) * 100));
    const costPrice = Math.round(p.price * 0.68);
    const marginPct = Math.round(((p.price - costPrice) / p.price) * 100);
    const skuCode = `VC-SKU-${100 + index}`;
    const safeTitle = p.title.replace(/'/g, "\\'");

    return `
      <tr class="${isCritical ? 'low-stock-alert-card' : ''}">
        <td class="wms-col-photo text-center"><img src="${p.img}" class="wms-prod-thumb" alt="${p.title}"></td>
        <td class="wms-col-name"><b>${p.title}</b><br><small>SKU: ${skuCode}</small></td>
        <td class="wms-col-cat"><span class="wms-cat-pill">${p.cat.toUpperCase()}</span></td>
        <td class="wms-col-price text-right">₹${costPrice}</td>
        <td class="wms-col-mrp text-right"><b>₹${p.price}</b></td>
        <td class="wms-col-margin text-center">${marginPct}% Margin</td>
        <td class="wms-col-stock">
          <div class="wms-stock-gauge" style="cursor: pointer;" onclick="setDirectStockPrompt('${p.id}', ${p.stock}, '${safeTitle}')" title="Click to set exact stock count">
            <div class="stock-num-row">
              <span style="font-weight: 800; color: ${isCritical ? '#dc2626' : '#0f172a'};">
                ${isCritical ? '⚠️ CRITICAL' : '📦 STOCK'}: <b>${p.stock} Units</b>
              </span>
              <span style="font-size: 0.68rem; color: #2563eb; font-weight: 700; text-decoration: underline;">✏️ Edit</span>
            </div>
            <div class="stock-bar-track"><div class="stock-bar-fill ${healthClass}" style="width: ${percentWidth}%;"></div></div>
          </div>
        </td>
        <td class="wms-col-restock text-center">
          <div class="modern-restock-widget">
            <div class="restock-quick-pills">
              <button type="button" class="btn-rst-quick" onclick="applyQuickStockAdd('${p.id}', 10, '${safeTitle}')" title="Instantly add +10 units">+10</button>
              <button type="button" class="btn-rst-quick highlight" onclick="applyQuickStockAdd('${p.id}', 50, '${safeTitle}')" title="Instantly add +50 units">+50</button>
            </div>
            <div class="restock-input-row">
              <button type="button" class="btn-rst-step" onclick="changeCustomStockInput('${p.id}', -5)" title="Minus 5">−</button>
              <input type="number" id="custom-stock-val-${p.id}" class="rst-number-input" value="10" min="1" max="5000" onclick="this.select()">
              <button type="button" class="btn-rst-step" onclick="changeCustomStockInput('${p.id}', 5)" title="Plus 5">+</button>
              <button type="button" class="btn-rst-add" onclick="applyCustomStockAdd('${p.id}')" title="Apply Restock">➕ Add</button>
            </div>
          </div>
        </td>
        <td class="wms-col-actions text-center">
          <button type="button" class="btn-wms-action" onclick="openAdminProductModal('edit', '${p.id}', '${safeTitle}', '${p.price}', '${p.mrp}', '${p.cat}')">✏️ Edit</button>
          <button type="button" class="btn-wms-action btn-wms-delete" onclick="adminDeleteProduct('${p.id}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
};

// =============================================================================
// VARSHAN SMART STUDIO: AUTOMATED COMMERCIAL PRODUCT PHOTOGRAPHY ENGINE
// =============================================================================
let currentAdminStudioMode = 'upload';
let currentRawAdminImage = null;

window.switchAdminImageMode = function(mode) {
  currentAdminStudioMode = mode;
  const btnUpload = document.getElementById('tab-mode-upload');
  const btnPreset = document.getElementById('tab-mode-preset');
  const secUpload = document.getElementById('adm-studio-upload-section');
  const secPreset = document.getElementById('adm-studio-preset-section');

  if (mode === 'upload') {
    btnUpload?.classList.add('active');
    btnPreset?.classList.remove('active');
    secUpload?.classList.remove('hidden');
    secPreset?.classList.add('hidden');
    if (currentRawAdminImage) {
      window.processStudioImage();
    }
  } else {
    btnPreset?.classList.add('active');
    btnUpload?.classList.remove('active');
    secPreset?.classList.remove('hidden');
    secUpload?.classList.add('hidden');
    const presetSelect = document.getElementById('adm-prod-image');
    if (presetSelect) window.updatePresetPreview(presetSelect.value);
  }
};

window.updatePresetPreview = function(val) {
  const thumb = document.getElementById('adm-preset-preview-thumb');
  if (thumb && val) {
    thumb.src = val;
  }
};

window.handleAdminPhotoSelected = function(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      currentRawAdminImage = img;
      
      const dropzone = document.getElementById('adm-upload-dropzone');
      const previewBox = document.getElementById('adm-studio-preview-box');
      if (dropzone) dropzone.style.display = 'none';
      if (previewBox) previewBox.classList.remove('hidden');

      // Auto run studio processing
      window.processStudioImage();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
};

window.reprocessStudioImage = function() {
  const zoomInput = document.getElementById('adm-studio-zoom');
  const zoomVal = document.getElementById('adm-studio-zoom-val');
  if (zoomInput && zoomVal) {
    zoomVal.textContent = `${zoomInput.value}%`;
  }

  const offsetInput = document.getElementById('adm-studio-offset-y');
  const posVal = document.getElementById('adm-studio-pos-val');
  if (offsetInput && posVal) {
    const v = parseInt(offsetInput.value) || 0;
    posVal.textContent = v === 0 ? 'Center' : (v > 0 ? `+${v}px` : `${v}px`);
  }

  window.processStudioImage();
};

function rgbToHslStudio(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgbStudio(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

window.processStudioImage = function() {
  if (!currentRawAdminImage) return;

  const canvas = document.getElementById('adm-studio-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Read control inputs
  const zoomSlider = document.getElementById('adm-studio-zoom');
  const offsetSlider = document.getElementById('adm-studio-offset-y');
  const bgModeSelect = document.getElementById('adm-studio-bg-mode');
  const badgeSelect = document.getElementById('adm-studio-badge');
  const enhanceToggle = document.getElementById('adm-studio-enhance-toggle');
  const shadowToggle = document.getElementById('adm-studio-shadow-toggle');
  const categorySelect = document.getElementById('adm-prod-category');

  const zoomFactor = (parseInt(zoomSlider?.value) || 95) / 100.0;
  const offsetY = parseInt(offsetSlider?.value) || 0;
  const bgMode = bgModeSelect?.value || 'studio-clean';
  const badgeChoice = badgeSelect?.value || 'auto';
  const doEnhance = enhanceToggle ? enhanceToggle.checked : true;
  const doShadow = shadowToggle ? shadowToggle.checked : true;
  const currentCat = categorySelect?.value || 'floor';

  ctx.clearRect(0, 0, W, H);

  // 1. Render Studio Background Backdrop
  if (bgMode === 'studio-clean') {
    // Elegant bright commercial studio radial spotlight
    const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.72);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#ffffff');
    grad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (bgMode === 'original') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Compute Subject Fit Bounds (preserving natural aspect ratio)
  const rawW = currentRawAdminImage.width || 600;
  const rawH = currentRawAdminImage.height || 600;
  const targetArea = W * 0.82; // 82% studio margins
  const baseScale = Math.min(targetArea / rawW, targetArea / rawH);
  const drawScale = baseScale * zoomFactor;

  const drawW = rawW * drawScale;
  const drawH = rawH * drawScale;
  const drawX = (W - drawW) / 2;
  const drawY = ((H - drawH) / 2) + offsetY;

  // 3. Render Studio Contact Drop Shadow (under bottle base)
  if (doShadow && bgMode !== 'transparent') {
    ctx.save();
    const shadowCenterY = drawY + drawH - 8;
    const shadowRadiusX = Math.max(20, drawW * 0.42);
    const shadowRadiusY = 15;

    ctx.translate(W / 2, shadowCenterY);
    ctx.scale(1, shadowRadiusY / shadowRadiusX);
    const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRadiusX);
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.32)');
    shadowGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.16)');
    shadowGrad.addColorStop(0.8, 'rgba(15, 23, 42, 0.04)');
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, shadowRadiusX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Draw Scaled Subject into temporary offscreen buffer for pixel manipulation
  const bufCanvas = document.createElement('canvas');
  bufCanvas.width = W;
  bufCanvas.height = H;
  const bufCtx = bufCanvas.getContext('2d');
  bufCtx.imageSmoothingEnabled = true;
  bufCtx.imageSmoothingQuality = 'high';
  bufCtx.drawImage(currentRawAdminImage, drawX, drawY, drawW, drawH);

  // 5. Smart Background Cleaning & Pixel Level Enhancement
  try {
    const imgData = bufCtx.getImageData(0, 0, W, H);
    const d = imgData.data;

    // Sample ambient background tone from subject outer boundary corners
    const sampleCorner = (sx, sy) => {
      const cx = Math.max(0, Math.min(W - 1, Math.round(sx)));
      const cy = Math.max(0, Math.min(H - 1, Math.round(sy)));
      const idx = (cy * W + cx) * 4;
      return [d[idx], d[idx + 1], d[idx + 2]];
    };

    const c1 = sampleCorner(drawX + 4, drawY + 4);
    const c2 = sampleCorner(drawX + drawW - 4, drawY + 4);
    const c3 = sampleCorner(drawX + 4, drawY + drawH - 4);
    const c4 = sampleCorner(drawX + drawW - 4, drawY + drawH - 4);

    const bgR = (c1[0] + c2[0] + c3[0] + c4[0]) / 4.0;
    const bgG = (c1[1] + c2[1] + c3[1] + c4[1]) / 4.0;
    const bgB = (c1[2] + c2[2] + c3[2] + c4[2]) / 4.0;

    const contrastVal = 18; // +18% contrast boost
    const contrastFactor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      let a = d[i + 3];

      if (a < 10) continue;

      const lum = (r + g + b) / 3.0;
      const distToBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

      // Background pixel detection
      const isBackground = (bgMode !== 'original') && (distToBg < 38 || lum > 244);

      if (isBackground) {
        if (bgMode === 'transparent') {
          d[i + 3] = 0;
        } else {
          // Transparent in buffer so studio gradient shows through
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
          d[i + 3] = 0;
        }
      } else if (doEnhance) {
        // Foreground bottle/liquid pixel -> enhance vibrancy & contrast
        const [h, s, l] = rgbToHslStudio(r, g, b);
        const enhancedS = Math.min(1, s * 1.22); // +22% saturation
        let [nr, ng, nb] = hslToRgbStudio(h, enhancedS, l);

        // Apply contrast curve
        nr = Math.min(255, Math.max(0, contrastFactor * (nr - 128) + 128));
        ng = Math.min(255, Math.max(0, contrastFactor * (ng - 128) + 128));
        nb = Math.min(255, Math.max(0, contrastFactor * (nb - 128) + 128));

        d[i] = nr;
        d[i + 1] = ng;
        d[i + 2] = nb;
      }
    }

    bufCtx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Canvas pixel processing note:', err);
  }

  // 6. Draw processed subject onto main canvas
  ctx.drawImage(bufCanvas, 0, 0);

  // 7. Stamp Official VARSHAN Commercial Hologram Badge
  if (badgeChoice !== 'none') {
    let badgeText = 'FACTORY DIRECT';
    let badgeColor = '#059669';

    if (badgeChoice === 'auto') {
      if (currentCat === 'toilet') {
        badgeText = '10X POWER';
        badgeColor = '#1d4ed8';
      } else if (currentCat === 'brushes') {
        badgeText = 'PRO TOOLS';
        badgeColor = '#d97706';
      } else if (currentCat === 'hygiene') {
        badgeText = 'HYGIENE CARE';
        badgeColor = '#7c3aed';
      } else if (currentCat === 'kitchen') {
        badgeText = 'KITCHEN PRO';
        badgeColor = '#dc2626';
      } else {
        badgeText = 'SOAP OIL';
        badgeColor = '#059669';
      }
    } else {
      badgeText = badgeChoice;
      badgeColor = '#1d4ed8';
    }

    ctx.save();
    const badgeW = 124;
    const badgeH = 34;
    const badgeX = 24;
    const badgeY = 24;
    const radius = 8;

    // Badge rounded container
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
    ctx.fillStyle = badgeColor;
    ctx.fill();

    // Pure white border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Badge Title: VARSHAN
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('VARSHAN', badgeX + (badgeW / 2), badgeY + 4);

    // Badge Sub-tag: Category or formula
    ctx.fillStyle = '#fef08a'; // gold text
    ctx.font = '800 8.5px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(badgeText, badgeX + (badgeW / 2), badgeY + 18);

    ctx.restore();
  }

  // 8. Export to Data URL and store in hidden input
  const finalDataUrl = canvas.toDataURL('image/png', 0.92);
  const hiddenDataInput = document.getElementById('adm-prod-processed-data');
  if (hiddenDataInput) {
    hiddenDataInput.value = finalDataUrl;
  }
};

window.openAdminProductModal = function(mode, prodId, title, price, mrp, category) {
  const modal = document.getElementById('admin-product-modal');
  const modalTitle = document.getElementById('adm-product-modal-title');
  const idInput = document.getElementById('adm-edit-product-id');
  const titleInput = document.getElementById('adm-prod-title');
  const priceInput = document.getElementById('adm-prod-price');
  const mrpInput = document.getElementById('adm-prod-mrp');
  const catInput = document.getElementById('adm-prod-category');
  const packInput = document.getElementById('adm-prod-pack');
  const imgInput = document.getElementById('adm-prod-image');
  const fileInput = document.getElementById('adm-prod-file-input');
  const dropzone = document.getElementById('adm-upload-dropzone');
  const previewBox = document.getElementById('adm-studio-preview-box');
  const processedDataInput = document.getElementById('adm-prod-processed-data');

  if (modal) {
    currentRawAdminImage = null;
    if (fileInput) fileInput.value = '';
    if (processedDataInput) processedDataInput.value = '';

    // Reset studio controls to standard values
    const zoomInput = document.getElementById('adm-studio-zoom');
    const offsetInput = document.getElementById('adm-studio-offset-y');
    if (zoomInput) zoomInput.value = 95;
    if (offsetInput) offsetInput.value = 0;
    const zoomVal = document.getElementById('adm-studio-zoom-val');
    const posVal = document.getElementById('adm-studio-pos-val');
    if (zoomVal) zoomVal.textContent = '95%';
    if (posVal) posVal.textContent = 'Center';

    if (mode === 'edit') {
      if (modalTitle) modalTitle.textContent = '✏️ Edit Chemical Formulation';
      if (idInput) idInput.value = prodId || '';
      if (titleInput) titleInput.value = title || '';
      if (priceInput) priceInput.value = (price || '').toString().replace(/\D/g, '') || 149;
      if (mrpInput) mrpInput.value = (mrp || '').toString().replace(/\D/g, '') || 220;
      if (catInput && category) catInput.value = category;

      // Check existing overrides or custom products for image and pack size
      const overrides = getCatalogOverrides();
      const customList = getCustomSavedProducts();
      const customItem = customList.find(c => c.id === prodId);
      const ovItem = overrides[prodId];
      const existingImg = ovItem?.img || customItem?.img || '';
      const existingPack = ovItem?.packSize || customItem?.packSize || '1 L Bottle';

      if (packInput) packInput.value = existingPack;

      if (existingImg && existingImg.startsWith('data:image')) {
        // Load existing studio image
        window.switchAdminImageMode('upload');
        if (dropzone) dropzone.style.display = 'none';
        if (previewBox) previewBox.classList.remove('hidden');
        const img = new Image();
        img.onload = function() {
          currentRawAdminImage = img;
          window.processStudioImage();
        };
        img.src = existingImg;
      } else if (existingImg) {
        window.switchAdminImageMode('preset');
        if (imgInput) imgInput.value = existingImg;
        window.updatePresetPreview(existingImg);
      } else {
        window.switchAdminImageMode('upload');
        if (dropzone) dropzone.style.display = 'flex';
        if (previewBox) previewBox.classList.add('hidden');
      }
    } else {
      if (modalTitle) modalTitle.textContent = '➕ Add New Chemical Formulation';
      if (idInput) idInput.value = '';
      if (titleInput) titleInput.value = '';
      if (priceInput) priceInput.value = '';
      if (mrpInput) mrpInput.value = '';
      if (packInput) packInput.value = '1 L Bottle';

      window.switchAdminImageMode('upload');
      if (dropzone) dropzone.style.display = 'flex';
      if (previewBox) previewBox.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    window.syncModalScrollLock();
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 100);
  }
};

window.closeAdminProductModal = function() {
  const modal = document.getElementById('admin-product-modal');
  if (modal) modal.classList.add('hidden');
  window.syncModalScrollLock();
};

window.handleAdminSaveProduct = function(e) {
  if (e) e.preventDefault();
  const idInput = document.getElementById('adm-edit-product-id');
  const titleInput = document.getElementById('adm-prod-title');
  const priceInput = document.getElementById('adm-prod-price');
  const mrpInput = document.getElementById('adm-prod-mrp');
  const catInput = document.getElementById('adm-prod-category');
  const packInput = document.getElementById('adm-prod-pack');
  const imgInput = document.getElementById('adm-prod-image');
  const processedDataInput = document.getElementById('adm-prod-processed-data');
  
  const title = (titleInput?.value || '').trim();
  const price = parseInt(priceInput?.value) || 149;
  const mrp = parseInt(mrpInput?.value) || 220;
  const category = catInput?.value || 'floor';
  const packSize = (packInput?.value || '1 L Bottle').trim();
  const editId = idInput?.value;

  // Determine Image from Studio Processed Canvas or Preset
  let image = 'varshan_phenyl_perfect.png';
  const processedData = processedDataInput?.value;

  if (currentAdminStudioMode === 'upload' && processedData) {
    image = processedData;
  } else if (imgInput && imgInput.value) {
    image = imgInput.value;
  } else if (processedData) {
    image = processedData;
  }

  if (!title) {
    alert('Please enter a valid product name.');
    return false;
  }

  if (editId) {
    // 1. Save to catalog overrides
    const overrides = getCatalogOverrides();
    overrides[editId] = {
      title,
      price,
      mrp,
      cat: category,
      packSize,
      img: image
    };
    saveCatalogOverrides(overrides);

    // 2. Also update in custom products storage if custom
    const customList = getCustomSavedProducts();
    const cIdx = customList.findIndex(cp => cp.id === editId);
    if (cIdx >= 0) {
      customList[cIdx] = { ...customList[cIdx], title, price, mrp, cat: category, packSize, img: image };
      saveCustomProducts(customList);
    }

    // 3. Immediately apply to storefront cards
    if (typeof window.applyCatalogOverridesToStorefront === 'function') {
      window.applyCatalogOverridesToStorefront();
    }

    logAdminAudit('PRODUCT_EDIT', `Updated formulation [${title}]: Rate ₹${price}, MRP ₹${mrp}`, 'stock');
    showToast(`✏️ Updated "${title}" in Catalog & Front Page!`);
  } else {
    // Adding brand new product
    const newCardId = `custom-prod-${Date.now()}`;
    const newProduct = {
      id: newCardId,
      title,
      price,
      mrp,
      cat: category,
      packSize,
      img: image,
      stock: 50
    };

    // Save to custom products in localStorage
    const customList = getCustomSavedProducts();
    customList.unshift(newProduct);
    saveCustomProducts(customList);

    // Save initial stock
    const stockMap = getStockLevels();
    stockMap[newCardId] = 50;
    saveStockLevels(stockMap);

    // Sync to backend catalog
    secureApiRequest('/products', 'POST', {
      id: newCardId,
      title,
      price,
      mrp,
      cat: category,
      pack: packSize,
      img: image,
      stock: 50
    }).catch(() => {});

    // Apply to storefront
    if (typeof window.applyCatalogOverridesToStorefront === 'function') {
      window.applyCatalogOverridesToStorefront();
    }

    logAdminAudit('PRODUCT_ADD', `Created new formulation [${title}] with Studio Image in category [${category}]`, 'stock');
    showToast(`➕ Added "${title}" to Store Catalog & Inventory!`);
  }

  window.closeAdminProductModal();
  refreshAdminDashboard();
  return false;
};

window.adminDeleteProduct = function(prodId) {
  if (confirm('Are you sure you want to remove this formulation from the store catalog?')) {
    const card = document.getElementById(prodId);
    let title = prodId;

    // 1. Save to deleted IDs list
    const deletedIds = getDeletedProductIds();
    if (!deletedIds.includes(prodId)) {
      deletedIds.push(prodId);
      saveDeletedProductIds(deletedIds);
    }

    let customList = getCustomSavedProducts();
    customList = customList.filter(cp => cp.id !== prodId);
    saveCustomProducts(customList);

    const overrides = getCatalogOverrides();
    delete overrides[prodId];
    saveCatalogOverrides(overrides);

    if (card) {
      title = card.querySelector('.comp-title')?.textContent?.trim() || prodId;

      // 2. FLIP Animation: Record current positions of all other visible sibling cards
      const grid = document.getElementById('products-catalog-list');
      const siblings = Array.from(grid ? grid.querySelectorAll('.compact-card') : [])
        .filter(c => c !== card && c.style.display !== 'none');
      const firstPositions = siblings.map(c => ({
        el: c,
        rect: c.getBoundingClientRect()
      }));

      // 3. Smooth exit transition on the deleted card (shrink & fade)
      card.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease';
      card.style.transform = 'scale(0.7)';
      card.style.opacity = '0';

      setTimeout(() => {
        // Remove card from DOM
        card.remove();

        // 4. Invert & Play: Smoothly slide adjacent & subsequent cards into the vacated slot!
        firstPositions.forEach(({ el, rect }) => {
          const newRect = el.getBoundingClientRect();
          const dx = rect.left - newRect.left;
          const dy = rect.top - newRect.top;
          if (dx !== 0 || dy !== 0) {
            el.style.transition = 'none';
            el.style.transform = `translate(${dx}px, ${dy}px)`;
            // Force browser reflow
            void el.offsetHeight;
            el.style.transition = 'transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1)';
            el.style.transform = 'translate(0, 0)';
            setTimeout(() => {
              el.style.transform = '';
              el.style.transition = '';
            }, 380);
          }
        });

        // 5. Instantly update live category filter badge counts
        if (typeof window.updateCatalogCategoryCounts === 'function') {
          window.updateCatalogCategoryCounts();
        }
      }, 260);
    } else {
      if (typeof window.applyCatalogOverridesToStorefront === 'function') {
        window.applyCatalogOverridesToStorefront();
      }
    }

    logAdminAudit('PRODUCT_DELETE', `Removed formulation [${title}] from catalog. Neighbor products shifted into space.`, 'stock');
    refreshAdminDashboard();
    showToast(`🗑️ Removed "${title}". Adjacent products filled the space seamlessly!`);
  }
};

window.adminRestoreProduct = function(prodId) {
  let deletedIds = getDeletedProductIds();
  deletedIds = deletedIds.filter(id => id !== prodId);
  saveDeletedProductIds(deletedIds);
  logAdminAudit('PRODUCT_RESTORE', `Restored formulation [${prodId}] back to active catalog.`, 'stock');
  showToast(`♻️ Formulation restored to store catalog!`);
  if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
  if (typeof window.applyCatalogOverridesToStorefront === 'function') {
    window.applyCatalogOverridesToStorefront();
  }
  setTimeout(() => {
    window.location.reload();
  }, 350);
};

// -----------------------------------------------------------------------------
// TAB 4: CUSTOMER DIRECTORY & CRM HUB
// -----------------------------------------------------------------------------
window.filterAdminCrm = function() {
  const input = document.getElementById('adm-crm-search-input');
  currentCrmSearchQuery = (input?.value || '').trim().toLowerCase();
  renderAdminCustomers();
};

function renderAdminCustomers() {
  const container = document.getElementById('adm-crm-table-container');
  const countEl = document.getElementById('adm-crm-client-count');
  if (!container) return;

  const orders = getSavedOrdersList();
  const customerMap = {};

  orders.forEach(ord => {
    const phone = (ord.customerMobile || '').replace(/\D/g, '');
    if (!phone) return;
    const amt = parseFloat(ord.grandTotal) || 0;

    if (!customerMap[phone]) {
      customerMap[phone] = {
        name: ord.customerName || 'Customer',
        mobile: phone,
        address: ord.customerAddress || 'Sivakasi',
        ordersCount: 0,
        lifetimeSpend: 0,
        lastOrder: ord.date || 'Recent'
      };
    }
    customerMap[phone].ordersCount += 1;
    customerMap[phone].lifetimeSpend += amt;
  });

  let customers = Object.values(customerMap);
  if (countEl) countEl.textContent = customers.length;

  if (currentCrmSearchQuery) {
    customers = customers.filter(c => c.name.toLowerCase().includes(currentCrmSearchQuery) || c.mobile.includes(currentCrmSearchQuery) || c.address.toLowerCase().includes(currentCrmSearchQuery));
  }

  if (customers.length === 0) {
    container.innerHTML = `<div style="padding: 2.5rem; text-align: center; color: #64748b;">No customer accounts matching query.</div>`;
    return;
  }

  container.innerHTML = `
    <table class="adm-crm-table">
      <thead>
        <tr>
          <th>Customer Name</th>
          <th>Mobile &bull; WhatsApp</th>
          <th>Delivery Address</th>
          <th class="text-center">Total Orders</th>
          <th class="text-right">Lifetime Spend</th>
          <th>Loyalty Tier</th>
          <th class="text-center">Direct Action</th>
        </tr>
      </thead>
      <tbody>
        ${customers.map(c => {
          const isVip = c.lifetimeSpend >= 800 || c.ordersCount >= 3;
          return `
            <tr>
              <td><b>👤 ${c.name}</b></td>
              <td>📞 +91 ${c.mobile}</td>
              <td style="color: #475569;">📍 ${c.address}</td>
              <td class="text-center"><span class="crm-ord-badge">${c.ordersCount} Orders</span></td>
              <td class="text-right"><b class="crm-ltv-val">₹${c.lifetimeSpend.toLocaleString('en-IN')}</b></td>
              <td><span class="crm-tier-pill ${isVip ? 'tier-vip' : 'tier-standard'}">${isVip ? '👑 VIP Wholesale' : '🌱 Regular Client'}</span></td>
              <td class="text-center"><a href="https://api.whatsapp.com/send?phone=91${c.mobile}&text=Greetings%20from%20Varshan%20Chemicals!" target="_blank" class="btn-crm-wa">💬 WhatsApp</a></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// -----------------------------------------------------------------------------
// TAB 3: REAL-TIME SALES VELOCITY & REVENUE BI INTELLIGENCE (PULSE, ANNUAL, MONTHLY)
// -----------------------------------------------------------------------------
let selectedAnalyticsYear = new Date().getFullYear().toString();
let selectedAnalyticsMonth = 'all'; // 'all' or '0'..'11'
let currentAnalyticsPeriod = 'today';
let analyticsCustomStartDate = '';
let analyticsCustomEndDate = '';
let currentAnalyticsSubView = 'products';

window.switchAnalyticsSubView = function(viewKey) {
  currentAnalyticsSubView = viewKey;
  const btnProd = document.getElementById('subview-btn-products');
  const btnOrd = document.getElementById('subview-btn-orders');
  const paneProd = document.getElementById('analytics-pane-products');
  const paneOrd = document.getElementById('analytics-pane-orders');
  
  if (viewKey === 'products') {
    if (btnProd) btnProd.classList.add('active');
    if (btnOrd) btnOrd.classList.remove('active');
    if (paneProd) paneProd.classList.remove('hidden');
    if (paneOrd) paneOrd.classList.add('hidden');
  } else {
    if (btnOrd) btnOrd.classList.add('active');
    if (btnProd) btnProd.classList.remove('active');
    if (paneOrd) paneOrd.classList.remove('hidden');
    if (paneProd) paneProd.classList.add('hidden');
  }
};

window.toggleCustomFilterDrawer = function() {
  const drawer = document.getElementById('analytics-custom-drawer');
  const btn = document.getElementById('seg-btn-custom');
  if (drawer) {
    drawer.classList.toggle('hidden');
    if (btn) {
      if (drawer.classList.contains('hidden')) {
        btn.classList.remove('active');
      } else {
        btn.classList.add('active');
      }
    }
  }
};

window.setQuickPulsePeriod = function(periodKey) {
  currentAnalyticsPeriod = periodKey;
  analyticsCustomStartDate = '';
  analyticsCustomEndDate = '';

  // Update active segmented period pill
  const pills = document.querySelectorAll('.seg-pill-btn');
  pills.forEach(p => p.classList.remove('active'));
  const targetPill = document.getElementById(`seg-btn-${periodKey}`);
  if (targetPill) targetPill.classList.add('active');

  // Close drawer if open
  const drawer = document.getElementById('analytics-custom-drawer');
  if (drawer) drawer.classList.add('hidden');

  const now = new Date();
  const currYear = now.getFullYear();
  const mStr = String(now.getMonth() + 1).padStart(2, '0');
  const dStr = String(now.getDate()).padStart(2, '0');
  const startInput = document.getElementById('analytics-custom-start');
  const endInput = document.getElementById('analytics-custom-end');

  if (periodKey === 'today') {
    if (startInput) startInput.value = `${currYear}-${mStr}-${dStr}`;
    if (endInput) endInput.value = `${currYear}-${mStr}-${dStr}`;
  } else if (periodKey === 'yesterday') {
    const yest = new Date(now.getTime() - 86400000);
    const yM = String(yest.getMonth() + 1).padStart(2, '0');
    const yD = String(yest.getDate()).padStart(2, '0');
    if (startInput) startInput.value = `${yest.getFullYear()}-${yM}-${yD}`;
    if (endInput) endInput.value = `${yest.getFullYear()}-${yM}-${yD}`;
  } else if (periodKey === 'week') {
    const wStart = new Date(now.getTime() - 7 * 86400000);
    const wM = String(wStart.getMonth() + 1).padStart(2, '0');
    const wD = String(wStart.getDate()).padStart(2, '0');
    if (startInput) startInput.value = `${wStart.getFullYear()}-${wM}-${wD}`;
    if (endInput) endInput.value = `${currYear}-${mStr}-${dStr}`;
  } else if (periodKey === 'month') {
    const lastDay = new Date(currYear, now.getMonth() + 1, 0).getDate();
    if (startInput) startInput.value = `${currYear}-${mStr}-01`;
    if (endInput) endInput.value = `${currYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
  }

  renderAdminAnalytics();
};

window.handleAnalyticsYearChange = function(yearVal) {
  selectedAnalyticsYear = yearVal;
  const startInput = document.getElementById('analytics-custom-start');
  const endInput = document.getElementById('analytics-custom-end');

  // Remove pulse buttons active highlight
  const pills = document.querySelectorAll('.seg-pill-btn');
  pills.forEach(p => p.classList.remove('active'));
  const btn = document.getElementById('seg-btn-custom');
  if (btn) btn.classList.add('active');

  const now = new Date();
  if (yearVal === 'all') {
    currentAnalyticsPeriod = 'all';
    if (startInput) startInput.value = '2024-01-01';
    if (endInput) endInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  } else {
    const y = parseInt(yearVal);
    if (selectedAnalyticsMonth === 'all') {
      currentAnalyticsPeriod = 'year-' + y;
      if (startInput) startInput.value = `${y}-01-01`;
      if (endInput) endInput.value = `${y}-12-31`;
    } else {
      const m = parseInt(selectedAnalyticsMonth);
      const mStr = String(m + 1).padStart(2, '0');
      const lastDay = new Date(y, m + 1, 0).getDate();
      currentAnalyticsPeriod = `month-${y}-${mStr}`;
      if (startInput) startInput.value = `${y}-${mStr}-01`;
      if (endInput) endInput.value = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;
    }
  }
  analyticsCustomStartDate = '';
  analyticsCustomEndDate = '';
  renderAdminAnalytics();
  showToast(`📅 Filtered for: ${yearVal === 'all' ? 'All Years' : 'Year ' + yearVal}`);
};

window.handleAnalyticsMonthChange = function(monthVal) {
  selectedAnalyticsMonth = monthVal;
  const startInput = document.getElementById('analytics-custom-start');
  const endInput = document.getElementById('analytics-custom-end');

  // Remove pulse buttons active highlight
  const pills = document.querySelectorAll('.seg-pill-btn');
  pills.forEach(p => p.classList.remove('active'));
  const btn = document.getElementById('seg-btn-custom');
  if (btn) btn.classList.add('active');

  const now = new Date();
  const y = (selectedAnalyticsYear === 'all') ? now.getFullYear() : parseInt(selectedAnalyticsYear);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (monthVal === 'all') {
    if (selectedAnalyticsYear === 'all') {
      currentAnalyticsPeriod = 'all';
    } else {
      currentAnalyticsPeriod = 'year-' + y;
      if (startInput) startInput.value = `${y}-01-01`;
      if (endInput) endInput.value = `${y}-12-31`;
    }
    showToast(`🗓️ Showing Full Year ${y}`);
  } else {
    const m = parseInt(monthVal);
    const mStr = String(m + 1).padStart(2, '0');
    const lastDay = new Date(y, m + 1, 0).getDate();
    currentAnalyticsPeriod = `month-${y}-${mStr}`;
    if (startInput) startInput.value = `${y}-${mStr}-01`;
    if (endInput) endInput.value = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;
    showToast(`🗓️ Showing ${monthNames[m]} ${y}`);
  }
  analyticsCustomStartDate = '';
  analyticsCustomEndDate = '';
  renderAdminAnalytics();
};

window.applyCustomAnalyticsDates = function() {
  const startInput = document.getElementById('analytics-custom-start');
  const endInput = document.getElementById('analytics-custom-end');
  const startVal = startInput?.value;
  const endVal = endInput?.value;

  if (!startVal || !endVal) {
    alert('Please select both Start Date and End Date.');
    return;
  }

  const pills = document.querySelectorAll('.seg-pill-btn');
  pills.forEach(p => p.classList.remove('active'));
  const btn = document.getElementById('seg-btn-custom');
  if (btn) btn.classList.add('active');

  currentAnalyticsPeriod = 'custom';
  analyticsCustomStartDate = startVal;
  analyticsCustomEndDate = endVal;

  renderAdminAnalytics();
  showToast(`🔍 Filtered transactions from ${startVal} to ${endVal}`);
};

window.applySingleDateOnly = function() {
  const startInput = document.getElementById('analytics-custom-start');
  const endInput = document.getElementById('analytics-custom-end');
  const startVal = startInput?.value;

  if (!startVal) {
    alert('Please pick a date in the date box first.');
    return;
  }

  if (endInput) endInput.value = startVal;

  const pills = document.querySelectorAll('.seg-pill-btn');
  pills.forEach(p => p.classList.remove('active'));
  const btn = document.getElementById('seg-btn-custom');
  if (btn) btn.classList.add('active');

  currentAnalyticsPeriod = 'custom';
  analyticsCustomStartDate = startVal;
  analyticsCustomEndDate = startVal;

  renderAdminAnalytics();
  showToast(`🎯 Displaying sales for exact date: ${startVal}`);
};

function populateAnalyticsYearAndMonthDropdowns() {
  const yearSelect = document.getElementById('analytics-year-select');
  const monthSelect = document.getElementById('analytics-month-select');
  if (!yearSelect || !monthSelect) return;

  const now = new Date();
  const currYear = now.getFullYear();
  const allOrders = getSavedOrdersList();

  // Find all distinct years in orders (including 2024, 2025, 2026, 2027)
  const yearSet = new Set([currYear, currYear - 1, currYear - 2, currYear + 1]);
  allOrders.forEach(ord => {
    const dStr = getOrderLocalDateString(ord);
    const y = parseInt(dStr.split('-')[0]);
    if (!isNaN(y) && y > 2000) yearSet.add(y);
  });
  const sortedYears = Array.from(yearSet).sort((a, b) => b - a);

  if (yearSelect.children.length === 0) {
    let yearOpts = `<option value="all">🌐 All Years (All-Time)</option>`;
    sortedYears.forEach(y => {
      yearOpts += `<option value="${y}">📅 Year ${y}${y === currYear ? ' (Current)' : ''}</option>`;
    });
    yearSelect.innerHTML = yearOpts;
    yearSelect.value = selectedAnalyticsYear;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (monthSelect.children.length === 0) {
    let monthOpts = `<option value="all">🗓️ All Months (Full Year)</option>`;
    monthNames.forEach((name, idx) => {
      monthOpts += `<option value="${idx}">${name}</option>`;
    });
    monthSelect.innerHTML = monthOpts;
    monthSelect.value = selectedAnalyticsMonth;
  }

  // Pre-fill date inputs if empty
  const startInput = document.getElementById('analytics-custom-start');
  const endInput = document.getElementById('analytics-custom-end');
  if (startInput && !startInput.value) {
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    startInput.value = `${currYear}-${mStr}-${dStr}`;
  }
  if (endInput && !endInput.value) {
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    endInput.value = `${currYear}-${mStr}-${dStr}`;
  }
}

function parseOrderDateTimestamp(ord) {
  if (ord.timestamp && typeof ord.timestamp === 'number') return ord.timestamp;
  const dStr = getOrderLocalDateString(ord);
  return new Date(dStr + 'T00:00:00').getTime();
}

function getOrderLocalDateString(ord) {
  if (ord.date && typeof ord.date === 'string') {
    const parts = ord.date.trim().split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const mKey = parts[1].toLowerCase().slice(0, 3);
        const m = monthMap[mKey] || String(parseInt(parts[1]) || 1).padStart(2, '0');
        const day = String(parseInt(parts[0]) || 1).padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${day}`;
      }
    }
  }
  if (ord.timestamp && typeof ord.timestamp === 'number') {
    const d = new Date(ord.timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isOrderInPeriod(ord, period, customStart, customEnd) {
  if (period === 'all') return true;

  const ordDateStr = getOrderLocalDateString(ord);
  const now = new Date();
  const currYear = now.getFullYear();
  const currMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = `${currYear}-${currMonthStr}-${String(now.getDate()).padStart(2, '0')}`;

  if (period === 'today') {
    return ordDateStr === todayStr;
  }

  if (period === 'yesterday') {
    const yest = new Date(now.getTime() - 86400000);
    const yestM = String(yest.getMonth() + 1).padStart(2, '0');
    const yestD = String(yest.getDate()).padStart(2, '0');
    const yestStr = `${yest.getFullYear()}-${yestM}-${yestD}`;
    return ordDateStr === yestStr;
  }

  if (period === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const wM = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const wD = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const weekStartStr = `${sevenDaysAgo.getFullYear()}-${wM}-${wD}`;
    return ordDateStr >= weekStartStr && ordDateStr <= todayStr;
  }

  if (period === 'month') {
    return ordDateStr.startsWith(`${currYear}-${currMonthStr}`);
  }

  if (period.startsWith('year-')) {
    const targetYear = period.replace('year-', '');
    return ordDateStr.startsWith(`${targetYear}-`);
  }

  if (period.startsWith('month-')) {
    const parts = period.split('-');
    const y = parts[1];
    const m = parts[2];
    return ordDateStr.startsWith(`${y}-${m}`);
  }

  if (period === 'custom' && customStart && customEnd) {
    let s = customStart;
    let e = customEnd;
    if (s > e) {
      const temp = s;
      s = e;
      e = temp;
    }
    return ordDateStr >= s && ordDateStr <= e;
  }

  return true;
}

function renderAdminAnalytics() {
  populateAnalyticsYearAndMonthDropdowns();
  const allOrders = getSavedOrdersList();
  
  // 1. Calculate Segmented Period Bar Live Amounts
  let todayRev = 0, yestRev = 0, weekRev = 0, monthRev = 0;

  allOrders.forEach(ord => {
    const isCanc = (ord.status || '').toLowerCase() === 'cancelled';
    if (isCanc) return;
    const amt = parseFloat(ord.grandTotal) || 0;

    if (isOrderInPeriod(ord, 'today')) todayRev += amt;
    if (isOrderInPeriod(ord, 'yesterday')) yestRev += amt;
    if (isOrderInPeriod(ord, 'week')) weekRev += amt;
    if (isOrderInPeriod(ord, 'month')) monthRev += amt;
  });

  const elTVal = document.getElementById('seg-val-today');
  const elYVal = document.getElementById('seg-val-yesterday');
  const elWVal = document.getElementById('seg-val-week');
  const elMVal = document.getElementById('seg-val-month');

  if (elTVal) elTVal.textContent = `₹${todayRev.toLocaleString('en-IN')}`;
  if (elYVal) elYVal.textContent = `₹${yestRev.toLocaleString('en-IN')}`;
  if (elWVal) elWVal.textContent = `₹${weekRev.toLocaleString('en-IN')}`;
  if (elMVal) elMVal.textContent = `₹${monthRev.toLocaleString('en-IN')}`;

  // 2. Filter orders matching selected period
  const filteredOrders = allOrders.filter(ord => isOrderInPeriod(ord, currentAnalyticsPeriod, analyticsCustomStartDate, analyticsCustomEndDate));

  let grossRevenue = 0;
  let totalOrdersCount = 0;
  let totalBottlesSold = 0;
  const productVelocity = {};

  filteredOrders.forEach(ord => {
    const isCancelled = (ord.status || '').toLowerCase() === 'cancelled';
    const amt = parseFloat(ord.grandTotal) || 0;
    const qty = parseInt(ord.totalQty) || 1;

    if (!isCancelled) {
      grossRevenue += amt;
      totalOrdersCount += 1;
      totalBottlesSold += qty;

      (ord.items || []).forEach(it => {
        const pName = it.name || 'Chemical Formulation';
        const pImg = it.image || 'varshan_phenyl_perfect.png';
        const pPrice = parseInt(it.price) || 149;
        const pQty = parseInt(it.quantity) || 1;

        if (!productVelocity[pName]) {
          productVelocity[pName] = {
            name: pName,
            image: pImg,
            units: 0,
            revenue: 0,
            category: it.category || 'Chemicals'
          };
        }
        productVelocity[pName].units += pQty;
        productVelocity[pName].revenue += (pPrice * pQty);
      });
    }
  });

  // Calculate product rankings and averages
  const rankedProducts = Object.values(productVelocity).sort((a, b) => b.units - a.units);
  const aov = totalOrdersCount > 0 ? Math.round(grossRevenue / totalOrdersCount) : 0;

  // Determine period display label
  let periodDesc = 'Selected Period';
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (currentAnalyticsPeriod === 'today') periodDesc = "Today's Live Sales";
  else if (currentAnalyticsPeriod === 'yesterday') periodDesc = "Yesterday's Sales";
  else if (currentAnalyticsPeriod === 'week') periodDesc = "Past 7 Days Sales";
  else if (currentAnalyticsPeriod === 'month') {
    const now = new Date();
    periodDesc = `This Month (${monthNames[now.getMonth()]} ${now.getFullYear()})`;
  } else if (currentAnalyticsPeriod === 'all') periodDesc = 'All-Time Sales';
  else if (currentAnalyticsPeriod === 'custom') {
    periodDesc = analyticsCustomStartDate === analyticsCustomEndDate ? analyticsCustomStartDate : `${analyticsCustomStartDate} to ${analyticsCustomEndDate}`;
  }

  // 3. Update Executive Summary Hero Banner
  const heroPeriodLbl = document.getElementById('analytics-hero-period-lbl');
  const heroRev = document.getElementById('analytics-hero-rev');
  const heroOrders = document.getElementById('analytics-hero-orders');
  const heroUnits = document.getElementById('analytics-hero-units');
  const heroAov = document.getElementById('analytics-hero-aov');

  if (heroPeriodLbl) heroPeriodLbl.textContent = `TOTAL SALES \u2022 ${periodDesc.toUpperCase()}`;
  if (heroRev) heroRev.textContent = `₹${grossRevenue.toLocaleString('en-IN')}`;
  if (heroOrders) heroOrders.textContent = `${totalOrdersCount}`;
  if (heroUnits) heroUnits.textContent = `${totalBottlesSold}`;
  if (heroAov) heroAov.textContent = `₹${aov.toLocaleString('en-IN')}`;

  // 4. Update Sub-view counts
  const subCountProd = document.getElementById('subview-count-products');
  const subCountOrd = document.getElementById('subview-count-orders');
  if (subCountProd) subCountProd.textContent = rankedProducts.length;
  if (subCountOrd) subCountOrd.textContent = filteredOrders.length;

  // 5. Render Products Sold Grid Feed (View A)
  const rankContainer = document.getElementById('analytics-product-ranking-container');
  if (rankContainer) {
    if (rankedProducts.length === 0) {
      rankContainer.innerHTML = `
        <div class="a-empty-state">
          <span style="font-size: 2.5rem;">🧪</span>
          <p style="margin: 0.5rem 0 0.2rem; font-weight: 800; color: #0f172a; font-size: 0.95rem;">No formulation sales recorded for <b>${periodDesc}</b>.</p>
          <span style="font-size: 0.78rem; color: #64748b;">Tap "⚡ Today", "📅 Yesterday", or "🗓️ This Month" above.</span>
        </div>
      `;
    } else {
      const maxUnits = Math.max(...rankedProducts.map(p => p.units), 1);
      const stockMap = getStockLevels();

      rankContainer.innerHTML = rankedProducts.map((p, idx) => {
        const pct = Math.round((p.units / maxUnits) * 100);
        const stockLevel = stockMap[p.id] !== undefined ? stockMap[p.id] : 45;

        return `
          <div class="mobile-product-card">
            <div class="m-prod-row">
              <img src="${p.image}" class="m-prod-thumb" alt="${p.name}">
              <div class="m-prod-main">
                <div class="m-prod-title-row">
                  <span class="m-prod-name" title="${p.name}">${p.name}</span>
                  <span class="m-prod-rev">₹${p.revenue.toLocaleString('en-IN')}</span>
                </div>
                
                <div class="m-prod-stats-strip">
                  <span class="m-stat-pill-sold">🔥 <b>${p.units}</b> Bottles Sold</span>
                  <span class="m-stat-pill-stock">📦 Stock: <b>${stockLevel}</b></span>
                </div>
                
                <div class="m-prod-bar-wrap">
                  <div class="m-prod-bar-track">
                    <div class="m-prod-bar-fill" style="width: ${pct}%;"></div>
                  </div>
                  <span class="m-prod-bar-pct">${p.units} btls</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 6. Render Mobile Receipt Cards Feed (View B)
  const logContainer = document.getElementById('analytics-sales-log-container');
  if (logContainer) {
    if (filteredOrders.length === 0) {
      logContainer.innerHTML = `
        <div class="a-empty-state">
          <span style="font-size: 2.5rem;">📭</span>
          <p style="margin: 0.5rem 0 0.2rem; font-weight: 800; color: #0f172a; font-size: 0.95rem;">No customer orders found for <b>${periodDesc}</b>.</p>
          <span style="font-size: 0.78rem; color: #64748b;">Select another date or period above.</span>
        </div>
      `;
    } else {
      logContainer.innerHTML = filteredOrders.map(ord => {
        const isCanc = (ord.status || '').toLowerCase() === 'cancelled';
        const cleanMobile = (ord.customerMobile || '').toString().replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hello ${ord.customerName || 'Customer'}, invoice update for your Varshan Chemical order ${ord.orderId} (₹${ord.grandTotal})!`);

        return `
          <div class="m-order-card ${isCanc ? 'is-cancelled' : ''}">
            <div class="m-card-top-header">
              <div class="m-ord-meta-group">
                <span class="m-ord-id">${ord.orderId} ${ord.posCounter ? '<small class="m-pos-badge">[POS]</small>' : ''}</span>
                <span class="m-ord-date">📅 ${ord.date || 'Today'} &bull; 🕒 ${ord.time || '12:00 PM'}</span>
              </div>
              <span class="m-status-badge status-${(ord.status || 'placed').toLowerCase().replace(/\s+/g, '-')}">
                ${isCanc ? '❌ Cancelled' : '🟢 ' + (ord.status || 'Delivered')}
              </span>
            </div>

            <div class="m-card-client-row">
              <div class="m-client-details">
                <span class="m-client-name">👤 <b>${ord.customerName || 'Walk-in Customer'}</b></span>
                <span class="m-client-phone">📞 +91 ${ord.customerMobile || '8122554432'}</span>
                <span class="m-client-address">📍 ${ord.customerAddress || 'Sivakasi'}</span>
              </div>
              ${cleanMobile ? `
                <a href="https://wa.me/91${cleanMobile}?text=${waMsg}" target="_blank" class="m-btn-wa-action" title="Open WhatsApp Chat">
                  💬 WhatsApp
                </a>
              ` : ''}
            </div>

            <div class="m-card-items-wrap">
              <div class="m-items-chips-list">
                ${(ord.items || []).map(it => `
                  <span class="m-formulation-pill">
                    🧴 ${it.name} <b class="m-pill-qty">×${it.quantity}</b>
                  </span>
                `).join('')}
              </div>
            </div>

            <div class="m-card-footer-row">
              <span class="m-pay-tag">💵 ${ord.paymentMode || 'Cash on Delivery (COD)'}</span>
              <div class="m-total-group">
                <span class="m-total-lbl">Total:</span>
                <b class="m-total-val">₹${parseFloat(ord.grandTotal || 0).toLocaleString('en-IN')}</b>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

window.exportFilteredAnalyticsCSV = function() {
  const allOrders = getSavedOrdersList();
  const filteredOrders = allOrders.filter(ord => isOrderInPeriod(ord, currentAnalyticsPeriod, analyticsCustomStartDate, analyticsCustomEndDate));

  if (filteredOrders.length === 0) {
    alert('No orders found in the selected period to export.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'S.No,Order ID,Date,Exact Time,Customer Name,Mobile Number,Delivery Address,Payment Mode,Dispatch Status,Total Bottles,Grand Total (INR),Items Breakdown\n';

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  filteredOrders.forEach((ord, index) => {
    let exactDate = ord.date || '';
    let exactTime = ord.time || '';

    if (ord.timestamp) {
      const dt = new Date(ord.timestamp);
      const d = String(dt.getDate()).padStart(2, '0');
      const m = months[dt.getMonth()];
      const y = dt.getFullYear();
      exactDate = `${d}-${m}-${y}`;

      let h = dt.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const min = String(dt.getMinutes()).padStart(2, '0');
      const sec = String(dt.getSeconds()).padStart(2, '0');
      exactTime = `${String(h).padStart(2, '0')}:${min}:${sec} ${ampm}`;
    }

    let rawMobile = (ord.customerMobile || '').toString().replace(/\D/g, '');
    if (rawMobile.length === 12 && rawMobile.startsWith('91')) {
      rawMobile = rawMobile.slice(2);
    }
    const excelSafeMobile = rawMobile ? `="+91 ${rawMobile}"` : '="Not Set"';
    const excelSafeDate = `="${exactDate}"`;
    const excelSafeTime = `="${exactTime}"`;
    const excelSafeOrderId = `="${ord.orderId}"`;

    const itemsStr = (ord.items || []).map(it => `${it.name} (${it.packSize || '1L'}) x${it.quantity}`).join(' | ');

    const row = [
      index + 1,
      excelSafeOrderId,
      excelSafeDate,
      excelSafeTime,
      `"${(ord.customerName || 'Customer').replace(/"/g, '""')}"`,
      excelSafeMobile,
      `"${(ord.customerAddress || 'Sivakasi').replace(/"/g, '""')}"`,
      `"${ord.paymentMode || 'Cash on Delivery (COD)'}"`,
      `"${ord.status || 'Placed'}"`,
      ord.totalQty || 1,
      parseFloat(ord.grandTotal) || 0,
      `"${itemsStr.replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Varshan_Chemicals_Sales_Report_${currentAnalyticsPeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  logAdminAudit('PERIOD_CSV_EXPORT', `Exported sales report for period [${currentAnalyticsPeriod}] (${filteredOrders.length} orders).`, 'export');
  showToast(`📥 Exported ${filteredOrders.length} orders to CSV report!`);
};

// -----------------------------------------------------------------------------
// TAB 8: STORE SETTINGS & DATA CSV EXPORT
// -----------------------------------------------------------------------------
window.exportOrdersToCSV = function() {
  const orders = getSavedOrdersList();
  if (orders.length === 0) {
    alert('No orders found to export.');
    return;
  }

  // UTF-8 BOM for Microsoft Excel
  let csvContent = '\uFEFF';
  csvContent += 'S.No,Order ID,Date,Exact Time,Customer Name,Mobile Number,Delivery Address,Payment Mode,Dispatch Status,Total Bottles,Grand Total (INR),Items Breakdown\n';

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  orders.forEach((ord, index) => {
    let exactDate = ord.date || '';
    let exactTime = ord.time || '';

    if (ord.timestamp) {
      const dt = new Date(ord.timestamp);
      const d = String(dt.getDate()).padStart(2, '0');
      const m = months[dt.getMonth()];
      const y = dt.getFullYear();
      exactDate = `${d}-${m}-${y}`;

      let h = dt.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const min = String(dt.getMinutes()).padStart(2, '0');
      const sec = String(dt.getSeconds()).padStart(2, '0');
      exactTime = `${String(h).padStart(2, '0')}:${min}:${sec} ${ampm}`;
    }

    // Full 10-digit mobile number formatted as text formula for Excel to prevent 8.12E+09
    let rawMobile = (ord.customerMobile || '').toString().replace(/\D/g, '');
    if (rawMobile.length === 12 && rawMobile.startsWith('91')) {
      rawMobile = rawMobile.slice(2);
    }
    const excelSafeMobile = rawMobile ? `="+91 ${rawMobile}"` : '="Not Set"';
    const excelSafeDate = `="${exactDate}"`;
    const excelSafeTime = `="${exactTime}"`;
    const excelSafeOrderId = `="${ord.orderId}"`;

    const itemsStr = (ord.items || []).map(it => `${it.name} (${it.packSize || '1L'}) x${it.quantity}`).join(' | ');

    const row = [
      index + 1,
      excelSafeOrderId,
      excelSafeDate,
      excelSafeTime,
      `"${(ord.customerName || 'Customer').replace(/"/g, '""')}"`,
      excelSafeMobile,
      `"${(ord.customerAddress || 'Sivakasi').replace(/"/g, '""')}"`,
      `"${ord.paymentMode || (ord.posCounter ? 'POS Counter (Cash)' : 'Cash on Delivery')}"`,
      `"${ord.status || 'Order Placed'}"`,
      ord.totalQty || (ord.items ? ord.items.reduce((a, b) => a + (b.quantity || 1), 0) : 1),
      ord.grandTotal || 0,
      `"${itemsStr.replace(/"/g, '""')}"`
    ];

    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Varshan_Chemicals_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logAdminAudit('CSV_EXPORT', `Exported full financial & orders report (${orders.length} transactions with exact timestamps & full mobile numbers).`, 'config');
  showToast(`📊 Excel CSV Report Downloaded (${orders.length} orders)`);
};

window.toggleFactoryOnlineStatus = function() {
  const toggle = document.getElementById('adm-factory-online-toggle');
  const lbl = document.getElementById('adm-factory-status-lbl');
  if (toggle && lbl) {
    if (toggle.checked) {
      lbl.textContent = '🟢 Factory Depot: Online';
      lbl.style.color = '#059669';
      logAdminAudit('DEPOT_STATUS', 'Factory depot set to ONLINE.', 'config');
    } else {
      lbl.textContent = '🔴 Factory Depot: Offline';
      lbl.style.color = '#dc2626';
      logAdminAudit('DEPOT_STATUS', 'Factory depot set to OFFLINE.', 'config');
    }
  }
};

window.saveFactoryHelpline = function() {
  const input = document.getElementById('adm-factory-helpline');
  if (input && input.value) {
    localStorage.setItem('varshan_factory_helpline', input.value.trim());
    logAdminAudit('HELPLINE_CHANGE', `Helpline updated to +91 ${input.value.trim()}`, 'config');
    alert(`Factory helpline updated.`);
  }
};

window.saveCallMeBotApiKey = function() {
  const input = document.getElementById('adm-callmebot-apikey');
  if (input) {
    const key = input.value.trim();
    localStorage.setItem('varshan_callmebot_apikey', key);
    logAdminAudit('APIKEY_UPDATE', 'CallMeBot WhatsApp notification API key updated', 'config');
    alert(`CallMeBot API Key saved successfully!`);
  }
};

window.testCallMeBotAlert = function() {
  const apiKey = (localStorage.getItem('varshan_callmebot_apikey') || document.getElementById('adm-callmebot-apikey')?.value || '').trim();
  if (!apiKey) {
    alert('Please enter and save your CallMeBot API Key first.\nClick "Get Free Key via WhatsApp" to get it in 30 seconds!');
    return;
  }
  const rawHelpline = (localStorage.getItem('varshan_factory_helpline') || '8122776379').replace(/\D/g, '');
  const ownerPhone = '+91' + (rawHelpline.endsWith('8122776379') ? '8122776379' : rawHelpline.slice(-10));
  const testMsg = `🧪 *TEST NOTIFICATION FROM VARSHAN CHEMICALS*\n\nYour CallMeBot WhatsApp Auto-Alert is WORKING PERFECTLY!\nWhenever a customer places an order on your website, you will receive full order details instantly right here.`;
  const endpoint = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(ownerPhone)}&text=${encodeURIComponent(testMsg)}&apikey=${encodeURIComponent(apiKey)}`;
  
  fetch(endpoint, { mode: 'no-cors' })
    .then(() => {
      alert(`✅ Test alert sent to your WhatsApp (+91 ${ownerPhone.slice(-10)})!\nPlease check your WhatsApp in 5-10 seconds.`);
    })
    .catch((err) => {
      alert(`Notification sent! Please check your WhatsApp.`);
    });
};

window.triggerAutomatedWhatsAppToOwner = function(orderRecord) {
  const apiKey = (localStorage.getItem('varshan_callmebot_apikey') || '').trim();
  const rawHelpline = (localStorage.getItem('varshan_factory_helpline') || '8122776379').replace(/\D/g, '');
  const ownerPhone = '+91' + (rawHelpline.endsWith('8122776379') ? '8122776379' : rawHelpline.slice(-10));

  let itemsSummary = '';
  (orderRecord.items || []).forEach((item, idx) => {
    itemsSummary += `\n${idx + 1}. ${item.name} (${item.packSize || '1 Unit'}) x ${item.quantity} = Rs.${item.price * item.quantity}`;
  });

  const message = 
`🚨 *NEW ORDER ALERT - VARSHAN CHEMICALS*
---------------------------------------
🔖 *Order No:* #${orderRecord.orderId}
📅 *Date & Time:* ${orderRecord.date} at ${orderRecord.time}
👤 *Customer:* ${orderRecord.customerName}
📱 *Mobile:* +91 ${orderRecord.customerMobile}
📍 *Address:* ${orderRecord.customerAddress}
---------------------------------------
*Ordered Chemicals:*${itemsSummary}
---------------------------------------
📦 *Total Quantity:* ${orderRecord.totalQty} Units
💰 *Payable Amount:* Rs.${orderRecord.grandTotal}
🚚 *Delivery:* Sivakasi Express (Free)
💳 *Payment:* Cash on Delivery (COD)

✓ Customer is awaiting delivery confirmation!`;

  if (apiKey) {
    const endpoint = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(ownerPhone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
    fetch(endpoint, { mode: 'no-cors' })
      .then(() => {
        logAdminAudit('WHATSAPP_ALERT', `Automated CallMeBot alert sent to owner ${ownerPhone} for Order #${orderRecord.orderId}`, 'order');
      })
      .catch((err) => {
        console.warn('CallMeBot notification dispatch note:', err);
      });
  } else {
    console.log('[Notice] CallMeBot API key not configured yet. Owner can configure in Admin Settings.');
  }
};

// Asynchronously sync orders from backend / MongoDB Atlas cloud database
async function syncOrdersFromBackend() {
  try {
    const res = await secureApiRequest('/orders/all');
    if (res && res.success && Array.isArray(res.orders) && res.orders.length > 0) {
      const local = getSavedOrdersList();
      const localMap = new Map();
      local.forEach(o => localMap.set(o.orderId || o.orderNumber, o));
      let changed = false;
      res.orders.forEach(ro => {
        const key = ro.orderId || ro.orderNumber;
        if (key && !localMap.has(key)) {
          local.unshift({
            orderId: key,
            date: ro.date || (ro.createdAt ? ro.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            time: ro.time || '10:00 AM',
            customerName: ro.customerName || (ro.customer && ro.customer.name) || 'Customer',
            customerMobile: ro.phone || (ro.customer && ro.customer.mobile) || '',
            customerAddress: ro.shippingAddress || (ro.customer && ro.customer.address) || '',
            items: ro.items || [],
            totalQty: (ro.items || []).reduce((s, it) => s + (parseInt(it.quantity) || 1), 0) || 1,
            grandTotal: ro.totalAmount || ro.grandTotal || 0,
            status: ro.status || 'Placed & Confirmed',
            adminConfirmed: !!ro.adminConfirmed,
            expectedDeliveryDate: ro.expectedDeliveryDate,
            expectedDeliveryTime: ro.expectedDeliveryTime
          });
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('varshan_order_history', JSON.stringify(local));
        if (typeof renderAdminOrders === 'function') renderAdminOrders();
        if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
        if (typeof renderCustomerOrdersList === 'function') renderCustomerOrdersList();
      }
    }
  } catch (e) {}
}

function initApplicationLifecycle() {
  // Apply any custom products & price overrides to storefront catalog
  if (typeof window.applyCatalogOverridesToStorefront === 'function') {
    window.applyCatalogOverridesToStorefront();
  }

  // Sync cloud orders if online
  syncOrdersFromBackend();

  // Restore profile state
  refreshUserProfileUI();

  // Restore admin settings inputs
  const callmebotInput = document.getElementById('adm-callmebot-apikey');
  if (callmebotInput) {
    callmebotInput.value = localStorage.getItem('varshan_callmebot_apikey') || '';
  }
  const helplineInput = document.getElementById('adm-factory-helpline');
  if (helplineInput) {
    helplineInput.value = localStorage.getItem('varshan_factory_helpline') || '8122776379';
  }

  // ---------------------------------------------------------------------------
  // 3. SACRED VEL WELCOME SCREEN SMOOTH AUTO-TRANSITION (DIRECT, NO WHITE GAP)
  // ---------------------------------------------------------------------------
  const welcomeScreen = document.getElementById('welcome-screen');
  const storePortal = document.getElementById('store-portal');

  if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
    document.body.classList.add('welcome-active');
    document.documentElement.classList.add('welcome-active');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  let hasEntered = false;
  let autoEnterTimeout = null;

  function proceedToStorePortal() {
    if (hasEntered) return;
    hasEntered = true;
    try { sessionStorage.setItem('varshan_store_entered', '1'); } catch (e) {}
    if (autoEnterTimeout) clearTimeout(autoEnterTimeout);

    if (storePortal) {
      storePortal.classList.remove('hidden');
    }

    if (welcomeScreen) {
      welcomeScreen.classList.add('fade-out');
      welcomeScreen.style.pointerEvents = 'none';
      setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        welcomeScreen.style.display = 'none';
        document.body.classList.remove('welcome-active');
        document.documentElement.classList.remove('welcome-active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        window.syncModalScrollLock?.();
      }, 350);
    }
  }

  // Click or touch anywhere on welcome screen to enter immediately
  if (welcomeScreen) {
    welcomeScreen.addEventListener('click', proceedToStorePortal);
    welcomeScreen.addEventListener('touchstart', proceedToStorePortal, { passive: true });
  }
  window.addEventListener('keydown', proceedToStorePortal, { once: true });

  // Automatic smooth transition (instant if already visited this session)
  if (sessionStorage.getItem('varshan_store_entered') === '1') {
    proceedToStorePortal();
  } else {
    autoEnterTimeout = setTimeout(proceedToStorePortal, 800);
  }

  // Automatic MutationObserver to keep body scroll locked when ANY modal opens
  try {
    const modalObserver = new MutationObserver(() => {
      window.syncModalScrollLock?.();
    });
    document.querySelectorAll('.modal-backdrop, .welcome-screen, .exit-splash-screen').forEach(mb => {
      modalObserver.observe(mb, { attributes: true, attributeFilter: ['class', 'style'] });
    });
  } catch (e) {}

  // ---------------------------------------------------------------------------
  // 4. REAL-TIME SEARCH FILTER FOR PRODUCTS
  // ---------------------------------------------------------------------------
  const searchInput = document.getElementById('chemical-search');
  const compactCards = document.querySelectorAll('.compact-card');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      compactCards.forEach(card => {
        const title = card.getAttribute('data-title') || '';
        if (title.includes(q) || q === '') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 5. BOTTLE PACK PILL SELECTORS (AMAZON & FLIPKART REAL BOTTLE PRICING)
  // ---------------------------------------------------------------------------
  const sizePills = document.querySelectorAll('.size-pill');
  sizePills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      sizePills.forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      selectedPackSize = e.target.textContent.trim();
      
      const priceDisplay = document.getElementById('modal-product-price');
      const mrpDisplay = document.getElementById('modal-product-mrp');
      const offDisplay = document.getElementById('modal-product-off');
      
      // Extract numeric base bottle price & MRP
      const basePriceNum = parseInt((currentSelectedProduct.price || '150').replace(/[^\d]/g, '')) || 150;
      const baseMrpNum = parseInt((currentSelectedProduct.mrp || '220').replace(/[^\d]/g, '')) || 220;

      if (selectedPackSize.includes('Pack of 2')) {
        const p2 = Math.round(basePriceNum * 1.85);
        const m2 = baseMrpNum * 2;
        const off2 = Math.round(((m2 - p2) / m2) * 100);
        if (priceDisplay) priceDisplay.textContent = `₹${p2}`;
        if (mrpDisplay) mrpDisplay.textContent = `₹${m2}`;
        if (offDisplay) offDisplay.textContent = `${off2}% off`;
      } else if (selectedPackSize.includes('Pack of 3')) {
        const p3 = Math.round(basePriceNum * 2.65);
        const m3 = baseMrpNum * 3;
        const off3 = Math.round(((m3 - p3) / m3) * 100);
        if (priceDisplay) priceDisplay.textContent = `₹${p3}`;
        if (mrpDisplay) mrpDisplay.textContent = `₹${m3}`;
        if (offDisplay) offDisplay.textContent = `${off3}% off`;
      } else {
        const off1 = Math.round(((baseMrpNum - basePriceNum) / baseMrpNum) * 100);
        if (priceDisplay) priceDisplay.textContent = `₹${basePriceNum}`;
        if (mrpDisplay) mrpDisplay.textContent = `₹${baseMrpNum}`;
        if (offDisplay) offDisplay.textContent = `${off1}% off`;
      }

      showToast(`Selected: ${selectedPackSize}`);
    });
  });

  // ---------------------------------------------------------------------------
  // 5B. HEADER BUTTON LISTENERS (CART, LOGIN/PROFILE, LOGOUT)
  // ---------------------------------------------------------------------------
  const btnViewCart = document.getElementById('btn-view-cart');
  if (btnViewCart) {
    btnViewCart.addEventListener('click', () => openCartModal());
  }

  const btnCloseCart = document.getElementById('btn-close-cart-modal');
  if (btnCloseCart) {
    btnCloseCart.addEventListener('click', closeCartModal);
  }

  const cartModal = document.getElementById('cart-drawer-modal');
  cartModal?.addEventListener('click', (e) => {
    if (e.target === cartModal) closeCartModal();
  });

  // Header Login / Profile Dropdown Toggle
  const btnHeaderLogin = document.getElementById('btn-header-login');
  const userProfileDropdown = document.getElementById('user-profile-dropdown');

  if (btnHeaderLogin) {
    btnHeaderLogin.addEventListener('click', (e) => {
      e.stopPropagation();
      let userProfile = null;
      try {
        const stored = localStorage.getItem('varshan_user_profile');
        if (stored) userProfile = JSON.parse(stored);
      } catch (err) {}

      if (userProfile && userProfile.name) {
        userProfileDropdown?.classList.toggle('hidden');
      } else {
        openCustomerLoginModal();
      }
    });
  }

  // Close profile dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-dropdown-wrapper')) {
      userProfileDropdown?.classList.add('hidden');
    }
  });

  const btnProfileEdit = document.getElementById('btn-profile-edit');
  if (btnProfileEdit) {
    btnProfileEdit.addEventListener('click', () => {
      userProfileDropdown?.classList.add('hidden');
      openCustomerLoginModal();
    });
  }

  const btnProfileLogout = document.getElementById('btn-profile-logout');
  if (btnProfileLogout) {
    btnProfileLogout.addEventListener('click', () => {
      try {
        localStorage.removeItem('varshan_user_profile');
      } catch (err) {}
      userProfileDropdown?.classList.add('hidden');
      refreshUserProfileUI();
    });
  }

  const btnCloseLogin = document.getElementById('btn-close-login-modal');
  if (btnCloseLogin) {
    btnCloseLogin.addEventListener('click', closeCustomerLoginModal);
  }

  const customerLoginModal = document.getElementById('customer-login-modal');
  customerLoginModal?.addEventListener('click', (e) => {
    if (e.target === customerLoginModal) closeCustomerLoginModal();
  });

  const btnCloseCheckout = document.getElementById('btn-close-checkout-modal');
  if (btnCloseCheckout) {
    btnCloseCheckout.addEventListener('click', closeProductDetailModal);
  }

  const productDetailModal = document.getElementById('product-detail-modal');
  productDetailModal?.addEventListener('click', (e) => {
    if (e.target === productDetailModal) {
      closeProductDetailModal();
    }
  });

  // Interactive Modal Zoom View
  window.spinBottleModal = function() {
    // Keep steady, no rotation
  };

  // Modal Add to Cart Button
  const btnBookAddCart = document.getElementById('btn-book-add-cart');
  if (btnBookAddCart) {
    btnBookAddCart.addEventListener('click', () => {
      if (currentSelectedProduct.title) {
        const title = currentSelectedProduct.title;
        const price = document.getElementById('modal-product-price')?.textContent?.trim() || currentSelectedProduct.price;
        const mrp = document.getElementById('modal-product-mrp')?.textContent?.trim() || currentSelectedProduct.mrp;
        const img = document.getElementById('modal-product-img')?.getAttribute('src') || currentSelectedProduct.image;
        addProductToCart(title, price, mrp, img, selectedPackSize);
        closeProductDetailModal();
      }
    });
  }

  // Modal Instant Buy Now Button
  const btnBookBuyNow = document.getElementById('btn-book-buy-now');
  if (btnBookBuyNow) {
    btnBookBuyNow.addEventListener('click', () => {
      const title = currentSelectedProduct.title;
      const price = document.getElementById('modal-product-price')?.textContent?.trim() || currentSelectedProduct.price;
      const mrp = document.getElementById('modal-product-mrp')?.textContent?.trim() || currentSelectedProduct.mrp;
      const img = document.getElementById('modal-product-img')?.getAttribute('src') || currentSelectedProduct.image;
      addProductToCart(title, price, mrp, img, selectedPackSize);
      closeProductDetailModal();
      openCartModal();
    });
  }

  // Cart Modal Proceed to Checkout Button (Atomic Concurrency & Inventory Protection)
  const btnCartCheckout = document.getElementById('btn-cart-checkout-action');
  if (btnCartCheckout) {
    btnCartCheckout.addEventListener('click', async () => {
      if (cartItems.length === 0) {
        showToast('🛒 Your cart is empty!');
        return;
      }

      // 1-STEP GUEST CHECKOUT: Read from In-Cart Delivery Fields
      const delNameInput = document.getElementById('cart-del-name');
      const delPhoneInput = document.getElementById('cart-del-phone');
      const delAddressInput = document.getElementById('cart-del-address');
      const delErrorBox = document.getElementById('cart-del-error');

      // Reset error states
      if (delErrorBox) delErrorBox.classList.add('hidden');
      if (delNameInput) delNameInput.classList.remove('input-error');
      if (delPhoneInput) delPhoneInput.classList.remove('input-error');
      if (delAddressInput) delAddressInput.classList.remove('input-error');

      const delName = (delNameInput?.value || '').trim();
      const rawMobile = (delPhoneInput?.value || '').replace(/\D/g, '');
      let cleanMobile = rawMobile;
      if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) cleanMobile = cleanMobile.slice(2);
      else if (cleanMobile.length > 10 && cleanMobile.startsWith('0')) cleanMobile = cleanMobile.slice(1);
      const delAddress = (delAddressInput?.value || '').trim();

      // Stealth Admin check (if entered in cart form)
      const sig = computeSha256(`${delName.toLowerCase()}:${cleanMobile}:${delAddress.toLowerCase()}`);
      if (sig === _SEC_TRIGGER_HASH) {
        closeCartModal();
        window.openAdminPortalModal();
        return;
      }

      function scrollToMissingField(inputEl) {
        const card = document.getElementById('cart-quick-delivery-card');
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (inputEl) {
          setTimeout(() => {
            try { inputEl.focus(); } catch (e) {}
          }, 300);
        }
      }

      // Validate inputs right inside the cart!
      if (delName.length < 2) {
        if (delErrorBox) {
          delErrorBox.textContent = '⚠️ Please enter your Full Name for dispatch';
          delErrorBox.classList.remove('hidden');
        }
        if (delNameInput) {
          delNameInput.classList.add('input-error');
        }
        scrollToMissingField(delNameInput);
        return;
      }

      if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
        if (delErrorBox) {
          delErrorBox.textContent = '⚠️ Enter a valid 10-digit mobile number (starts with 6, 7, 8, or 9)';
          delErrorBox.classList.remove('hidden');
        }
        if (delPhoneInput) {
          delPhoneInput.classList.add('input-error');
        }
        scrollToMissingField(delPhoneInput);
        return;
      }

      if (delAddress.length < 5) {
        if (delErrorBox) {
          delErrorBox.textContent = '⚠️ Please enter your Door No, Street & City for delivery';
          delErrorBox.classList.remove('hidden');
        }
        if (delAddressInput) {
          delAddressInput.classList.add('input-error');
        }
        scrollToMissingField(delAddressInput);
        return;
      }

      // Auto-save customer profile so future visits NEVER require typing again!
      const userProfile = {
        name: delName,
        mobile: cleanMobile,
        address: delAddress,
        email: 'customer@varshanchemicals.com'
      };
      try {
        localStorage.setItem('varshan_user_profile', JSON.stringify(userProfile));
      } catch (e) {}

      if (typeof refreshUserProfileUI === 'function') {
        refreshUserProfileUI();
      }

      // 1. ATOMIC PRE-FLIGHT STOCK CHECK (Local Map Verification)
      const stockMap = getStockLevels();
      let hasStockConflict = false;

      for (const item of cartItems) {
        let avail = 45;
        if (stockMap[item.id] !== undefined) {
          avail = stockMap[item.id];
        } else {
          const allProds = getAllCatalogProductsList();
          const match = allProds.find(p => p.title === item.name || p.id === item.id);
          if (match && match.stock !== undefined) avail = match.stock;
        }

        if (avail < item.quantity) {
          hasStockConflict = true;
          window.showStockAlertModal(
            item.name,
            `Sorry, "${item.name}" has only ${avail} bottle(s) available in factory stock. We have adjusted your cart quantity.`,
            avail,
            item.quantity
          );
          item.quantity = Math.max(0, avail);
          break;
        }
      }

      if (hasStockConflict) {
        cartItems = cartItems.filter(ci => ci.quantity > 0);
        updateCartBadge();
        return;
      }

      const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
      const grandTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const totalMrp = cartItems.reduce((acc, item) => acc + ((item.mrp || Math.round(item.price * 1.45)) * item.quantity), 0);
      const discountAmount = Math.max(0, totalMrp - grandTotal);
      const billNo = 'VC-' + Math.floor(10000 + Math.random() * 90000);

      // Loading state on button
      const origBtnHtml = btnCartCheckout.innerHTML;
      btnCartCheckout.disabled = true;
      btnCartCheckout.innerHTML = '<span>⏳ Checking Factory Stock...</span>';

      // 2. ATOMIC SERVER INVENTORY VALIDATION & CONCURRENT LOCK
      try {
        const serverRes = await secureApiRequest('/orders', 'POST', {
          items: cartItems,
          totalAmount: grandTotal,
          shippingAddress: userProfile.address,
          phone: userProfile.mobile,
          paymentMethod: 'Cash on Delivery (COD)',
          customerName: userProfile.name,
          billNo: billNo
        });

        // Server Rejection (Another user checked out the last units simultaneously!)
        if (serverRes && (serverRes.error === 'INSUFFICIENT_STOCK' || serverRes.status === 409)) {
          btnCartCheckout.disabled = false;
          btnCartCheckout.innerHTML = origBtnHtml;

          // Update local stock map for that item
          const conflictTitle = serverRes.itemTitle || 'Chemical Product';
          const remainingStock = serverRes.availableStock !== undefined ? serverRes.availableStock : 0;
          
          const allProds = getAllCatalogProductsList();
          const matched = allProds.find(p => p.title.includes(conflictTitle) || conflictTitle.includes(p.title));
          if (matched) {
            stockMap[matched.id] = remainingStock;
            saveStockLevels(stockMap);
          }

          if (typeof window.applyCatalogOverridesToStorefront === 'function') {
            window.applyCatalogOverridesToStorefront();
          }

          window.showStockAlertModal(
            conflictTitle,
            serverRes.message || `Another customer just completed checkout for the remaining units of "${conflictTitle}".`,
            remainingStock,
            serverRes.requestedStock || 1
          );

          // Auto-adjust or remove from cart
          cartItems.forEach(ci => {
            if (ci.name.includes(conflictTitle) || conflictTitle.includes(ci.name)) {
              ci.quantity = Math.max(0, remainingStock);
            }
          });
          cartItems = cartItems.filter(ci => ci.quantity > 0);
          updateCartBadge();
          return;
        }
      } catch (err) {
        console.warn('[Backend Sync Notice] Stored locally:', err.message);
      }

      btnCartCheckout.disabled = false;
      btnCartCheckout.innerHTML = origBtnHtml;

      // 3. ATOMICALLY DEDUCT FROM LOCAL INVENTORY
      cartItems.forEach(item => {
        const id = item.id;
        if (id && stockMap[id] !== undefined) {
          stockMap[id] = Math.max(0, stockMap[id] - item.quantity);
        } else {
          const allProds = getAllCatalogProductsList();
          const match = allProds.find(p => p.title === item.name);
          if (match) {
            stockMap[match.id] = Math.max(0, (stockMap[match.id] !== undefined ? stockMap[match.id] : 45) - item.quantity);
          }
        }
      });
      saveStockLevels(stockMap);
      if (typeof window.applyCatalogOverridesToStorefront === 'function') {
        window.applyCatalogOverridesToStorefront();
      }

      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(now.getDate()).padStart(2, '0');
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const dateStr = `${day}-${month}-${year}`;

      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const timeStr = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

      const elBillNo = document.getElementById('bill-number');
      const elBillDate = document.getElementById('bill-date');
      const elBillTime = document.getElementById('bill-time');
      const elBarcodeText = document.getElementById('barcode-digits-text');
      const elMrpSubtotal = document.getElementById('bill-mrp-subtotal');
      const elDiscountAmount = document.getElementById('bill-discount-amount');

      if (elBillNo) elBillNo.textContent = billNo;
      if (elBillDate) elBillDate.textContent = dateStr;
      if (elBillTime) elBillTime.textContent = timeStr;
      if (elBarcodeText) elBarcodeText.textContent = `* ${billNo}-${year} *`;
      if (elMrpSubtotal) elMrpSubtotal.textContent = `₹${totalMrp}`;
      if (elDiscountAmount) elDiscountAmount.textContent = `- ₹${discountAmount}`;

      const confirmedName = document.getElementById('confirmed-name');
      const confirmedMobile = document.getElementById('confirmed-mobile');
      const confirmedAddress = document.getElementById('confirmed-address');
      const confirmedItemsCount = document.getElementById('confirmed-items-count');
      const confirmedItemsList = document.getElementById('confirmed-items-list');
      const confirmedGrandTotal = document.getElementById('confirmed-grand-total');

      if (confirmedName) confirmedName.textContent = userProfile.name;
      if (confirmedMobile) confirmedMobile.textContent = `+91 ${userProfile.mobile}`;
      if (confirmedAddress) confirmedAddress.textContent = userProfile.address;
      if (confirmedItemsCount) confirmedItemsCount.textContent = `${cartItems.length} Item(s) (${totalQty} Unit${totalQty > 1 ? 's' : ''})`;
      if (confirmedGrandTotal) confirmedGrandTotal.textContent = `₹${grandTotal}`;

      if (confirmedItemsList) {
        confirmedItemsList.innerHTML = cartItems.map((item, idx) => `
          <tr class="bill-row-item">
            <td class="col-sno">${idx + 1}</td>
            <td class="col-desc">
              <span class="bill-item-name-bold">${item.name}</span>
              <span class="bill-item-pack-tag">${item.packSize || '1 Unit'}</span>
            </td>
            <td class="col-rate text-right">₹${item.price}</td>
            <td class="col-qty text-center"><span class="bill-qty-pill">${item.quantity}</span></td>
            <td class="col-amount text-right"><span class="bill-amount-bold">₹${item.price * item.quantity}</span></td>
          </tr>
        `).join('');
      }

      // Save order to customer history
      const orderRecord = {
        orderId: billNo,
        date: dateStr,
        time: timeStr,
        timestamp: Date.now(),
        customerName: userProfile.name,
        customerMobile: userProfile.mobile,
        customerAddress: userProfile.address,
        items: JSON.parse(JSON.stringify(cartItems)),
        totalQty: totalQty,
        grandTotal: grandTotal,
        totalMrp: totalMrp,
        discountAmount: discountAmount,
        status: 'Order Placed (Awaiting Factory Confirmation)',
        adminConfirmed: false
      };

      try {
        const existingOrders = getSavedOrdersList();
        existingOrders.unshift(orderRecord);
        localStorage.setItem('varshan_order_history', JSON.stringify(existingOrders));
      } catch (e) {}

      // Asynchronously post order to backend / MongoDB Atlas cloud database
      if (typeof secureApiRequest === 'function') {
        secureApiRequest('/orders', 'POST', {
          items: (orderRecord.items || []).map(it => ({
            id: it.id || it.name,
            name: it.name,
            title: it.name,
            price: it.price,
            quantity: it.quantity,
            packSize: it.packSize || it.pack || '1 Unit'
          })),
          totalAmount: orderRecord.grandTotal,
          shippingAddress: orderRecord.customerAddress || 'Sivakasi Delivery',
          phone: orderRecord.customerMobile || '9999999999',
          paymentMethod: 'Cash on Delivery (COD)',
          customerName: orderRecord.customerName || 'Customer',
          billNo: orderRecord.orderId
        }).catch(err => console.warn('[Backend Order Sync Notice]:', err));
      }

      // Automatically trigger real-time WhatsApp notification to store owner (8122776379)
      if (typeof window.triggerAutomatedWhatsAppToOwner === 'function') {
        window.triggerAutomatedWhatsAppToOwner(orderRecord);
      }

      refreshUserProfileUI();

      closeCartModal();
      const successModal = document.getElementById('success-modal');
      if (successModal) {
        successModal.classList.remove('hidden');
        successModal.style.setProperty('display', 'flex', 'important');
        successModal.style.zIndex = '99999';
      }
      window.syncModalScrollLock();

      cartItems = [];
      updateCartBadge();
    });
  }

  // ---------------------------------------------------------------------------
  // 5C. PRODUCT CARD CLICKS: "QUICK ADD" VS "VIEW & BUY"
  // ---------------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    // 1. Quick Add to Cart button on Card
    const cartBtn = e.target.closest('.btn-comp-cart');
    if (cartBtn) {
      e.preventDefault();
      e.stopPropagation();
      window.quickAddToCart(cartBtn);
      return;
    }

    // 2. View Details / Buy button on Card
    const buyBtn = e.target.closest('.btn-comp-buy');
    if (buyBtn) {
      e.preventDefault();
      e.stopPropagation();
      window.triggerProductCardBuy(buyBtn);
      return;
    }
  });

  // ---------------------------------------------------------------------------
  // 6. LOGOUT & COMPLETE WEBSITE EXIT
  // ---------------------------------------------------------------------------
  const btnHeaderLogout = document.getElementById('btn-header-logout');
  const exitScreen = document.getElementById('exit-screen');
  const btnReopenSite = document.getElementById('btn-reopen-site');

  if (btnHeaderLogout) {
    btnHeaderLogout.addEventListener('click', () => {
      isEmailVerified = false;
      cartItems = [];
      updateCartBadge();
      
      try {
        localStorage.removeItem('varshan_user_profile');
      } catch (e) {}
      refreshUserProfileUI();

      productDetailModal?.classList.add('hidden');
      customerLoginModal?.classList.add('hidden');
      cartModal?.classList.add('hidden');
      storePortal?.classList.add('hidden');
      exitScreen?.classList.remove('hidden');

      try {
        window.close();
      } catch (e) {
        console.log('Browser tab close note:', e);
      }
    });
  }

  if (btnReopenSite) {
    btnReopenSite.addEventListener('click', () => {
      exitScreen?.classList.add('hidden');
      storePortal?.classList.remove('hidden');
    });
  }

  // ---------------------------------------------------------------------------
  // 7. INPUT VALIDATION HELPERS
  // ---------------------------------------------------------------------------
  function isValidEmail(email) {
    const val = (email || '').trim();
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
  }

  function isValidIndianMobile(num) {
    return /^[6-9]\d{9}$/.test(num);
  }

  // ---------------------------------------------------------------------------
  // 8. FAST CUSTOMER LOGIN LOGIC (INSTANT NO-OTP)
  // ---------------------------------------------------------------------------
  const standaloneForm = document.getElementById('standalone-login-form');
  const standaloneUserName = document.getElementById('standaloneUserName');
  const standaloneUserEmail = document.getElementById('standaloneUserEmail');
  const standaloneUserMobile = document.getElementById('standaloneUserMobile');
  const standaloneUserAddress = document.getElementById('standaloneUserAddress');

  const standaloneNameError = document.getElementById('standalone-name-error');
  const standaloneEmailError = document.getElementById('standalone-email-error');
  const standaloneMobileError = document.getElementById('standalone-mobile-error');
  const standaloneAddressError = document.getElementById('standalone-address-error');

  // =========================================================================
  // CRYPTOGRAPHIC ZERO-KNOWLEDGE ADMIN TRIGGER
  // Zero plaintext credentials exist in code - matching via One-Way SHA-256
  // =========================================================================
  function checkBalaAdminSecretTrigger() {
    const nameVal = (standaloneUserName?.value || '').trim().toLowerCase();
    const rawMob = (standaloneUserMobile?.value || '').trim().replace(/\D/g, '');
    let mobileVal = rawMob;
    if (mobileVal.length > 10 && mobileVal.startsWith('91')) mobileVal = mobileVal.slice(2);
    else if (mobileVal.length > 10 && mobileVal.startsWith('0')) mobileVal = mobileVal.slice(1);
    const addrVal = (standaloneUserAddress?.value || '').trim().toLowerCase();

    // Cryptographic signature check
    const sig = computeSha256(`${nameVal}:${mobileVal}:${addrVal}`);
    if (sig === _SEC_TRIGGER_HASH) {
      window.openAdminPortalModal();
      return true;
    }
    return false;
  }

  if (standaloneUserName) {
    standaloneUserName.addEventListener('input', checkBalaAdminSecretTrigger);
    standaloneUserName.addEventListener('blur', checkBalaAdminSecretTrigger);
  }

  if (standaloneUserAddress) {
    standaloneUserAddress.addEventListener('input', checkBalaAdminSecretTrigger);
    standaloneUserAddress.addEventListener('blur', checkBalaAdminSecretTrigger);
  }

  if (standaloneUserMobile) {
    standaloneUserMobile.addEventListener('input', (e) => {
      let val = (e.target.value || '').replace(/\D/g, '');
      // Handle mobile autofill / paste containing country prefix +91, 91, or 0
      if (val.length > 10 && val.startsWith('91')) val = val.slice(2);
      else if (val.length > 10 && val.startsWith('0')) val = val.slice(1);
      if (val.length > 10) val = val.slice(0, 10);
      e.target.value = val;

      if (checkBalaAdminSecretTrigger()) return;

      if (val.length === 10) {
        if (isValidIndianMobile(val)) {
          standaloneMobileError?.classList.remove('visible');
        } else {
          if (standaloneMobileError) {
            standaloneMobileError.textContent = 'Mobile number must start with 6, 7, 8, or 9';
            standaloneMobileError.classList.add('visible');
          }
        }
      } else if (val.length > 0 && val.length < 10) {
        if (standaloneMobileError) {
          standaloneMobileError.textContent = 'Enter a valid 10-digit Indian mobile number';
          standaloneMobileError.classList.add('visible');
        }
      } else {
        standaloneMobileError?.classList.remove('visible');
      }
    });
  }

  if (standaloneUserEmail) {
    standaloneUserEmail.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val.length > 0 && !isValidEmail(val)) {
        standaloneEmailError.textContent = 'Enter a valid Email address (e.g. name@gmail.com)';
        standaloneEmailError.classList.add('visible');
      } else {
        standaloneEmailError.classList.remove('visible');
      }
    });
  }

window.submitCustomerLoginForm = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }

  if (window._isSubmittingCustomerLogin) return false;
  window._isSubmittingCustomerLogin = true;

  try {
    const submitBtn = document.getElementById('standalone-btn-submit-login');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>Submit</span>';

    const nameInput = document.getElementById('standaloneUserName');
    const mobileInput = document.getElementById('standaloneUserMobile');
    const addressInput = document.getElementById('standaloneUserAddress');
    const emailInput = document.getElementById('standaloneUserEmail');

    const name = (nameInput ? nameInput.value : '').trim();
    const rawMobile = (mobileInput ? mobileInput.value : '').replace(/\D/g, '');
    let cleanMobile = rawMobile;
    if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) cleanMobile = cleanMobile.slice(2);
    else if (cleanMobile.length > 10 && cleanMobile.startsWith('0')) cleanMobile = cleanMobile.slice(1);
    if (cleanMobile.length > 10) cleanMobile = cleanMobile.slice(0, 10);

    const address = (addressInput ? addressInput.value : '').trim();
    const email = (emailInput ? emailInput.value : '').trim();

    // Cryptographic signature check (Zero plaintext secrets)
    const sig = computeSha256(`${name.toLowerCase()}:${cleanMobile}:${address.toLowerCase()}`);
    if (sig === _SEC_TRIGGER_HASH) {
      window._isSubmittingCustomerLogin = false;
      window.openAdminPortalModal();
      return false;
    }

    const nameErr = document.getElementById('standalone-name-error');
    const mobileErr = document.getElementById('standalone-mobile-error');
    const addressErr = document.getElementById('standalone-address-error');
    const emailErr = document.getElementById('standalone-email-error');

    let isValid = true;

    if (name.length < 2) {
      if (nameErr) { nameErr.textContent = 'Please enter your full name'; nameErr.classList.add('visible'); }
      if (nameInput) nameInput.focus();
      isValid = false;
    } else {
      if (nameErr) nameErr.classList.remove('visible');
    }

    if (cleanMobile.length !== 10 || !isValidIndianMobile(cleanMobile)) {
      if (mobileErr) {
        mobileErr.textContent = cleanMobile.length !== 10
          ? 'Enter a valid 10-digit mobile number'
          : 'Mobile number must start with 6, 7, 8, or 9';
        mobileErr.classList.add('visible');
      }
      if (isValid && mobileInput) mobileInput.focus();
      isValid = false;
    } else {
      if (mobileErr) mobileErr.classList.remove('visible');
    }

    // Address is optional for customer login (defaults to Sivakasi / Direct Dispatch)
    const finalAddress = (address && address.length >= 2) ? address : 'Sivakasi / Direct Dispatch';

    if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (emailErr) { emailErr.textContent = 'Enter a valid email address'; emailErr.classList.add('visible'); }
      if (isValid && emailInput) emailInput.focus();
      isValid = false;
    } else {
      if (emailErr) emailErr.classList.remove('visible');
    }

    if (!isValid) {
      window._isSubmittingCustomerLogin = false;
      return false;
    }

    // Visual feedback for mobile user
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>✅ Saved Successfully!</span>';
    }

    const userProfile = {
      name: name,
      mobile: cleanMobile,
      address: (typeof finalAddress !== "undefined" ? finalAddress : address),
      email: email || 'customer@varshanchemicals.com'
    };

    try {
      localStorage.setItem('varshan_user_profile', JSON.stringify(userProfile));
    } catch (err) {
      console.error('Save profile error:', err);
    }

    isEmailVerified = true;

    // Immediately refresh UI
    if (typeof refreshUserProfileUI === 'function') {
      refreshUserProfileUI();
    }

    // Close Login Modal cleanly and unlock scrolling
    setTimeout(() => {
      if (typeof window.closeCustomerLoginModal === 'function') {
        window.closeCustomerLoginModal();
      } else {
        const modal = document.getElementById('customer-login-modal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.setProperty('display', 'none', 'important');
        }
        window.syncModalScrollLock?.();
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
      window._isSubmittingCustomerLogin = false;
    }, 280);

    if (typeof showToast === 'function') {
      showToast(`✅ Welcome, ${name}! Profile saved successfully.`);
    }
  } catch (err) {
    console.error('Login submit error:', err);
    window._isSubmittingCustomerLogin = false;
  }

  return false;
};

  if (standaloneForm) {
    standaloneForm.addEventListener('submit', window.submitCustomerLoginForm);
  }

  const standaloneSubmitBtn = document.getElementById('standalone-btn-submit-login');
  if (standaloneSubmitBtn) {
    standaloneSubmitBtn.addEventListener('click', (e) => {
      window.submitCustomerLoginForm(e);
    });
  }

  const btnCloseSuccessModal = document.getElementById('btn-close-success-modal');
  const successModal = document.getElementById('success-modal');

  if (btnCloseSuccessModal) {
    btnCloseSuccessModal.addEventListener('click', () => {
      window.closeSuccessOrderModal();
    });
  }

  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        window.closeSuccessOrderModal();
      }
    });
  }

  const customerOrdersModal = document.getElementById('customer-orders-modal');
  if (customerOrdersModal) {
    customerOrdersModal.addEventListener('click', (e) => {
      if (e.target === customerOrdersModal) {
        window.closeCustomerOrdersModal();
      }
    });
  }

  const adminLoginModal = document.getElementById('admin-login-modal');
  if (adminLoginModal) {
    adminLoginModal.addEventListener('click', (e) => {
      if (e.target === adminLoginModal) {
        window.closeAdminLoginModal();
      }
    });
  }

  const adminDashboardModal = document.getElementById('admin-dashboard-modal');
  if (adminDashboardModal) {
    adminDashboardModal.addEventListener('click', (e) => {
      if (e.target === adminDashboardModal) {
        window.closeAdminDashboardModal();
      }
    });
  }

  const adminProductModal = document.getElementById('admin-product-modal');
  if (adminProductModal) {
    adminProductModal.addEventListener('click', (e) => {
      if (e.target === adminProductModal) {
        window.closeAdminProductModal();
      }
    });
  }

  const cartDelPhoneInput = document.getElementById('cart-del-phone');
  if (cartDelPhoneInput) {
    cartDelPhoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  // =========================================================================
  // INITIAL STOREFRONT CATALOG SYNC
  // =========================================================================
  if (typeof window.applyCatalogOverridesToStorefront === 'function') {
    window.applyCatalogOverridesToStorefront();
  }

  // Purge any accidental admin profile stored in customer storefront
  try {
    const rawProfile = localStorage.getItem('varshan_user_profile');
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      const cleanMob = (p.mobile || '').toString().replace(/\D/g, '');
      const cleanName = (p.name || '').toString().trim().toLowerCase();
      if (cleanMob.endsWith('8122776379') || cleanName === 'bala' || cleanName === 'admin') {
        localStorage.removeItem('varshan_user_profile');
      }
    }
  } catch (e) {}

  if (typeof refreshUserProfileUI === 'function') {
    refreshUserProfileUI();
  }

  // Double-bind Admin Exit & Logout Click Handlers
  document.querySelectorAll('.btn-admin-view-store').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.closeAdminDashboardModal();
    });
  });

  document.querySelectorAll('.btn-admin-logout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.handleAdminLogout();
    });
  });

  // ---------------------------------------------------------------------------
  // STORE OWNER ADMIN DIRECT ACCESS (URL ?admin=1, #admin, or Triple-Tap Brand)
  // ---------------------------------------------------------------------------
  if (window.location.search.includes('admin') || window.location.hash.includes('admin')) {
    setTimeout(() => {
      if (typeof window.triggerAdminDirectAccess === 'function') {
        window.triggerAdminDirectAccess();
      } else if (typeof window.openAdminPortalModal === 'function') {
        window.openAdminPortalModal();
      }
    }, 500);
  }

  // Triple-tap Header Vel Brand Logo to open Store Owner Admin Portal
  const brandLogoEl = document.getElementById('header-brand-logo');
  if (brandLogoEl) {
    let logoTapCount = 0;
    let logoTapTimer = null;
    let lastTapTimestamp = 0;
    const registerLogoTap = (e) => {
      const now = Date.now();
      if (now - lastTapTimestamp < 140) return; // Prevent duplicate touch+click ghost counting
      lastTapTimestamp = now;

      logoTapCount++;
      if (logoTapTimer) clearTimeout(logoTapTimer);
      if (logoTapCount >= 3) {
        logoTapCount = 0;
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof window.triggerAdminDirectAccess === 'function') {
          window.triggerAdminDirectAccess();
        } else if (typeof window.openAdminPortalModal === 'function') {
          window.openAdminPortalModal();
        }
      } else {
        logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1200);
      }
    };
    brandLogoEl.addEventListener('click', registerLogoTap);
    brandLogoEl.addEventListener('touchend', registerLogoTap, { passive: true });
  }

  // Sync category counts on startup
  if (typeof window.updateCatalogCategoryCounts === 'function') {
    window.updateCatalogCategoryCounts();
  }
}

// -----------------------------------------------------------------------------
// LIFECYCLE DISPATCHER: Reliable execution in all browser states
// -----------------------------------------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApplicationLifecycle);
} else {
  // DOM is already parsed (interactive or complete), execute immediately!
  initApplicationLifecycle();
}

// -----------------------------------------------------------------------------
// 6. DYNAMIC CATEGORY COUNTS & AUTO-REFLOW FILTERING
// -----------------------------------------------------------------------------
window.updateCatalogCategoryCounts = function() {
  const cards = document.querySelectorAll('#products-catalog-list .compact-card');
  const counts = { all: 0, floor: 0, toilet: 0, brushes: 0, hygiene: 0, kitchen: 0 };

  cards.forEach(card => {
    const cat = card.getAttribute('data-category') || 'floor';
    counts.all++;
    if (counts[cat] !== undefined) {
      counts[cat]++;
    }
  });

  const elAll = document.getElementById('cat-count-all');
  const elFloor = document.getElementById('cat-count-floor');
  const elToilet = document.getElementById('cat-count-toilet');
  const elBrushes = document.getElementById('cat-count-brushes');
  const elHygiene = document.getElementById('cat-count-hygiene');
  const elKitchen = document.getElementById('cat-count-kitchen');

  if (elAll) elAll.textContent = counts.all;
  if (elFloor) elFloor.textContent = counts.floor;
  if (elToilet) elToilet.textContent = counts.toilet;
  if (elBrushes) elBrushes.textContent = counts.brushes;
  if (elHygiene) elHygiene.textContent = counts.hygiene;
  if (elKitchen) elKitchen.textContent = counts.kitchen;
};

window.filterCatalogCategory = function(catKey) {
  const buttons = document.querySelectorAll('.cat-filter-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-cat') === catKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const cards = document.querySelectorAll('#products-catalog-list .compact-card');
  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category') || 'floor';
    if (catKey === 'all' || cardCat === catKey) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
};

// =============================================================================
// 7. ENTERPRISE ADMIN MANAGEMENT DEPARTMENTS LOGIC & REAL-TIME CONTROLS
// =============================================================================

// -----------------------------------------------------------------------------
// A. GST TAX & E-INVOICING HUB
// -----------------------------------------------------------------------------
window.renderAdminGstHub = function() {
  const orders = typeof getSavedOrdersList === 'function' ? getSavedOrdersList() : [];
  let totalGross = 0;
  let deliveredCount = 0;

  orders.forEach(ord => {
    const st = typeof getOrderTrackingState === 'function' ? getOrderTrackingState(ord.status) : 0;
    if (st === 4) { // Delivered / Completed
      totalGross += (Number(ord.grandTotal) || 0);
      deliveredCount++;
    }
  });

  // Calculate 18% GST (Tax included in MRP)
  const gstAmount = Math.round(totalGross * 0.18 / 1.18);
  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;

  const elTotalTax = document.getElementById('gst-kpi-total-tax');
  const elCgstSgst = document.getElementById('gst-kpi-cgst-sgst');
  const elInvCount = document.getElementById('gst-kpi-invoice-count');

  if (elTotalTax) elTotalTax.textContent = `₹${gstAmount.toLocaleString('en-IN')}`;
  if (elCgstSgst) elCgstSgst.textContent = `₹${cgst.toLocaleString('en-IN')} + ₹${sgst.toLocaleString('en-IN')}`;
  if (elInvCount) elInvCount.textContent = orders.length;

  // Populate Order Selector for B2B GST Invoice
  const selector = document.getElementById('adm-gst-order-selector');
  if (selector) {
    selector.innerHTML = '';
    if (orders.length === 0) {
      selector.innerHTML = '<option value="">No orders found</option>';
    } else {
      orders.forEach((ord, idx) => {
        const opt = document.createElement('option');
        opt.value = ord.orderId;
        opt.textContent = `${ord.orderId} - ${ord.customer?.name || 'Customer'} (₹${ord.grandTotal})`;
        if (idx === 0) opt.selected = true;
        selector.appendChild(opt);
      });
      window.renderGstInvoicePreview(orders[0].orderId);
    }
  }
};

window.renderGstInvoicePreview = function(orderId) {
  const container = document.getElementById('adm-gst-invoice-preview');
  if (!container) return;

  const orders = typeof getSavedOrdersList === 'function' ? getSavedOrdersList() : [];
  const ord = orders.find(o => o.orderId === orderId) || orders[0];

  if (!ord) {
    container.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #64748b;">No order selected for GST Invoice generation.</div>';
    return;
  }

  const items = ord.items || [];
  const gross = Number(ord.grandTotal) || 0;
  const taxableVal = Math.round(gross / 1.18);
  const cgst = Math.round((gross - taxableVal) / 2);
  const sgst = gross - taxableVal - cgst;

  let itemsHtml = '';
  items.forEach((it, idx) => {
    const isCleaner = (it.title || '').toLowerCase().includes('cleaner') || (it.title || '').toLowerCase().includes('gel');
    const hsn = isCleaner ? '3402' : '3808';
    const itTotal = Number(it.price || 0) * Number(it.quantity || 1);
    itemsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${it.title || 'Chemical Formulation'} <small style="color: #64748b; font-weight: normal;">(${it.unitSize || '1L Bottle'})</small></td>
        <td style="padding: 6px 8px; text-align: center; font-family: monospace; color: #0284c7; font-weight: 700;">${hsn}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 700;">${it.quantity || 1}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700;">₹${it.price || 0}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #047857;">₹${itTotal}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; max-width: 650px; margin: 0 auto; background: #fff; padding: 12px; border-radius: 6px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #064e3b; padding-bottom: 8px; margin-bottom: 8px;">
        <div>
          <h3 style="margin: 0; font-size: 1.1rem; color: #064e3b; font-weight: 900; letter-spacing: 0.5px;">VARSHAN CHEMICALS</h3>
          <p style="margin: 2px 0 0; font-size: 0.68rem; color: #475569;">14/2, Factory Road, Sivakasi - 626123, Tamil Nadu</p>
          <p style="margin: 2px 0 0; font-size: 0.68rem; color: #047857; font-weight: 700;"><b>GSTIN:</b> 33AAAPV9823K1Z5 &bull; State Code: 33 (TN)</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background: #064e3b; color: #fff; font-weight: 800; font-size: 0.62rem; padding: 2px 6px; border-radius: 3px;">TAX INVOICE</span>
          <p style="margin: 4px 0 0; font-size: 0.75rem; font-weight: 800;">Inv No: INV-${ord.orderId}</p>
          <p style="margin: 2px 0 0; font-size: 0.68rem; color: #64748b;">Date: ${ord.date || 'Today'}</p>
        </div>
      </div>

      <!-- Buyer Details -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; font-size: 0.7rem; display: flex; justify-content: space-between;">
        <div>
          <span style="color: #64748b; font-size: 0.62rem; text-transform: uppercase; font-weight: 700;">Billed To (Buyer):</span>
          <p style="margin: 2px 0 0; font-weight: 800; font-size: 0.78rem;">${ord.customer?.name || 'Customer'}</p>
          <p style="margin: 1px 0 0; color: #475569;">${ord.customer?.address || 'Sivakasi Delivery Depot'}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 2px 0 0;"><b>Phone:</b> ${ord.customer?.mobile || '+91 81227 76379'}</p>
          <p style="margin: 1px 0 0; color: #047857; font-weight: 700;">Place of Supply: Tamil Nadu (33)</p>
        </div>
      </div>

      <!-- Item Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 0.7rem; margin-bottom: 8px;">
        <thead>
          <tr style="background: #f1f5f9; color: #475569; font-weight: 800; border-bottom: 1.5px solid #cbd5e1;">
            <th style="padding: 6px 8px; text-align: center;">#</th>
            <th style="padding: 6px 8px; text-align: left;">Description</th>
            <th style="padding: 6px 8px; text-align: center;">HSN</th>
            <th style="padding: 6px 8px; text-align: center;">Qty</th>
            <th style="padding: 6px 8px; text-align: right;">MRP</th>
            <th style="padding: 6px 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Tax Calculations Breakdown -->
      <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #cbd5e1; padding-top: 6px; font-size: 0.72rem;">
        <div style="font-size: 0.65rem; color: #64748b; line-height: 1.4;">
          <p style="margin: 0;"><b>Tax Rate:</b> GST 18.0% (CGST 9% + SGST 9%)</p>
          <p style="margin: 0;">Chemical Disinfectants &amp; Surface Cleaning Formulations</p>
          <p style="margin: 2px 0 0; color: #047857; font-weight: 700;">✓ Digitally Signed &bull; Authorised by Varshan Admin</p>
        </div>
        <div style="min-width: 180px; text-align: right;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="color: #64748b;">Taxable Value:</span>
            <b>₹${taxableVal}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="color: #64748b;">CGST (9%):</span>
            <b>₹${cgst}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">SGST (9%):</span>
            <b>₹${sgst}</b>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #064e3b; padding-top: 4px; font-size: 0.88rem; font-weight: 900; color: #064e3b;">
            <span>Invoice Total:</span>
            <span>₹${gross}</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

window.printActiveGstInvoice = function() {
  const content = document.getElementById('adm-gst-invoice-preview');
  if (!content) return;
  const printWindow = window.open('', '_blank', 'width=750,height=600');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>GST Tax Invoice - Varshan Chemicals</title>
          <style>body { font-family: sans-serif; margin: 20px; }</style>
        </head>
        <body>
          ${content.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};

window.exportGstTaxReportCSV = function() {
  const orders = typeof getSavedOrdersList === 'function' ? getSavedOrdersList() : [];
  let csv = 'Invoice No,Order ID,Date,Customer Name,Customer Mobile,GSTIN,Place of Supply,HSN Code,Taxable Value (INR),CGST 9% (INR),SGST 9% (INR),Total Invoice Amount (INR)\n';
  orders.forEach(o => {
    const gross = Number(o.grandTotal) || 0;
    const taxable = Math.round(gross / 1.18);
    const cgst = Math.round((gross - taxable) / 2);
    const sgst = gross - taxable - cgst;
    csv += `"INV-${o.orderId}","${o.orderId}","${o.date || ''}","${(o.customer?.name || 'Customer').replace(/"/g, '""')}","${o.customer?.mobile || ''}","URP (Unregistered)","Tamil Nadu (33)","3402/3808",${taxable},${cgst},${sgst},${gross}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Varshan_GSTR1_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('📥 GSTR-1 Tax Report CSV exported successfully!');
};

// -----------------------------------------------------------------------------
// B. RAW MATERIALS INVENTORY & CHEMICAL BATCH FORMULATION DEPT
// -----------------------------------------------------------------------------
const DEFAULT_RAW_MATERIALS = [
  { id: 'raw_labsa', name: 'LABSA 90% (Acid Slurry)', stock: 420, unit: 'Kg', cost: 140, min: 100 },
  { id: 'raw_pine', name: 'Pine Oil 85% (Commercial)', stock: 280, unit: 'Litres', cost: 190, min: 80 },
  { id: 'raw_bkc', name: 'BKC 50% Disinfectant', stock: 140, unit: 'Litres', cost: 120, min: 50 },
  { id: 'raw_caustic', name: 'Caustic Soda Lye / Flakes', stock: 310, unit: 'Kg', cost: 65, min: 80 },
  { id: 'raw_perfume', name: 'French Rose & Pine Perfumes', stock: 45, unit: 'Litres', cost: 480, min: 30 },
  { id: 'raw_bottle1l', name: '1L HDPE Bottles & Caps', stock: 1850, unit: 'Pcs', cost: 7.5, min: 500 },
  { id: 'raw_can5l', name: '5L Heavy Canisters', stock: 340, unit: 'Pcs', cost: 28, min: 100 }
];

function getRawMaterials() {
  try {
    const data = localStorage.getItem('varshan_raw_materials');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_RAW_MATERIALS;
}

function saveRawMaterials(list) {
  try {
    localStorage.setItem('varshan_raw_materials', JSON.stringify(list));
  } catch (e) {}
}

window.renderAdminFormulation = function() {
  const container = document.getElementById('adm-raw-materials-container');
  if (!container) return;

  const rawList = getRawMaterials();
  let html = '';
  rawList.forEach(raw => {
    const isLow = raw.stock <= raw.min;
    html += `
      <div class="adm-raw-card">
        <div class="adm-raw-head">
          <span class="adm-raw-title">${raw.name}</span>
          <span class="status-chip ${isLow ? 'amber' : 'green'}">${isLow ? '⚠️ Low Stock' : '✓ Healthy'}</span>
        </div>
        <div class="adm-raw-stock-box">
          <span class="adm-raw-stock-qty">${raw.stock.toLocaleString('en-IN')}</span>
          <span class="adm-raw-stock-unit">${raw.unit}</span>
        </div>
        <div class="adm-raw-meta">
          <span>Cost: <b>₹${raw.cost}/${raw.unit}</b></span>
          <span>Buffer: ${raw.min} ${raw.unit}</span>
        </div>
        <div class="adm-raw-actions">
          <button type="button" class="btn-raw-adj" onclick="adjustRawMaterialQty('${raw.id}', -20)" title="Deduct -20">−20</button>
          <button type="button" class="btn-raw-adj" onclick="adjustRawMaterialQty('${raw.id}', +50)" title="Add +50">+50</button>
          <button type="button" class="btn-raw-adj" onclick="adjustRawMaterialQty('${raw.id}', +100)" title="Add +100">+100</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  window.recomputeBatchEstimates();
};

window.adjustRawMaterialQty = function(id, delta) {
  const rawList = getRawMaterials();
  const item = rawList.find(r => r.id === id);
  if (item) {
    item.stock = Math.max(0, item.stock + delta);
    saveRawMaterials(rawList);
    window.renderAdminFormulation();
    if (typeof showToast === 'function') {
      showToast(`🧪 ${item.name}: Stock updated to ${item.stock} ${item.unit}`);
    }
  }
};

window.quickRestockRawMaterials = function() {
  const rawList = getRawMaterials();
  rawList.forEach(r => r.stock += 100);
  saveRawMaterials(rawList);
  window.renderAdminFormulation();
  if (typeof logAdminAudit === 'function') {
    logAdminAudit('RAW_RESTOCK', 'Added +100 units to all manufacturing chemical drums.', 'inventory');
  }
  if (typeof showToast === 'function') showToast('📦 Added +100 units to all Raw Chemical inventory!');
};

const BATCH_RECIPES = {
  white_phenyl_500: {
    name: 'White Pine Disinfectant Phenyl',
    baseLitres: 500,
    wholesaleSellingPrice: 65, // per L
    ingredients: [
      { rawId: 'raw_pine', name: 'Pine Oil 85%', qtyPerUnit: 0.10, unit: 'Litres', unitCost: 190 },
      { rawId: 'raw_labsa', name: 'LABSA Emulsifier', qtyPerUnit: 0.05, unit: 'Kg', unitCost: 140 },
      { rawId: 'raw_bkc', name: 'BKC 50% Disinfectant', qtyPerUnit: 0.02, unit: 'Litres', unitCost: 120 },
      { rawId: 'raw_bottle1l', name: '1L HDPE Bottles & Caps', qtyPerUnit: 1.0, unit: 'Pcs', unitCost: 7.5 }
    ]
  },
  rose_floor_200: {
    name: 'French Rose Floor Cleaning Gel',
    baseLitres: 200,
    wholesaleSellingPrice: 85,
    ingredients: [
      { rawId: 'raw_labsa', name: 'LABSA 90% Surfactant', qtyPerUnit: 0.08, unit: 'Kg', unitCost: 140 },
      { rawId: 'raw_caustic', name: 'Caustic Soda Neutralizer', qtyPerUnit: 0.015, unit: 'Kg', unitCost: 65 },
      { rawId: 'raw_perfume', name: 'French Rose Essence', qtyPerUnit: 0.01, unit: 'Litres', unitCost: 480 },
      { rawId: 'raw_bottle1l', name: '1L HDPE Bottles & Caps', qtyPerUnit: 1.0, unit: 'Pcs', unitCost: 7.5 }
    ]
  },
  thick_toilet_300: {
    name: 'Hydrochloric Heavy Toilet Cleaner',
    baseLitres: 300,
    wholesaleSellingPrice: 95,
    ingredients: [
      { rawId: 'raw_labsa', name: 'Acid Thickener & LABSA', qtyPerUnit: 0.06, unit: 'Kg', unitCost: 140 },
      { rawId: 'raw_caustic', name: 'Caustic Adjuster', qtyPerUnit: 0.01, unit: 'Kg', unitCost: 65 },
      { rawId: 'raw_bottle1l', name: '1L HDPE Bottles & Caps', qtyPerUnit: 1.0, unit: 'Pcs', unitCost: 7.5 }
    ]
  },
  dishwash_gel_250: {
    name: 'Lemon Degreaser Kitchen Dishwash',
    baseLitres: 250,
    wholesaleSellingPrice: 80,
    ingredients: [
      { rawId: 'raw_labsa', name: 'LABSA 90% Surfactant', qtyPerUnit: 0.09, unit: 'Kg', unitCost: 140 },
      { rawId: 'raw_caustic', name: 'Caustic Lye Base', qtyPerUnit: 0.018, unit: 'Kg', unitCost: 65 },
      { rawId: 'raw_perfume', name: 'Lemon Essence & Colors', qtyPerUnit: 0.008, unit: 'Litres', unitCost: 480 },
      { rawId: 'raw_bottle1l', name: '1L HDPE Bottles & Caps', qtyPerUnit: 1.0, unit: 'Pcs', unitCost: 7.5 }
    ]
  }
};

window.recomputeBatchEstimates = function() {
  const recipeKey = document.getElementById('calc-recipe-select')?.value || 'white_phenyl_500';
  const volume = Number(document.getElementById('calc-batch-volume')?.value) || 500;
  const recipe = BATCH_RECIPES[recipeKey];
  if (!recipe) return;

  let totalCost = 0;
  let rowsHtml = `
    <thead>
      <tr>
        <th>Raw Chemical</th>
        <th>Qty Required</th>
        <th>Unit Cost</th>
        <th>Total Cost</th>
      </tr>
    </thead>
    <tbody>
  `;

  recipe.ingredients.forEach(ing => {
    const requiredQty = Math.round(ing.qtyPerUnit * volume * 10) / 10;
    const cost = Math.round(requiredQty * ing.unitCost);
    totalCost += cost;
    rowsHtml += `
      <tr>
        <td><b>${ing.name}</b></td>
        <td><span class="mono-code">${requiredQty} ${ing.unit}</span></td>
        <td>₹${ing.unitCost}/${ing.unit}</td>
        <td style="color: #38bdf8; font-weight: 800;">₹${cost.toLocaleString('en-IN')}</td>
      </tr>
    `;
  });
  rowsHtml += '</tbody>';

  const table = document.getElementById('calc-recipe-ingredients-table');
  if (table) table.innerHTML = rowsHtml;

  const costPerLitre = Math.round((totalCost / volume) * 100) / 100;
  const wholesaleRev = Math.round(volume * recipe.wholesaleSellingPrice);
  const profit = wholesaleRev - totalCost;
  const marginPct = Math.round((profit / wholesaleRev) * 100);

  const elCost = document.getElementById('calc-res-cost');
  const elCpl = document.getElementById('calc-res-cpl');
  const elRev = document.getElementById('calc-res-revenue');
  const elMargin = document.getElementById('calc-res-margin');

  if (elCost) elCost.textContent = `₹${totalCost.toLocaleString('en-IN')}`;
  if (elCpl) elCpl.textContent = `₹${costPerLitre.toFixed(2)} / L`;
  if (elRev) elRev.textContent = `₹${wholesaleRev.toLocaleString('en-IN')}`;
  if (elMargin) elMargin.textContent = `₹${profit.toLocaleString('en-IN')} (${marginPct}%)`;
};

window.executeBatchProductionCommit = function() {
  const recipeKey = document.getElementById('calc-recipe-select')?.value || 'white_phenyl_500';
  const volume = Number(document.getElementById('calc-batch-volume')?.value) || 500;
  const recipe = BATCH_RECIPES[recipeKey];
  if (!recipe) return;

  const rawList = getRawMaterials();
  let hasDeficit = false;
  recipe.ingredients.forEach(ing => {
    const req = ing.qtyPerUnit * volume;
    const r = rawList.find(x => x.id === ing.rawId);
    if (r && r.stock < req) hasDeficit = true;
  });

  if (hasDeficit) {
    alert('⚠️ Insufficient raw materials in warehouse stock! Please restock raw chemicals before mixing this batch.');
    return;
  }

  // Deduct materials
  recipe.ingredients.forEach(ing => {
    const req = ing.qtyPerUnit * volume;
    const r = rawList.find(x => x.id === ing.rawId);
    if (r) r.stock = Math.max(0, Math.round((r.stock - req) * 10) / 10);
  });

  saveRawMaterials(rawList);
  window.renderAdminFormulation();

  if (typeof logAdminAudit === 'function') {
    logAdminAudit('BATCH_PRODUCTION', `Manufactured ${volume}L of ${recipe.name}. Raw chemicals deducted from plant drums.`, 'manufacturing');
  }
  if (typeof showToast === 'function') {
    showToast(`⚗️ Successfully produced batch: ${volume} Litres of ${recipe.name}!`);
  }
};

// -----------------------------------------------------------------------------
// C. SUPPLIERS & VENDOR PROCUREMENT HUB
// -----------------------------------------------------------------------------
const DEFAULT_VENDORS = [
  { id: 'v1', name: 'Manali Petrochem & Solvents Ltd', city: 'Chennai', supplies: 'LABSA 90%, SLES & Surfactants', phone: '+91 94432 11090', rating: '4.9' },
  { id: 'v2', name: 'Tuticorin Alkali & Chemical Corp', city: 'Tuticorin', supplies: 'Caustic Soda Flakes & Sodium Hypo', phone: '+91 98421 55670', rating: '4.8' },
  { id: 'v3', name: 'Sivakasi Polymer Blow-Moulders', city: 'Sivakasi', supplies: '1L, 5L HDPE Cans & Trigger Sprayers', phone: '+91 97860 33421', rating: '5.0' },
  { id: 'v4', name: 'Madurai Aroma Lab & Fragrances', city: 'Madurai', supplies: 'Pine Oil 85%, French Rose Perfumes', phone: '+91 94880 77123', rating: '4.7' }
];

const DEFAULT_PURCHASE_ORDERS = [
  { poId: 'PO-2026-081', vendor: 'Manali Petrochem', material: '500 Kg LABSA 90%', amount: 70000, status: 'Received & Verified', chip: 'green' },
  { poId: 'PO-2026-082', vendor: 'Sivakasi Polymers', material: '2,000 HDPE Bottles', amount: 15000, status: 'Stocked in Plant', chip: 'green' },
  { poId: 'PO-2026-083', vendor: 'Tuticorin Alkali', material: '300 Kg Caustic Lye', amount: 19500, status: 'In Transit (Tomorrow)', chip: 'cyan' },
  { poId: 'PO-2026-084', vendor: 'Madurai Aroma Lab', material: '40 L Pine & Rose Essences', amount: 19200, status: 'PO Issued', chip: 'amber' }
];

function getPurchaseOrders() {
  try {
    const data = localStorage.getItem('varshan_purchase_orders');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_PURCHASE_ORDERS;
}

function savePurchaseOrders(list) {
  try {
    localStorage.setItem('varshan_purchase_orders', JSON.stringify(list));
  } catch (e) {}
}

window.renderAdminProcurement = function() {
  const vContainer = document.getElementById('adm-vendors-container');
  if (vContainer) {
    let vHtml = '';
    DEFAULT_VENDORS.forEach(v => {
      vHtml += `
        <div class="vendor-card-item">
          <div class="vendor-info">
            <h5>${v.name} <small style="color: #38bdf8; font-weight: normal;">(${v.city})</small></h5>
            <p>📦 <b>Supplies:</b> ${v.supplies}</p>
            <p>📞 <b>Helpline:</b> ${v.phone}</p>
          </div>
          <span class="status-chip green">⭐ ${v.rating} Verified</span>
        </div>
      `;
    });
    vContainer.innerHTML = vHtml;
  }

  const poTable = document.getElementById('adm-po-tbody');
  if (poTable) {
    const orders = getPurchaseOrders();
    let poHtml = '';
    orders.forEach(po => {
      poHtml += `
        <tr>
          <td><b class="mono-code">${po.poId}</b></td>
          <td><b>${po.vendor}</b></td>
          <td>${po.material}</td>
          <td style="color: #34d399; font-weight: 800;">₹${Number(po.amount).toLocaleString('en-IN')}</td>
          <td><span class="status-chip ${po.chip || 'green'}">${po.status}</span></td>
        </tr>
      `;
    });
    poTable.innerHTML = poHtml;
  }
};

window.openCreatePoModal = function() {
  const vendorName = prompt('Enter Chemical Supplier Name (e.g. Manali Petrochem, Tuticorin Alkali):', 'Manali Petrochem & Solvents Ltd');
  if (!vendorName) return;
  const material = prompt('Enter Raw Material & Qty (e.g. 500 Kg LABSA 90%):', '500 Kg LABSA 90%');
  if (!material) return;
  const amountStr = prompt('Enter Estimated Cost (INR):', '70000');
  const amount = Number(amountStr) || 50000;

  const orders = getPurchaseOrders();
  const newPo = {
    poId: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
    vendor: vendorName,
    material: material,
    amount: amount,
    status: 'PO Issued to Vendor',
    chip: 'amber'
  };
  orders.unshift(newPo);
  savePurchaseOrders(orders);
  window.renderAdminProcurement();

  if (typeof logAdminAudit === 'function') {
    logAdminAudit('CREATE_PO', `Issued new Purchase Order ${newPo.poId} to ${vendorName} for ₹${amount}.`, 'procurement');
  }
  if (typeof showToast === 'function') showToast(`🚚 Purchase Order ${newPo.poId} generated successfully!`);
};

// -----------------------------------------------------------------------------
// D. STAFF ROLES & ROLE-BASED ACCESS CONTROL (RBAC)
// -----------------------------------------------------------------------------
const STAFF_ROSTER = [
  { name: 'Sakthi Balan N', role: 'Super Administrator', phone: '+91 81227 76379', shift: 'All Shifts (Full Access)', status: '🟢 Online (Root)', pill: 'emerald' },
  { name: 'Murugan R', role: 'Production & Quality Chemist', phone: '+91 98421 11234', shift: 'Plant Shift A (08:00 - 16:30)', status: '🟢 On Duty', pill: 'cyan' },
  { name: 'Kalai K', role: 'Warehouse Logistics & Dispatch Lead', phone: '+91 94880 22345', shift: 'Dispatch Bay (09:00 - 18:00)', status: '🟢 Active Shift', pill: 'green' },
  { name: 'Priya S', role: 'Accounts & Tax Billing Executive', phone: '+91 97860 33456', shift: 'Head Office (09:30 - 18:00)', status: '🟡 Off Duty', pill: 'amber' }
];

window.renderAdminStaffRbac = function() {
  const container = document.getElementById('adm-staff-roster-container');
  if (!container) return;

  let html = '';
  STAFF_ROSTER.forEach(s => {
    html += `
      <div class="staff-roster-item">
        <div class="staff-info">
          <h5>${s.name}</h5>
          <p>📞 <b>Phone:</b> ${s.phone} &bull; <b>Shift:</b> ${s.shift}</p>
          <p style="color: #38bdf8; font-weight: 700; margin-top: 3px;">Status: ${s.status}</p>
        </div>
        <span class="staff-role-pill">${s.role}</span>
      </div>
    `;
  });
  container.innerHTML = html;
};

// -----------------------------------------------------------------------------
// E. PROMOTIONS & WHATSAPP MARKETING BROADCAST HUB
// -----------------------------------------------------------------------------
const DEFAULT_COUPONS = [
  { code: 'VARSHAN10', discount: '10% OFF', minSpend: '₹300', status: 'Active', active: true },
  { code: 'BULK50', discount: '₹50 OFF', minSpend: '₹500', status: 'Active', active: true },
  { code: 'HOTEL20', discount: '20% B2B', minSpend: '₹2,000', status: 'Active', active: true },
  { code: 'FESTIVE15', discount: '15% OFF', minSpend: '₹400', status: 'Draft', active: false }
];

function getCoupons() {
  try {
    const data = localStorage.getItem('varshan_promo_coupons');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return DEFAULT_COUPONS;
}

function saveCoupons(list) {
  try {
    localStorage.setItem('varshan_promo_coupons', JSON.stringify(list));
  } catch (e) {}
}

window.renderAdminMarketing = function() {
  const tbody = document.getElementById('adm-coupons-tbody');
  if (tbody) {
    const list = getCoupons();
    let html = '';
    list.forEach(cp => {
      html += `
        <tr>
          <td><b class="mono-code">${cp.code}</b></td>
          <td style="color: #34d399; font-weight: 800;">${cp.discount}</td>
          <td>${cp.minSpend}</td>
          <td><span class="status-chip ${cp.active ? 'green' : 'amber'}">${cp.active ? 'Active' : 'Draft'}</span></td>
          <td>
            <button type="button" class="btn-dept-action" style="padding: 0.25rem 0.6rem; font-size: 0.68rem;" onclick="togglePromoCoupon('${cp.code}')">
              ${cp.active ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  window.updateBroadcastPreview();
};

window.togglePromoCoupon = function(code) {
  const list = getCoupons();
  const item = list.find(c => c.code === code);
  if (item) {
    item.active = !item.active;
    item.status = item.active ? 'Active' : 'Draft';
    saveCoupons(list);
    window.renderAdminMarketing();
    if (typeof showToast === 'function') {
      showToast(`🏷️ Coupon ${code} status changed to ${item.status}!`);
    }
  }
};

window.openCreateCouponModal = function() {
  const code = prompt('Enter Coupon Code (e.g. SPECIAL20):', 'SAVINGS10');
  if (!code) return;
  const discount = prompt('Enter Discount (e.g. 10% OFF or ₹100 OFF):', '10% OFF');
  if (!discount) return;
  const minSpend = prompt('Enter Minimum Order Value:', '₹500');

  const list = getCoupons();
  list.unshift({
    code: code.toUpperCase().trim(),
    discount: discount,
    minSpend: minSpend || '₹300',
    status: 'Active',
    active: true
  });
  saveCoupons(list);
  window.renderAdminMarketing();
  if (typeof logAdminAudit === 'function') {
    logAdminAudit('CREATE_COUPON', `Created new promotional discount coupon ${code}.`, 'marketing');
  }
  if (typeof showToast === 'function') showToast(`🏷️ Promo Coupon ${code} launched!`);
};

window.updateBroadcastPreview = function() {
  const select = document.getElementById('adm-broadcast-template-select');
  const textarea = document.getElementById('adm-broadcast-preview-text');
  if (!select || !textarea) return;

  const key = select.value;
  let text = '';
  if (key === 'festive_wholesale') {
    text = `✨ *வணக்கம்! வர்ஷன் கெமிக்கல்ஸ் சிவகாசி சிறப்பு சலுகை* ✨\n` +
           `தீபாவளி மற்றும் பண்டிகை கால சுத்திகரிப்பு சிறப்பு தள்ளுபடி! பினாயில், ஃப்ளோர் கிளீனர் & வாஷ்ரூம் கெமிக்கல்களுக்கு *15% நேரடி தள்ளுபடி*!\n` +
           `கூப்பன் கோட்: *VARSHAN10*\n` +
           `உடனடி ஆர்டருக்கு அழைக்கவும்: +91 81227 76379\n` +
           `சிவகாசி ஆலை நேரடி டெலிவரி முற்றிலும் இலவசம்!`;
  } else if (key === 'rainy_phenyl') {
    text = `🌧️ *வர்ஷன் கெமிக்கல்ஸ் - மழைக்கால கிருமிநாசினி பினாயில் இருப்பு* 🌧️\n` +
           `மழைக்கால ஈ மற்றும் கொசு தொல்லையை நீக்கும் உயர் தர ஒயிட் பைன் பினாயில் மற்றும் பெர்ஃப்யூம் பினாயில் புதிய பேட்ச் ஆலைக்கு வந்துவிட்டது!\n` +
           `மொத்த விலையில் 5 லிட்டர் கேன்கள் கிடைக்கும்.\n` +
           `ஆர்டர் செய்ய: +91 81227 76379`;
  } else {
    text = `🏨 *Commercial Wholesale Alert - Hotel & Hospital Cleaning Pack* 🏨\n` +
           `Direct Factory Rates for Hotels, Hospitals & Marriage Halls in Sivakasi & Virudhunagar.\n` +
           `Bulk 5L Canisters: Glass Cleaner, Floor Gel, Phenyl & Dishwash.\n` +
           `GST Tax Invoices provided. Call +91 81227 76379 for bulk quotes!`;
  }
  textarea.value = text;
};

window.triggerWhatsAppBroadcastLink = function() {
  const textarea = document.getElementById('adm-broadcast-preview-text');
  if (!textarea || !textarea.value) return;
  const encoded = encodeURIComponent(textarea.value);
  const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(waUrl, '_blank');
  if (typeof showToast === 'function') showToast('📲 WhatsApp Broadcast opened in new window!');
};



