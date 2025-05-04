// Notification manager to handle multiple notifications
const NotificationManager = {
  notifications: [],
  topOffset: 20, // Initial top position
  gap: 10, // Gap between notifications
  
  // Create a new notification
  show(message, isWarning = false) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: ${this.topOffset}px;
      right: 20px;
      background: ${isWarning ? '#f44336' : '#4caf50'};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    
    // Add message text
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    notification.appendChild(messageDiv);
    
    // Add to the page
    document.body.appendChild(notification);
    
    // Calculate height and add to the array
    const notificationHeight = notification.offsetHeight;
    const notificationObj = {
      element: notification,
      height: notificationHeight,
      id: Date.now() // Unique identifier
    };
    
    // Add to array and update positions
    this.notifications.push(notificationObj);
    this.updatePositions();
    
    return {
      id: notificationObj.id,
      element: notification,
      close: () => this.close(notificationObj.id),
      update: (newMessage) => {
        messageDiv.textContent = newMessage;
      },
      setColor: (color) => {
        notification.style.backgroundColor = color;
      }
    };
  },
  
  // Close a notification by ID
  close(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index >= 0) {
      const notification = this.notifications[index];
      
      // Animate opacity
      notification.element.style.opacity = '0';
      
      // Remove from DOM after animation
      setTimeout(() => {
        notification.element.remove();
        this.notifications.splice(index, 1);
        this.updatePositions(); // Reposition remaining notifications
      }, 300);
    }
  },
  
  // Update the positions of all notifications
  updatePositions() {
    let currentTop = this.topOffset;
    
    this.notifications.forEach(notification => {
      notification.element.style.top = currentTop + 'px';
      currentTop += notification.height + this.gap;
    });
  }
};

// RecommendationStorage system to store and manage recommendation history
const RecommendationStorage = {
  recommendations: [],
  maxRecommendations: 50, // Maximum number of recommendations to store
  
  // Add a new recommendation to storage
  add(recommendation) {
    // Format recommendation with timestamp if not already present
    const formattedRecommendation = {
      ...recommendation,
      timestamp: recommendation.timestamp || new Date().getTime(),
      id: recommendation.id || Date.now() + Math.random().toString(36).substring(2, 9)
    };
    
    // Add to beginning of array (newest first)
    this.recommendations.unshift(formattedRecommendation);
    
    // Trim array if it exceeds maximum length
    if (this.recommendations.length > this.maxRecommendations) {
      this.recommendations.pop();
    }
    
    // Save to chrome.storage
    chrome.storage.local.set({ 'storedRecommendations': this.recommendations });
    
    return formattedRecommendation;
  },
  
  // Load recommendations from storage
  load(callback) {
    chrome.storage.local.get(['storedRecommendations'], (result) => {
      if (result.storedRecommendations) {
        this.recommendations = result.storedRecommendations;
      }
      if (callback && typeof callback === 'function') {
        callback(this.recommendations);
      }
    });
  },
  
  // Clear all recommendations
  clear() {
    this.recommendations = [];
    chrome.storage.local.remove('storedRecommendations');
  },
  
  // Get all recommendations
  getAll() {
    return this.recommendations;
  },
  
  // Get recommendation by ID
  getById(id) {
    return this.recommendations.find(r => r.id === id);
  }
};

// Load stored recommendations when script initializes
RecommendationStorage.load();

// Helper function to show non-blocking notifications
function showNotification(message, isWarning = false) {
  return NotificationManager.show(message, isWarning);
}

