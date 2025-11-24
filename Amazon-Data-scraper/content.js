/* global chrome */

// Shared CSV export utility functions
const convertToCSV = (products) => {
  if (!products || !products.length) return "";

  const columns = [
    "title",
    "asin",
    "url",
    "wholePriceBlockText",
    "availability",
    "avgCustomerReviews",
    "merchantInfo",
    "storeLinkText",
    "productDescription",
    "additionalInfo",
    "productOverview",
    "productInformation",
    "techSpec",
    "productDetails",
    "aboutProduct",
  ];

  const csvRows = [
    columns.join(","), // header row
    ...products.map((product) =>
      columns
        .map(
          (col) =>
            `"${
              product[col] !== undefined
                ? String(product[col]).replace(/"/g, '""')
                : ""
            }"`
        )
        .join(",")
    ),
  ];

  return csvRows.join("\n");
};

const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Create and inject the floating widget
function createWidget() {
  // Check if widget already exists
  if (document.getElementById('amazon-scraper-widget')) {
    return;
  }

  // Create widget container
  const widget = document.createElement('div');
  widget.id = 'amazon-scraper-widget';
  widget.innerHTML = `
    <div class="widget-container collapsed" id="widget-container">
      <button class="widget-icon-btn" id="add-product-btn" title="Add to Export List">
        <span class="btn-icon">➕</span>
        <span class="btn-label">Add Product</span>
        <span class="btn-badge" id="add-badge" style="display: none;">✓</span>
      </button>
      <button class="widget-icon-btn" id="export-csv-btn" title="Export to CSV">
        <span class="btn-icon">📥</span>
        <span class="btn-label">Export CSV</span>
        <span class="btn-badge" id="export-count">0</span>
      </button>
      <button class="widget-icon-btn" id="clear-list-btn" title="Clear List">
        <span class="btn-icon">🗑️</span>
        <span class="btn-label">Clear List</span>
      </button>
      <button class="widget-icon-btn widget-upgrade-btn" id="upgrade-btn" title="Upgrade to PRO" style="display: none;">
        <span class="btn-icon">⭐</span>
        <span class="btn-label">Upgrade PRO</span>
      </button>
      <button class="widget-icon-btn widget-pro-badge" id="pro-badge-btn" title="PRO User" style="display: none;">
        <span class="btn-icon">👑</span>
        <span class="btn-label">PRO Member</span>
      </button>
      <button class="widget-info-btn" id="info-btn" title="About this widget">
        <span class="info-icon">ℹ️</span>
      </button>
      <button class="widget-expand-btn" id="expand-btn" title="Expand/Collapse">
        <span class="expand-icon">▶</span>
      </button>
    </div>
  `;

  // Create notification container (separate from widget)
  const notification = document.createElement('div');
  notification.id = 'scraper-notification';
  notification.className = 'scraper-notification';
  notification.style.display = 'none';

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #amazon-scraper-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .widget-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: white;
      border-radius: 16px;
      padding: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    }

    .widget-container.collapsed .btn-label {
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      margin: 0;
    }

    .widget-container.collapsed .widget-icon-btn {
      width: 48px;
      padding: 12px;
    }

    .widget-container.collapsed .expand-icon {
      transform: rotate(180deg);
    }

    .widget-icon-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 48px;
      position: relative;
      overflow: hidden;
    }

    .widget-icon-btn:hover {
      transform: translateX(-4px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .widget-icon-btn:active {
      transform: translateX(-2px);
    }

    .widget-icon-btn.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .widget-icon-btn.disabled:hover {
      transform: none;
      box-shadow: none;
    }

    .btn-icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .btn-label {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      max-width: 150px;
      opacity: 1;
      transition: all 0.3s ease;
      margin-right: auto;
    }

    .btn-badge {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .widget-upgrade-btn {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .widget-upgrade-btn:hover {
      box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
    }

    .widget-pro-badge {
      background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
      color: #333;
    }

    .widget-pro-badge:hover {
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
    }

    .widget-info-btn {
      background: #f5f5f5;
      color: #667eea;
      border: none;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
    }

    .widget-info-btn:hover {
      background: #e8e8e8;
      transform: scale(1.1);
    }

    .info-icon {
      font-size: 16px;
    }

    .widget-expand-btn {
      background: #f5f5f5;
      color: #667eea;
      border: none;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .widget-expand-btn:hover {
      background: #e8e8e8;
    }

    .expand-icon {
      font-size: 16px;
      transition: transform 0.3s ease;
    }

    /* Notification styles */
    .scraper-notification {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0;
      z-index: 999998;
      background: white;
      border-radius: 16px;
      padding: 24px 48px 24px 32px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      max-width: 500px;
      min-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      transition: all 0.3s ease;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .scraper-notification.show {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }

    .scraper-notification.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .scraper-notification.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .scraper-notification.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .notification-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .notification-message {
      flex: 1;
      line-height: 1.5;
    }

    .notification-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: inherit;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 50%;
    }

    .notification-close:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.05);
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .animating {
      animation: pulse 0.3s ease-in-out;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      #amazon-scraper-widget {
        bottom: 10px;
        right: 10px;
      }

      .scraper-notification {
        bottom: 10px;
        max-width: calc(100vw - 40px);
        min-width: auto;
      }

      .btn-label {
        font-size: 12px;
        max-width: 120px;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(widget);
  document.body.appendChild(notification);

  // Add click handlers
  document.getElementById('expand-btn').addEventListener('click', toggleExpand);
  document.getElementById('add-product-btn').addEventListener('click', handleAddProduct);
  document.getElementById('export-csv-btn').addEventListener('click', handleExportCSV);
  document.getElementById('clear-list-btn').addEventListener('click', handleClearList);
  document.getElementById('upgrade-btn').addEventListener('click', handleUpgrade);
  document.getElementById('pro-badge-btn').addEventListener('click', showProStatusModal);
  document.getElementById('info-btn').addEventListener('click', showInfoModal);

  // Check if product is already added and update widget
  checkIfProductAdded();
  
  // Update count and check user plan
  updateProductCount();
  checkUserPlan();
  
  // Check for updates and show notification
  checkForUpdates();
}

// Toggle widget expanded/collapsed state
function toggleExpand() {
  const container = document.getElementById('widget-container');
  container.classList.toggle('collapsed');
}

// Handle adding product
async function handleAddProduct() {
  const btn = document.getElementById('add-product-btn');
  
  // Check if already added
  const asin = getCurrentAsin();
  if (!asin) {
    showStatus('error', 'Could not detect product ASIN');
    return;
  }

  const marketplaceDomain = getMarketplaceDomain();
  chrome.storage.local.get(['gumroadLicenseKey', marketplaceDomain], async (data) => {
    const hasLicense = data.gumroadLicenseKey && data.gumroadLicenseKey.trim() !== '';
    const currentList = data[marketplaceDomain] || [];
    
    // Check if already added
    if (currentList.some(product => product.asin === asin)) {
      showStatus('info', 'Product already in your list!');
      return;
    }

    // Check free user limit (5 products)
    if (!hasLicense && currentList.length >= 5) {
      showStatus('error', 'As a free user you can add only 5 products at a time. Upgrade to PRO to export unlimited products!');
      return;
    }

    btn.classList.add('disabled');
    showStatus('info', 'Adding product...');

    try {
      // Send message to background script to add product
      chrome.runtime.sendMessage(
        { action: 'addProductFromPage' },
        (response) => {
          btn.classList.remove('disabled');
          
          if (chrome.runtime.lastError) {
            showStatus('error', 'Extension error. Please try again.');
            return;
          }

          if (response.success) {
            showStatus('success', 'Product added successfully!');
            updateProductCount();
            checkIfProductAdded();
          } else {
            showStatus('error', response.message || 'Failed to add product');
          }
        }
      );
    } catch (error) {
      console.error('Error adding product:', error);
      btn.classList.remove('disabled');
      showStatus('error', 'Failed to add product');
    }
  });
}

// Handle export to CSV
async function handleExportCSV() {
  const marketplaceDomain = getMarketplaceDomain();
  
  chrome.storage.local.get(marketplaceDomain, (data) => {
    const products = data[marketplaceDomain] || [];
    
    if (products.length === 0) {
      showStatus('info', 'No products to export');
      return;
    }

    try {
      const csv = convertToCSV(products);
      downloadCSV(csv, `${marketplaceDomain}_data_${Date.now()}.csv`);
      
      showStatus('success', `Exported ${products.length} products to CSV!`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showStatus('error', 'Failed to export CSV');
    }
  });
}

// Handle clear list
async function handleClearList() {
  // eslint-disable-next-line no-restricted-globals
  if (!confirm('Are you sure you want to clear all products from the list?')) {
    return;
  }

  const marketplaceDomain = getMarketplaceDomain();
  
  try {
    await chrome.storage.local.set({ [marketplaceDomain]: [] });
    showStatus('success', 'List cleared successfully!');
    updateProductCount();
    checkIfProductAdded();
  } catch (error) {
    console.error('Error clearing list:', error);
    showStatus('error', 'Failed to clear list');
  }
}

// Handle upgrade
function handleUpgrade() {
  // Create and show upgrade modal
  showUpgradeModal();
}

// Create and show upgrade modal
function showUpgradeModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('scraper-upgrade-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'scraper-upgrade-modal';
  modalOverlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Enter Gumroad License Key</h2>
        <button class="modal-close-btn" id="modal-close">✕</button>
      </div>
      
      <div class="modal-promo">
        <div class="promo-title">🚀 Upgrade to PRO & Unlock Everything!</div>
        <ul class="promo-list">
          <li>✅ Export <strong>UNLIMITED</strong> products</li>
          <li>✅ No daily limits on export</li>
          <li>✅ Faster exports</li>
          <li>✅ Free updates forever</li>
        </ul>
      </div>

      <div class="modal-body">
        <div class="input-group">
          <label for="license-input">License Key</label>
          <input 
            type="text" 
            id="license-input" 
            placeholder="Enter your Gumroad license key"
            autocomplete="off"
          />
        </div>

        <div class="info-box">
          <span>ℹ️</span>
          <div>
            Don't have a license? Purchase here 👉 
            <a href="https://amarindaz.gumroad.com/l/amazon-com-data-scraper?utm_source=extension&utm_medium=widget&utm_campaign=upgrade_modal" target="_blank" rel="noopener noreferrer" class="get-key-btn">
              Get Key 🔑
            </a>
          </div>
        </div>

        <div id="modal-message" class="modal-message" style="display: none;"></div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-validate" id="modal-validate">Validate</button>
      </div>
    </div>
  `;

  // Add modal styles
  const modalStyles = document.createElement('style');
  modalStyles.textContent = `
    #scraper-upgrade-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    .modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #333;
      flex: 1;
      text-align: center;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .modal-close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .modal-promo {
      background: #F7F9FC;
      margin: 20px 24px;
      padding: 20px;
      border-radius: 12px;
    }

    .promo-title {
      font-size: 16px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 12px;
      text-align: center;
    }

    .promo-list {
      list-style: none;
      list-style-type: none;
      padding: 0;
      margin: 0;
      text-align: left;
      padding: 0 100px;
    }

    .promo-list li {
      padding: 6px 0;
      font-size: 14px;
      color: #333;
      text-align: left;
      list-style: none;
      list-style-type: none;
    }

    .modal-body {
      padding: 0 24px 24px 24px;
    }

    .input-group {
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .input-group label {
      margin-bottom: 0;
      font-weight: 600;
      color: #333;
      font-size: 14px;
      white-space: nowrap;
      min-width: 90px;
    }

    .input-group input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .input-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .info-box {
      display: flex;
      gap: 12px;
      background: #e3f2fd;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #0c5460;
      margin-bottom: 16px;
      align-items: center;
    }

    .info-box > div {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .get-key-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white !important;
      text-decoration: none;
      font-weight: 700;
      padding: 8px 20px;
      border-radius: 8px;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
      -webkit-background-clip: unset;
      -webkit-text-fill-color: white;
      background-clip: unset;
    }

    .get-key-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 87, 108, 0.5);
      text-decoration: none;
    }

    .get-key-btn:active {
      transform: translateY(0);
    }

    .modal-message {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .modal-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .modal-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    .modal-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .modal-btn-cancel {
      background: #f5f5f5;
      color: #666;
    }

    .modal-btn-cancel:hover {
      background: #e0e0e0;
    }

    .modal-btn-validate {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-btn-validate:hover {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .modal-btn-validate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .modal-btn-validate.loading {
      position: relative;
      color: transparent;
    }

    .modal-btn-validate.loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border: 2px solid white;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `;

  document.head.appendChild(modalStyles);
  document.body.appendChild(modalOverlay);

  // Event listeners
  const closeModal = () => {
    modalOverlay.remove();
    modalStyles.remove();
  };

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  // Validate license
  document.getElementById('modal-validate').addEventListener('click', async () => {
    const licenseInput = document.getElementById('license-input');
    const license = licenseInput.value.trim();
    const validateBtn = document.getElementById('modal-validate');
    const messageDiv = document.getElementById('modal-message');

    if (!license) {
      messageDiv.textContent = 'Please enter a valid license key';
      messageDiv.className = 'modal-message error';
      messageDiv.style.display = 'block';
      return;
    }

    // Show loading state
    validateBtn.disabled = true;
    validateBtn.classList.add('loading');
    validateBtn.textContent = 'Validating...';
    messageDiv.style.display = 'none';

    try {
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: 'UhZmvPhcwxwGkMb9S3dW5A==',
          license_key: license,
        }),
      };

      const response = await fetch(
        'https://api.gumroad.com/v2/licenses/verify',
        requestOptions
      );

      if (response.status === 200) {
        await response.json();
        // Store license locally
        await chrome.storage.local.set({ 
          gumroadLicenseKey: license
        });
        
        messageDiv.textContent = 'License verified successfully! PRO features unlocked.';
        messageDiv.className = 'modal-message success';
        messageDiv.style.display = 'block';

        // Update UI - hide upgrade button and show PRO badge
        checkUserPlan();

        // Close modal after 2 seconds
        setTimeout(() => {
          closeModal();
          showStatus('success', 'Upgraded to PRO! Enjoy unlimited exports.');
        }, 2000);
      } else {
        messageDiv.textContent = 'Invalid license key. Please check your license key.';
        messageDiv.className = 'modal-message error';
        messageDiv.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      messageDiv.textContent = 'Something went wrong. Please check your license key.';
      messageDiv.className = 'modal-message error';
      messageDiv.style.display = 'block';
    } finally {
      validateBtn.disabled = false;
      validateBtn.classList.remove('loading');
      validateBtn.textContent = 'Validate';
    }
  });

  // Focus on input
  setTimeout(() => {
    document.getElementById('license-input').focus();
  }, 100);
}

// Show PRO status modal for paid users
function showProStatusModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('scraper-pro-status-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'scraper-pro-status-modal';
  modalOverlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content pro-status-content">
      <div class="modal-header">
        <h2>👑 PRO Member Status</h2>
        <button class="modal-close-btn" id="pro-modal-close">✕</button>
      </div>
      
      <div class="modal-body pro-status-body">
        <div class="pro-status-icon">
          <div class="crown-animation">👑</div>
        </div>
        
        <h3 class="pro-status-title">You're on the PRO Plan!</h3>
        <p class="pro-status-subtitle">Enjoying all premium features</p>

        <div class="pro-features-grid">
          <div class="pro-feature-item">
            <span class="feature-icon">✅</span>
            <span class="feature-text">Unlimited Exports</span>
          </div>
          <div class="pro-feature-item">
            <span class="feature-icon">✅</span>
            <span class="feature-text">No Daily Limits</span>
          </div>
          <div class="pro-feature-item">
            <span class="feature-icon">✅</span>
            <span class="feature-text">Priority Support</span>
          </div>
          <div class="pro-feature-item">
            <span class="feature-icon">✅</span>
            <span class="feature-text">Free Updates</span>
          </div>
        </div>

        <div class="pro-status-footer">
          <p>Thank you for being a PRO member! 🎉</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="pro-modal-ok">Got it!</button>
      </div>
    </div>
  `;

  // Add modal styles
  const modalStyles = document.createElement('style');
  modalStyles.textContent = `
    #scraper-pro-status-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    #scraper-pro-status-modal .modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    #scraper-pro-status-modal .modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    #scraper-pro-status-modal .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    #scraper-pro-status-modal .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #333;
    }

    #scraper-pro-status-modal .modal-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
      border-radius: 4px;
      transition: all 0.2s;
    }

    #scraper-pro-status-modal .modal-close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    #scraper-pro-status-modal .modal-body {
      padding: 24px;
    }

    #scraper-pro-status-modal .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    #scraper-pro-status-modal .modal-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .pro-status-content {
      max-width: 450px;
    }

    .pro-status-body {
      text-align: center;
      padding: 32px 24px !important;
    }

    .pro-status-icon {
      margin-bottom: 24px;
    }

    .crown-animation {
      font-size: 64px;
      animation: crownBounce 1s ease infinite;
      display: inline-block;
    }

    @keyframes crownBounce {
      0%, 100% { transform: translateY(0) rotate(-5deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    .pro-status-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .pro-status-subtitle {
      font-size: 16px;
      color: #666;
      margin: 0 0 32px 0;
    }

    .pro-features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }

    .pro-feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f7f9fc;
      border-radius: 8px;
      font-size: 14px;
      color: #333;
    }

    .feature-icon {
      font-size: 18px;
    }

    .feature-text {
      font-weight: 600;
    }

    .pro-status-footer {
      background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
      padding: 16px;
      border-radius: 12px;
      margin-top: 24px;
    }

    .pro-status-footer p {
      margin: 0;
      color: #333;
      font-weight: 600;
      font-size: 15px;
    }

    .modal-btn-primary {
      background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
      color: #333;
      width: 100%;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 700;
    }

    .modal-btn-primary:hover {
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
      transform: translateY(-1px);
    }
  `;

  document.head.appendChild(modalStyles);
  document.body.appendChild(modalOverlay);

  // Event listeners
  const closeModal = () => {
    modalOverlay.remove();
    modalStyles.remove();
  };

  document.getElementById('pro-modal-close').addEventListener('click', closeModal);
  document.getElementById('pro-modal-ok').addEventListener('click', closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
}

// Show info modal about the widget
function showInfoModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('scraper-info-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'scraper-info-modal';
  modalOverlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content info-modal-content">
      <div class="modal-header">
        <h2>ℹ️ About This Widget</h2>
        <button class="modal-close-btn" id="info-modal-close">✕</button>
      </div>
      
      <div class="modal-body info-modal-body">
        <div class="info-widget-icon">
          <span style="font-size: 48px;">🛒</span>
        </div>
        
        <h3 class="info-title">Amazon Product Scraper</h3>
        <p class="info-subtitle">Chrome Extension Widget</p>

        <div class="info-description">
          <p>This floating widget helps you quickly scrape and export Amazon product data while browsing product pages.</p>
          
          <div class="info-features">
            <div class="info-feature">
              <span class="feature-bullet">•</span>
              <span>Add products to your export list with one click</span>
            </div>
            <div class="info-feature">
              <span class="feature-bullet">•</span>
              <span>Export collected data to CSV format</span>
            </div>
            <div class="info-feature">
              <span class="feature-bullet">•</span>
              <span>Manage products across different Amazon marketplaces</span>
            </div>
            <div class="info-feature">
              <span class="feature-bullet">•</span>
              <span>Upgrade to PRO for unlimited exports</span>
            </div>
          </div>

          <div class="info-tip">
            <strong>💡 Tip:</strong> Click the expand/collapse button (▶) to minimize the widget while browsing.
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="info-modal-ok">Got it!</button>
      </div>
    </div>
  `;

  // Add modal styles
  const modalStyles = document.createElement('style');
  modalStyles.textContent = `
    #scraper-info-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    #scraper-info-modal .modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    #scraper-info-modal .modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    #scraper-info-modal .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    #scraper-info-modal .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #333;
      flex: 1;
      text-align: center;
    }

    #scraper-info-modal .modal-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
      border-radius: 4px;
      transition: all 0.2s;
    }

    #scraper-info-modal .modal-close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    #scraper-info-modal .modal-body {
      padding: 24px;
    }

    #scraper-info-modal .modal-footer {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    #scraper-info-modal .modal-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .info-modal-body {
      text-align: center;
    }

    .info-widget-icon {
      margin-bottom: 16px;
    }

    .info-title {
      font-size: 22px;
      font-weight: 700;
      color: #333;
      margin: 0 0 4px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .info-subtitle {
      font-size: 14px;
      color: #666;
      margin: 0 0 24px 0;
      font-weight: 500;
    }

    .info-description {
      text-align: left;
    }

    .info-description > p {
      font-size: 15px;
      line-height: 1.6;
      color: #555;
      margin: 0 0 20px 0;
    }

    .info-features {
      background: #f7f9fc;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .info-feature {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
      font-size: 14px;
      color: #333;
      line-height: 1.5;
    }

    .feature-bullet {
      color: #667eea;
      font-weight: bold;
      font-size: 18px;
      flex-shrink: 0;
    }

    .info-tip {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
      color: #856404;
      line-height: 1.5;
    }

    .info-tip strong {
      color: #664d03;
    }

    #scraper-info-modal .modal-btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 32px;
      font-size: 16px;
      font-weight: 700;
    }

    #scraper-info-modal .modal-btn-primary:hover {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transform: translateY(-1px);
    }
  `;

  document.head.appendChild(modalStyles);
  document.body.appendChild(modalOverlay);

  // Event listeners
  const closeModal = () => {
    modalOverlay.remove();
    modalStyles.remove();
  };

  document.getElementById('info-modal-close').addEventListener('click', closeModal);
  document.getElementById('info-modal-ok').addEventListener('click', closeModal);
  const backdrop = modalOverlay.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeModal);
  }
}

// Check for extension updates and show notification
function checkForUpdates() {
  chrome.runtime.sendMessage({ action: 'checkForUpdates' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error checking for updates:', chrome.runtime.lastError);
      return;
    }
    
    if (response.showWelcome) {
      showWelcomeNotification(response.version);
    } else if (response.showUpdateNotification) {
      showUpdateNotification(response.version);
    }
  });
}

// Show welcome notification for new installs
function showWelcomeNotification(version) {
  setTimeout(() => {
    const notification = document.createElement('div');
    notification.id = 'extension-update-notification';
    notification.innerHTML = `
      <div class="update-notification-content">
        <div class="update-header">
          <span class="update-icon">🎉</span>
          <h3>Welcome to Amazon Product Scraper!</h3>
          <button class="update-close-btn" id="update-close">✕</button>
        </div>
        <div class="update-body">
          <p><strong>Version ${version}</strong></p>
          <p>Thank you for installing! Here's what you can do:</p>
          <ul>
            <li>✅ <strong>Floating Widget</strong> - Quick access on every product page</li>
            <li>✅ <strong>One-Click Export</strong> - Add products instantly to your list</li>
            <li>✅ <strong>CSV Export</strong> - Download all data in one click</li>
            <li>✅ <strong>Multi-Marketplace</strong> - Works across all Amazon sites</li>
          </ul>
          <p class="update-footer">Click the widget on the right to get started! →</p>
        </div>
      </div>
    `;
    
    addUpdateNotificationStyles();
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Close button handler
    document.getElementById('update-close').addEventListener('click', () => {
      dismissUpdateNotification(notification);
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (document.getElementById('extension-update-notification')) {
        dismissUpdateNotification(notification);
      }
    }, 10000);
  }, 2000); // Show after 2 seconds to let page load
}

// Show update notification
function showUpdateNotification(version) {
  setTimeout(() => {
    const notification = document.createElement('div');
    notification.id = 'extension-update-notification';
    notification.innerHTML = `
      <div class="update-notification-content">
        <div class="update-header">
          <span class="update-icon">🚀</span>
          <h3>Extension Updated!</h3>
          <button class="update-close-btn" id="update-close">✕</button>
        </div>
        <div class="update-body">
          <p><strong>Version ${version}</strong></p>
          <p>What's new:</p>
          <ul>
            <li>🎨 <strong>New Floating Widget</strong> - Redesigned with better UX</li>
            <li>ℹ️ <strong>Info Button</strong> - Learn about features anytime</li>
            <li>🔄 <strong>Auto License Validation</strong> - Seamless PRO experience</li>
            <li>✨ <strong>Improved Styling</strong> - Modern gradient buttons</li>
            <li>🐛 <strong>Bug Fixes</strong> - Enhanced stability and performance</li>
          </ul>
          <p class="update-footer">Check out the widget on the right! →</p>
        </div>
      </div>
    `;
    
    addUpdateNotificationStyles();
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Close button handler
    document.getElementById('update-close').addEventListener('click', () => {
      dismissUpdateNotification(notification);
    });
    
    // Auto-dismiss after 12 seconds
    setTimeout(() => {
      if (document.getElementById('extension-update-notification')) {
        dismissUpdateNotification(notification);
      }
    }, 12000);
  }, 2000); // Show after 2 seconds to let page load
}

// Dismiss update notification
function dismissUpdateNotification(notification) {
  notification.classList.remove('show');
  setTimeout(() => {
    notification.remove();
  }, 300);
  
  // Mark as dismissed in storage
  chrome.runtime.sendMessage({ action: 'dismissUpdateNotification' });
}

// Add styles for update notification
function addUpdateNotificationStyles() {
  // Check if styles already added
  if (document.getElementById('update-notification-styles')) {
    return;
  }
  
  const styles = document.createElement('style');
  styles.id = 'update-notification-styles';
  styles.textContent = `
    #extension-update-notification {
      position: fixed;
      bottom: 100px;
      right: 100px;
      z-index: 999997;
      max-width: 400px;
      width: calc(100vw - 40px);
      opacity: 0;
      transform: translateX(450px);
      transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    #extension-update-notification.show {
      opacity: 1;
      transform: translateX(0);
    }
    
    .update-notification-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      border: 2px solid #667eea;
    }
    
    .update-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    
    .update-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .update-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      flex: 1;
    }
    
    .update-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
      line-height: 1;
    }
    
    .update-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .update-body {
      padding: 20px;
    }
    
    .update-body p {
      margin: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    
    .update-body ul {
      margin: 12px 0;
      padding-left: 0;
      list-style: none;
    }
    
    .update-body li {
      padding: 6px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    
    .update-footer {
      margin-top: 16px !important;
      font-weight: 600;
      color: #667eea !important;
      font-size: 15px !important;
    }
    
    @media (max-width: 768px) {
      #extension-update-notification {
        bottom: 80px;
        right: 10px;
        max-width: calc(100vw - 20px);
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// Show status message in notification
function showStatus(type, message) {
  const notification = document.getElementById('scraper-notification');
  
  // Set notification icon based on type
  let icon = '';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'info') icon = 'ℹ️';
  
  notification.innerHTML = `
    <span class="notification-icon">${icon}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.classList.remove('show')">✕</button>
  `;
  
  notification.className = `scraper-notification ${type} show`;
  notification.style.display = 'flex';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300);
  }, 5000);
}

