/* global chrome */

const FREE_LIMIT = 5;
const CURRENT_VERSION = '2.0.0';

// Listen for extension install or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time install
    chrome.storage.local.set({ 
      extensionVersion: CURRENT_VERSION,
      showWelcome: true 
    });
  } else if (details.reason === 'update') {
    // Extension updated
    const previousVersion = details.previousVersion;
    chrome.storage.local.set({ 
      extensionVersion: CURRENT_VERSION,
      showUpdateNotification: true,
      previousVersion: previousVersion
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addProductFromPage') {
    handleAddProduct(sender.tab.id)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ success: false, message: error.message });
      });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'checkForUpdates') {
    chrome.storage.local.get(['showWelcome', 'showUpdateNotification'], (data) => {
      sendResponse({
        showWelcome: data.showWelcome || false,
        showUpdateNotification: data.showUpdateNotification || false,
        version: CURRENT_VERSION
      });
    });
    return true;
  }
  
  if (request.action === 'dismissUpdateNotification') {
    chrome.storage.local.set({ 
      showWelcome: false,
      showUpdateNotification: false 
    });
    sendResponse({ success: true });
    return true;
  }
});

// Get the marketplace domain from URL
function getMarketplaceDomain(url) {
  const match = url.match(/amazon\.([a-z.]+)/i);
  return match ? `amazon.${match[1]}` : 'amazon.com';
}

// Handle adding product from the current page
async function handleAddProduct(tabId) {
  try {
    // Get the tab URL to determine marketplace
    const tab = await chrome.tabs.get(tabId);
    const marketplaceDomain = getMarketplaceDomain(tab.url);
    
    // Check if user has a valid license
    const storage = await chrome.storage.local.get(['gumroadLicenseKey', marketplaceDomain]);
    const hasLicense = storage.gumroadLicenseKey && storage.gumroadLicenseKey.trim() !== '';
    let currentList = storage[marketplaceDomain] || [];

    // Check free plan limit
    if (!hasLicense && currentList.length >= FREE_LIMIT) {
      return {
        success: false,
        message: `As a free user you can add only ${FREE_LIMIT} products at a time. Upgrade to PRO to export unlimited products!`
      };
    }

    // Execute scraper on the active tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: getAmazonData,
    });

    const product = results[0].result;

    if (!product || !product.asin) {
      return {
        success: false,
        message: 'Could not extract product data. Make sure you\'re on a product page.'
      };
    }

    // Check for duplicates
    if (currentList.some((item) => item.asin === product.asin)) {
      return {
        success: false,
        message: 'Product already in your list!'
      };
    }

    // Add product to list
    currentList.push(product);
    await chrome.storage.local.set({ [marketplaceDomain]: currentList });

    return {
      success: true,
      message: `Added! (${currentList.length} products)`,
      count: currentList.length
    };
  } catch (error) {
    console.error('Error in handleAddProduct:', error);
    return {
      success: false,
      message: 'Failed to add product. Please try again.'
    };
  }
}

// Amazon scraper function (executed in page context)
// This uses the same selectors as src/utils/amazonScraper.js
function getAmazonData() {
  // Helper functions
  const getActivePrice = () => {
    const selectors = [
      ".priceToPay",
      "#corePrice_desktop",
      "#corePriceDisplay_desktop_feature_div",
      "li .a-button-selected .twister_swatch_price .olpWrapper",
      ".a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      ".a-price-whole"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }

    return "";
  };

  const getText = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : '';
  };

  const getAllText = (selector) => {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(el => {
      // Clone the element to avoid modifying the original
      const clone = el.cloneNode(true);
      // Remove script tags and their content
      const scripts = clone.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      return clone.innerText.trim();
    }).filter(text => text.length > 0).join(' | ');
  };

  // Extract ASIN from URL or page
  const getAsin = () => {
    // Try URL first
    const url = window.location.href;
    
    // Try URL patterns: /dp/ or /gp/product/
    let match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (match) return match[1];
    
    // Try pd_rd_i parameter (for variant products)
    match = url.match(/[?&]pd_rd_i=([A-Z0-9]{10})/i);
    if (match) return match[1];
    
    // Try data-asin attribute
    const asinElement = document.querySelector('[data-asin]');
    if (asinElement && asinElement.getAttribute('data-asin')) {
      const asin = asinElement.getAttribute('data-asin');
      if (asin && asin.length === 10) return asin;
    }

    // Try ASIN input field
    const asinInput = document.querySelector("#ASIN");
    if (asinInput && asinInput.value) {
      return asinInput.value;
    }

    return '';
  };

  return {
    title: getText("#productTitle"),
    asin: getAsin(),
    url: window.location.href,
    wholePriceBlockText: getActivePrice(),
    availability: getText("#availability span"),
    avgCustomerReviews: getText('span[data-hook="rating-out-of-text"]') || getText("#acrPopover"),
    merchantInfo: getText("#merchantInfoFeature_feature_div") || getText("#merchant-info"),
    storeLinkText: getText("#bylineInfo"),
    productDescription: getText("#productDescription"),
    additionalInfo: getText("#important-information") || getText("#aplus"),
    productOverview: getAllText("#productOverview_feature_div tr") || getText("#feature-bullets"),
    productInformation: getAllText(".a-keyvalue prodDetTable") || getText("#productDetails_techSpec_section_1"),
    techSpec: getAllText("#technicalSpecifications_section_1 tr") || getText("#productDetails_detailBullets_sections1"),
    productDetails: getAllText("#detailBullets_feature_div li") || getText("#detailBullets_feature_div, #detailBulletsWrapper_feature_div"),
    aboutProduct: getAllText("#feature-bullets li") || getText("#aplus"),
    timestamp: new Date().toISOString()
  };
}