// Helper function to create expandable recommendation notifications
function showExpandableRecommendation(recommendation, category) {
  // Determine color based on exact category names
  let categoryColor = '#757575'; // Default gray for neutral or unknown categories
  let categoryIcon = '🔍'; // Default icon
  let isWarning = false;
  
  // Normalize category by trimming and converting to lowercase
  const normalizedCategory = category.toLowerCase().trim();
  
  if (normalizedCategory === 'compulsive purchase') {
    categoryColor = '#f44336'; // Red for compulsive
    categoryIcon = '⚠️';
    isWarning = true; // Mark as warning for compulsive purchases
  } else if (normalizedCategory === 'adequate purchase') {
    categoryColor = '#4caf50'; // Green for correct/adequate
    categoryIcon = '✅';
  } else if (normalizedCategory === 'neutral purchase') {
    categoryColor = '#757575'; // Gray for neutral
    categoryIcon = '🔍';
  }
  
  // Create notification element with the appropriate color directly
  const notification = showNotification(`${categoryIcon} ${recommendation.substring(0, 50)}${recommendation.length > 50 ? '...' : ''}`, isWarning);
  
  // Make sure the correct color is set regardless of warning status
  notification.setColor(categoryColor);
  
  // Create expandable container for full recommendation
  const expandableContainer = document.createElement('div');
  expandableContainer.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    margin-top: 5px;
  `;
  
  // Create full text element
  const fullText = document.createElement('div');
  fullText.style.cssText = `
    padding: 10px 5px;
    font-size: 13px;
    line-height: 1.4;
  `;
  fullText.textContent = recommendation;
  expandableContainer.appendChild(fullText);
  
  // Add to notification
  notification.element.appendChild(expandableContainer);
  
  // Add category label
  const categoryLabel = document.createElement('div');
  categoryLabel.style.cssText = `
    font-weight: bold;
    margin-top: 8px;
    text-align: right;
    font-size: 12px;
    color: ${categoryColor === '#757575' ? 'white' : 'rgba(255,255,255,0.9)'};
  `;
  categoryLabel.textContent = `Categoría: ${category}`;
  notification.element.appendChild(categoryLabel);
  
  // Add click toggle behavior
  let isExpanded = false;
  notification.element.style.cursor = 'pointer';
  notification.element.addEventListener('click', (e) => {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      expandableContainer.style.maxHeight = `${fullText.offsetHeight + 20}px`;
    } else {
      expandableContainer.style.maxHeight = '0';
    }
    
    // Prevent click from closing the notification
    e.stopPropagation();
  });
  
  // Store the recommendation with the proper category name
  const storedRec = RecommendationStorage.add({
    recommendation: recommendation,
    category: category,
    color: categoryColor,
    icon: categoryIcon,
    timestamp: new Date().getTime()
  });
  
  // Add a close button that won't trigger expand
  const closeButton = document.createElement('div');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 5px;
    right: 10px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    color: white;
    opacity: 0.7;
    transition: opacity 0.2s;
  `;
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.opacity = '1';
  });
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.opacity = '0.7';
  });
  closeButton.addEventListener('click', (e) => {
    notification.close();
    e.stopPropagation();
  });
  notification.element.appendChild(closeButton);
  
  return {
    notification,
    expandableContainer,
    storedId: storedRec.id
  };
}

// Helper function to add a progress bar to a notification
function addProgressBar(notification) {
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    width: 100%;
    height: 6px;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    overflow: hidden;
  `;
  
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    width: 0%;
    background-color: white;
    border-radius: 3px;
    transition: width 0.3s linear;
  `;
  
  progressContainer.appendChild(progressBar);
  notification.element.appendChild(progressContainer);
  
  return {
    update: (percent) => {
      progressBar.style.width = `${percent}%`;
    },
    complete: () => {
      progressBar.style.width = '100%';
    }
  };
}

// Helper function to add a loading spinner to a notification
function addLoadingSpinner(notification) {
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 10px;
    align-self: center;
  `;
  
  // Add keyframes for the spinner animation
  if (!document.getElementById('spinnerAnimation')) {
    const style = document.createElement('style');
    style.id = 'spinnerAnimation';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create a wrapper for spinner and text
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: flex;
    align-items: center;
  `;
  
  wrapper.appendChild(spinner);
  
  // Move the text inside the wrapper
  const textDiv = notification.element.querySelector('div:first-child');
  if (textDiv) {
    wrapper.appendChild(textDiv);
    notification.element.prepend(wrapper);
  } else {
    notification.element.prepend(wrapper);
  }
  
  return {
    remove: () => spinner.remove()
  };
}