// Validate license with Gumroad API
async function validateLicense() {
  const storage = await chrome.storage.local.get('gumroadLicenseKey');
  const license = storage.gumroadLicenseKey;

  if (!license) {
    return false;
  }

  // If license exists, verify it's valid
  try {
    const response = await fetch(
      'https://api.gumroad.com/v2/licenses/verify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: 'UhZmvPhcwxwGkMb9S3dW5A==',
          license_key: license,
        }),
      }
    );

    if (response.status === 200) {
      const data = await response.json();

      if (data.success && data.purchase) {
        const p = data.purchase;

        // Determine if user is actively paying
        const active =
          !p.refunded &&
          !p.disputed &&
          !(p.subscription_ended_at || p.subscription_failed_at);

        // If not active, remove the license key
        if (!active) {
          await chrome.storage.local.remove('gumroadLicenseKey');
          return false;
        }
        
        return true;
      } else {
        // Invalid license, remove it
        await chrome.storage.local.remove('gumroadLicenseKey');
        return false;
      }
    } else {
      // Failed validation, remove the license key
      await chrome.storage.local.remove('gumroadLicenseKey');
      return false;
    }
  } catch (err) {
    console.error('License validation failed:', err);
    return false;
  }
}

// Check user plan and show/hide upgrade button
async function checkUserPlan() {
  // First validate the license
  const isValid = await validateLicense();
  
  const upgradeBtn = document.getElementById('upgrade-btn');
  const proBadgeBtn = document.getElementById('pro-badge-btn');
  
  // Show PRO badge only if license is valid
  if (!isValid) {
    upgradeBtn.style.display = 'flex';
    proBadgeBtn.style.display = 'none';
  } else {
    upgradeBtn.style.display = 'none';
    proBadgeBtn.style.display = 'flex';
  }
}