function listenForNewTransaction(description) {
  console.log("Iniciando monitoreo de nuevas transacciones...");
  
  const eventSource = new EventSource('http://127.0.0.1:8000/stream-transactions');

  eventSource.onmessage = function(event) {
    const transaction = JSON.parse(event.data);
    console.log('Nueva transacción detectada:', transaction);

    // Actualizar la transacción con la descripción proporcionada
    fetch(`http://127.0.0.1:8000/update-transaction/${transaction._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Transacción actualizada correctamente con descripción:', data);
          // La conexión SSE se cerrará automáticamente porque el servidor termina el generador
        } else {
          console.error('Error al actualizar la transacción:', data);
        }
      })
      .catch(error => console.error('Error al actualizar la transacción:', error));
  };

  eventSource.onerror = function(error) {
    console.log('Conexión SSE cerrada o error detectado');
    // La conexión puede cerrarse por:
    // 1. Error genuino
    // 2. Finalización normal después de procesar una transacción
    eventSource.close();
  };
}

function checkFraud(url) {
  // Create notification with loading spinner
  const notification = showNotification('Checking for fraud...', false);
  const spinner = addLoadingSpinner(notification);
  
  // Create a URL-safe key for storage
  const urlKey = encodeURIComponent(url);
  
  // Store URL and checking state in chrome.storage
  chrome.storage.local.set({
    'currentUrl': url,
    'lastCheckedUrl': url,
    [`fraudCheck_${urlKey}`]: {
      url: url,
      status: 'checking',
      timestamp: new Date().getTime()
    },
    // Also store a reference to the currently checked URL
    'lastFraudCheck': {
      url: url,
      status: 'checking',
      timestamp: new Date().getTime()
    }
  });
  
  fetch('http://127.0.0.1:8000/check-fraud', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  })
    .then(response => response.json())
    .then(data => {
      // Remove spinner when complete
      spinner.remove();
      
      // Format URL for display
      const displayUrl = new URL(url).hostname;
      
      // Create result object
      const resultObject = {
        url: url,
        displayUrl: displayUrl,
        status: 'complete',
        isFraudulent: data.isFraudulent,
        stats: data.stats || {},
        timestamp: new Date().getTime(),
        message: data.isFraudulent ? 
          `<span style="color: #f44336; font-weight: bold; font-size: 18px;">SHOPPING CART IS NOT SAFE</span><br><br><span style="font-weight: bold;">URL:</span> ${displayUrl}<br><br>This website has been flagged for potential fraud. We recommend you do not proceed with your purchase.` : 
          `<span style="color: #4caf50; font-weight: bold; font-size: 18px;">SHOPPING CART SAFE</span><br><br><span style="font-weight: bold;">URL:</span> ${displayUrl}<br><br>This shopping cart has passed our security checks. You may proceed with your purchase.`,
        icon: data.isFraudulent ? '⚠️' : '✅',
        purchaseRecommended: !data.isFraudulent
      };
      
      // Store results in chrome.storage for the popup with URL-specific key
      chrome.storage.local.set({
        [`fraudCheck_${urlKey}`]: resultObject,
        // Update the last check reference
        'lastFraudCheck': resultObject,
        'lastCheckedUrl': url
      });
      
      // Update notification with results
      if (data.isFraudulent) {
        notification.setColor('#f44336'); // Red for warning
        notification.update(`Fraud detected on ${displayUrl}! Proceed with caution.`);
      } else {
        notification.setColor('#4caf50'); // Green for safe
        notification.update(`No fraud detected on ${displayUrl}.`);
      }
      
      // Close notification after delay
      setTimeout(() => {
        notification.close();
      }, 5000);
    })
    .catch(error => {
      console.error('Error during fraud detection:', error);
      
      // Format URL for display
      const displayUrl = new URL(url).hostname;
      
      // Store error in chrome.storage
      const errorObject = {
        url: url,
        displayUrl: displayUrl,
        status: 'error',
        error: error.message,
        timestamp: new Date().getTime(),
        message: `<span style="color: #ff9800; font-weight: bold; font-size: 18px;">ERROR CHECKING SAFETY</span><br><br><span style="font-weight: bold;">URL:</span> ${displayUrl}<br><br>Unable to check shopping cart safety at this time. Please try again later.`,
        icon: "❓",
        purchaseRecommended: false // Default to no recommendation on error
      };
      
      chrome.storage.local.set({
        [`fraudCheck_${urlKey}`]: errorObject,
        'lastFraudCheck': errorObject,
        'lastCheckedUrl': url
      });
      
      // Remove spinner and show error
      spinner.remove();
      notification.setColor('#ff9800'); // Orange for error
      notification.update(`Error checking fraud for ${displayUrl}: ${error.message}`);
      
      // Close notification after delay
      setTimeout(() => {
        notification.close();
      }, 5000);
    });
}

// Helper function to safely parse JSON with markdown cleanup if needed
function safeParseJSON(jsonString) {
  // First try direct parsing
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.log("Initial JSON parse failed, attempting cleanup:", e);
    
    // Check if it might be wrapped in markdown code blocks
    if (typeof jsonString === 'string') {
      try {
        // Remove markdown code block formatting if present
        let cleanedJson = jsonString;
        
        // Handle JSON wrapped in code blocks (```json ... ```)
        if (cleanedJson.includes("```")) {
          const matches = cleanedJson.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (matches && matches[1]) {
            cleanedJson = matches[1].trim();
          }
        }
        
        // Parse the cleaned JSON
        return JSON.parse(cleanedJson);
      } catch (e2) {
        console.error("Failed to parse JSON even after cleanup:", e2);
        // Return a fallback object to prevent further errors
        return {
          description_larga: "Error parsing description: " + jsonString.substring(0, 100) + "...",
          description_clean: "Parse error - see console for details"
        };
      }
    }
    
    // If string parsing failed or input wasn't a string
    return {
      description_larga: "Invalid input format",
      description_clean: "Parse error - invalid input"
    };
  }
}