// Get the current marketplace domain
function getMarketplaceDomain() {
  const match = window.location.hostname.match(/amazon\.([a-z.]+)/i);
  return match ? `amazon.${match[1]}` : 'amazon.com';
}

// Get ASIN from current page
function getCurrentAsin() {
  const url = window.location.href;
  
  // Try URL patterns: /dp/ or /gp/product/
  let match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (match) return match[1];
  
  // Try pd_rd_i parameter (for variant products)
  match = url.match(/[?&]pd_rd_i=([A-Z0-9]{10})/i);
  if (match) return match[1];
  
  // Try th parameter (for variant selection)
  match = url.match(/[?&]th=([A-Z0-9]{10})/i);
  if (match) return match[1];
  
  // Fallback: try to find ASIN in page DOM
  const asinElement = document.querySelector('[data-asin]');
  if (asinElement && asinElement.getAttribute('data-asin')) {
    const asin = asinElement.getAttribute('data-asin');
    if (asin && asin.length === 10) return asin;
  }
  
  // Try ASIN input field
  const asinInput = document.querySelector('#ASIN');
  if (asinInput && asinInput.value) {
    return asinInput.value;
  }
  
  return null;
}

// Check if current product is already added
async function checkIfProductAdded() {
  try {
    const asin = getCurrentAsin();
    if (!asin) return;

    const marketplaceDomain = getMarketplaceDomain();
    chrome.storage.local.get(marketplaceDomain, (data) => {
      const productList = data[marketplaceDomain] || [];
      const isAdded = productList.some(product => product.asin === asin);
      
      const addBtn = document.getElementById('add-product-btn');
      const addBadge = document.getElementById('add-badge');
      if (!addBtn) return;
      
      const addLabel = addBtn.querySelector('.btn-label');
      const addIcon = addBtn.querySelector('.btn-icon');
      
      if (isAdded) {
        addLabel.textContent = 'Already Added';
        addIcon.textContent = '✓';
        addBadge.style.display = 'block';
        addBtn.classList.add('disabled');
      } else {
        addLabel.textContent = 'Add Product';
        addIcon.textContent = '➕';
        addBadge.style.display = 'none';
        addBtn.classList.remove('disabled');
      }
    });
  } catch (error) {
    console.error('Error checking product status:', error);
  }
}