function sendHtmlBodyToServer(htmlBody) {
  // Create notification with loading indicator
  const notification = showNotification('Analyzing your cart...', false);
  const progress = addProgressBar(notification);
  
  // Simulate progress updates (can't track actual progress of the API call)
  let progressValue = 0;
  const progressInterval = setInterval(() => {
    progressValue += 5;
    if (progressValue > 90) {
      clearInterval(progressInterval);
    }
    progress.update(progressValue);
  }, 300);
  
  // Get current URL
  const currentUrl = window.location.href;
  
  fetch('http://127.0.0.1:8000/generate-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      body: htmlBody,
      url: currentUrl
    })
  })
    .then(response => response.json())
    .then(data => {
      // Clear progress interval and complete the progress bar
      clearInterval(progressInterval);
      progress.complete();
      
      if (data.description_json) {
        // Update notification with the description
        setTimeout(() => {
          notification.update('Purchase successfully analyzed!');
          console.log('Description JSON:', data.description_json);
          // Close notification after delay
          setTimeout(() => {
            notification.close();
          }, 10000);
        }, 500); // Small delay to show completed progress bar
        
        // Check if site is safe before proceeding with recommendation
        chrome.storage.local.get(['lastFraudCheck'], (result) => {
          const fraudCheck = result.lastFraudCheck;
          
          if (fraudCheck && !fraudCheck.isFraudulent) {
            console.log('Site is safe, proceeding with recommendation');
            // recomend and categorize
            // Obtener transacciones del usuario autenticado
            const token = getSessionToken();
            fetch('http://127.0.0.1:8000/transactions', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            })
            .then(res => res.json())
            .then(txData => {
              // Obtener objetivos financieros del usuario
              return fetch('http://127.0.0.1:8000/get-user-goals', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(res => res.json())
              .then(goalsData => {
                const userGoals = goalsData.goals || [];
                console.log('Objetivos financieros cargados:', userGoals.length > 0 ? userGoals : 'No se encontraron objetivos');
                // Llamar a recomendación con transacciones y objetivos
                return fetch('http://127.0.0.1:8000/recommend-and-categorize', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    transactions: txData.transactions, 
                    purchase_description: data.description_json,
                    user_goals: userGoals
                  })
                });
              })
              .catch(err => {
                console.error('Error fetching user goals:', err);
                // Continuar sin objetivos si hay error
                return fetch('http://127.0.0.1:8000/recommend-and-categorize', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    transactions: txData.transactions, 
                    purchase_description: data.description_json,
                    user_goals: [] 
                  })
                });
              });
            })
            .then(res => res.json())
            .then(recData => {
              // Create expandable notification with recommendation data
              const recommendationText = recData.recommendation || 'Sin recomendación disponible';
              const category = recData.category || 'Neutral';
              
              // Show expandable recommendation notification
              const { notification: recNotification } = showExpandableRecommendation(
                recommendationText,
                category
              );
              
              // Mantener visible por más tiempo por ser información importante
              setTimeout(() => {
                recNotification.close();
              }, 20000);
              
              console.log('Recomendación procesada:', recData);
              
              // Parse the description JSON to get description_clean for transaction updates
              const descriptionObj = safeParseJSON(data.description_json);
              const cleanDescription = descriptionObj.description_clean || descriptionObj.description_larga || data.description_json;
              // Iniciar monitoreo tras obtener recomendación
              listenForNewTransaction(cleanDescription);
            })
            .catch(err => {
              console.error('Error fetching recommendation or transactions:', err);
              // Iniciar monitoreo incluso con error
              listenForNewTransaction(data.description_json);
            });
          } else {
            console.log('Site is not safe, skipping recommendation');
            // Just monitor for new transactions without making recommendations
            const descriptionObj = safeParseJSON(data.description_json);
            const cleanDescription = descriptionObj.description_clean || descriptionObj.description_larga || data.description_json;
            listenForNewTransaction(cleanDescription);
          }
        });
      } else {
        console.error('Error:', data);
        notification.setColor('#ff9800'); // Orange for error
        notification.update('Error analyzing purchase.');
        
        // Close notification after delay
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    })
    .catch(error => {
      // Clear progress interval and show error
      clearInterval(progressInterval);
      console.error('Error:', error);
      
      notification.setColor('#ff9800'); // Orange for error
      notification.update('Error analyzing purchase: ' + error.message);
      
      // Close notification after delay
      setTimeout(() => {
        notification.close();
      }, 5000);
    });
}

function checkAndLogBody() {
  const url = window.location.href.toLowerCase();
  
  // Enhanced cart page detection for various e-commerce sites
  const isCartPage = url.includes('/cart') || 
                     url.includes('cart.html') || 
                     url.includes('/basket') || 
                     url.includes('/shopping-bag') ||
                     url.includes('/carrito') ||  // Spanish sites
                     url.endsWith('/cart') ||
                     document.title.toLowerCase().includes('cart') ||
                     document.title.toLowerCase().includes('basket') ||
                     document.title.toLowerCase().includes('shopping bag');
                    
  // Use sessionStorage to prevent multiple analyses on the same page
  const currentPageKey = 'analyzed_' + url.replace(/[^a-z0-9]/gi, '_');
  const alreadyAnalyzed = sessionStorage.getItem(currentPageKey);
  
  if (isCartPage && !alreadyAnalyzed) {
    console.log('Cart page detected at:', url);
    
    // Mark this URL as analyzed to prevent duplicate notifications
    sessionStorage.setItem(currentPageKey, 'true');
    
    // Delay to ensure content has loaded
    setTimeout(() => {
      console.log('Analyzing cart content');
      checkFraud(url);
      const htmlBody = document.body.innerHTML;
      sendHtmlBodyToServer(htmlBody);
    }, 2000); // Single delay to allow dynamic content to load
  }
}

// Override history methods to detect SPA navigation
(function(history){
  const push = history.pushState;
  history.pushState = function() {
    const ret = push.apply(this, arguments);
    checkAndLogBody();
    return ret;
  };
  const replace = history.replaceState;
  history.replaceState = function() {
    const ret = replace.apply(this, arguments);
    checkAndLogBody();
    return ret;
  };
})(window.history);

// Listen for back/forward navigation
window.addEventListener("popstate", checkAndLogBody);

// Fire when DOM is ready (uncommented and improved)
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(checkAndLogBody, 1000); // Delay to ensure page is fully loaded
} else {
  document.addEventListener("DOMContentLoaded", () => setTimeout(checkAndLogBody, 1000));
}

// Also add a fallback for sites that load content after DOMContentLoaded
window.addEventListener("load", () => setTimeout(checkAndLogBody, 1500));