// Update product count badge
async function updateProductCount() {
  try {
    const marketplaceDomain = getMarketplaceDomain();
    chrome.storage.local.get(marketplaceDomain, (data) => {
      const count = (data[marketplaceDomain] || []).length;
      const countElement = document.getElementById('export-count');
      
      if (countElement) {
        countElement.textContent = count;
        if (count > 0) {
          countElement.style.display = 'block';
        } else {
          countElement.style.display = 'block'; // Always show, even if 0
        }
      }
    });
  } catch (error) {
    console.error('Error updating count:', error);
  }
}

// Check if we're on a product page
function isProductPage() {
  const url = window.location.href;
  // Amazon product pages typically have /dp/ or /gp/product/ in the URL
  // Also check for pd_rd_i parameter which indicates a product page with variants
  return url.includes('/dp/') || url.includes('/gp/product/') || url.includes('pd_rd_i=');
}

// Initialize widget when page loads
function init() {
  if (isProductPage()) {
    createWidget();
  }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle dynamic navigation (for single-page app behavior)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Remove old widget if exists
    const oldWidget = document.getElementById('amazon-scraper-widget');
    if (oldWidget) {
      oldWidget.remove();
    }
    // Create new widget if on product page
    if (isProductPage()) {
      setTimeout(init, 500); // Small delay for page to stabilize
    }
  }
}).observe(document, { subtree: true, childList: true });

// Listen for storage changes to update count
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    const marketplaceDomain = getMarketplaceDomain();
    if (changes[marketplaceDomain]) {
      updateProductCount();
      checkIfProductAdded();
    }
  }
});