// Function to observe URL changes dynamically
function observeUrlChanges() {
  let lastUrl = window.location.href;
  
  // Method 1: Poll for URL changes
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("URL change detected (polling):", currentUrl);
      lastUrl = currentUrl;
      checkAndLogBody();
    }
  }, 1000);
  
  // Method 2: Observer for DOM changes that might indicate navigation
  const observer = new MutationObserver((mutations) => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("URL change detected (MutationObserver):", currentUrl);
      lastUrl = currentUrl;
      checkAndLogBody();
    }
  });

  observer.observe(document, { subtree: true, childList: true });
}

// Call observeUrlChanges to monitor URL changes
observeUrlChanges();

// Debug function to help with troubleshooting widget activation
function debugWidgetActivation() {
  const url = window.location.href.toLowerCase();
  console.log("%c Widget Debug Info ", "background: #333; color: #bada55; font-size: 16px;");
  console.log("Current URL:", url);
  
  // Log all the patterns we check for
  console.log("URL includes '/cart':", url.includes('/cart'));
  console.log("URL includes 'cart.html':", url.includes('cart.html'));
  console.log("URL includes '/basket':", url.includes('/basket'));
  console.log("URL includes '/shopping-bag':", url.includes('/shopping-bag'));
  console.log("URL includes '/carrito':", url.includes('/carrito'));
  console.log("URL ends with '/cart':", url.endsWith('/cart'));
  console.log("Document title:", document.title);
  console.log("Title includes 'cart':", document.title.toLowerCase().includes('cart'));
  console.log("DOM Ready state:", document.readyState);

  // Enhanced cart page detection for various e-commerce sites
  const isCartPage = url.includes('/cart') || 
                     url.includes('cart.html') || 
                     url.includes('/basket') || 
                     url.includes('/shopping-bag') ||
                     url.includes('/carrito') ||  // Spanish sites
                     url.endsWith('/cart') ||
                     document.title.toLowerCase().includes('cart') ||
                     document.title.toLowerCase().includes('basket') ||
                     document.title.toLowerCase().includes('shopping bag');
                     
  console.log("Is this a cart page?", isCartPage);
  
  // Only show debug notification if we haven't analyzed this page yet
  const debugKey = 'debug_notification_' + url.replace(/[^a-z0-9]/gi, '_');
  if (isCartPage && !sessionStorage.getItem(debugKey)) {
    sessionStorage.setItem(debugKey, 'true');
    // Show debug notification that will auto-close
    const notification = showNotification("Widget has detected this as a cart page!", false);
    setTimeout(() => notification.close(), 5000);
  }
}

// Call debug function after page load
window.addEventListener("load", () => setTimeout(debugWidgetActivation, 2000));

// Function to save the user's session token persistently
function saveSessionToken(token) {
  localStorage.setItem('sessionToken', token);
}

// Function to retrieve the session token
function getSessionToken() {
  return localStorage.getItem('sessionToken');
}

// Function to check if the user is logged in
function isLoggedIn() {
  return !!getSessionToken();
}

// Function to log in the user
function loginUser(credentials) {
  fetch('http://127.0.0.1:8000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.token) {
        saveSessionToken(data.token);
        console.log('User logged in successfully.');
      } else {
        console.error('Login failed:', data.message);
      }
    })
    .catch(error => console.error('Error during login:', error));
}

// Function to log out the user
function logoutUser() {
  localStorage.removeItem('sessionToken');
  console.log('User logged out.');
}

// Enhanced session validation to ensure the user remains logged in
function checkSessionOnLoad() {
  const token = getSessionToken();
  if (token) {
    console.log('User is already logged in. Validating session token...');

    // Validate the token with the server
    fetch('http://127.0.0.1:8000/validate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.valid) {
          console.log('Session token is valid. User remains logged in.');
          // Perform any additional actions for logged-in users here
        } else {
          console.warn('Session token is invalid. Logging out.');
          logoutUser();
        }
      })
      .catch(error => {
        console.error('Error validating session token:', error);
        // Optionally, log out the user if validation fails
        logoutUser();
      });
  } else {
    console.log('No active session found. User needs to log in.');
  }
}

// Call checkSessionOnLoad when the widget is loaded
checkSessionOnLoad();