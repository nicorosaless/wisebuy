document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("login-form");
  const widgetContent = document.getElementById("widget");
  const userInfoElement = document.getElementById("user-info");
  const goalsContainer = document.getElementById("goals-container");
  const welcomeHeader = document.getElementById("welcome-header");
  // New fraud guard elements
  const fraudStatusMessage = document.getElementById("fraud-status-message");
  const fraudIconContainer = document.querySelector(".fraud-icon-container .shield-icon");
  // Recommendations container
  const recommendationsContainer = document.getElementById("recommendations-container");
  const clearButton = document.getElementById("clear-recommendations");
  // Goal impact container
  const goalImpactContainer = document.getElementById("goal-impact-container");

  // Function to display the user's name in welcome header
  async function displayUserName() {
    try {
      const userName = await getUserName();
      if (welcomeHeader) {
        welcomeHeader.textContent = `Welcome, ${userName}`;
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
      // Fall back to default if there's an error
      if (welcomeHeader) {
        welcomeHeader.textContent = "Welcome, User";
      }
    }
  }

  // Function to display the user's email
  async function displayUserInfo() {
    const email = await getCurrentUserEmail();
    if (email) {
      userInfoElement.textContent = `Logged in as: ${email}`;
    }
  }

  // Function to load and display user goals
  async function loadUserGoals() {
    try {
      goalsContainer.innerHTML = '<div class="loading-goals">Loading goals...</div>';
      
      const goals = await getUserGoals();
      
      if (!goals || goals.length === 0) {
        goalsContainer.innerHTML = '<div class="no-goals">No goals found. Create some goals to track your progress!</div>';
        return;
      }
      
      // Clear the container
      goalsContainer.innerHTML = '';
      
      // Display up to 3 goals
      const goalsToDisplay = goals.slice(0, 3);
      
      goalsToDisplay.forEach(goal => {
        // Calculate progress percentage
        const progressPercentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
        
        // Format date
        const deadline = new Date(goal.deadline);
        const deadlineFormatted = deadline.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        // Create goal HTML element
        const goalItem = document.createElement("div");
        goalItem.className = "goal-item";
        goalItem.innerHTML = `
          <div class="goal-header">
            <div class="goal-title">${goal.name}</div>
            <div class="goal-amount">${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} ${goal.currency}</div>
          </div>
          <div class="goal-progress">
            <div class="goal-progress-bar" style="width: ${progressPercentage}%"></div>
          </div>
          <div class="goal-details">
            <div>${progressPercentage}% complete</div>
            <div>Deadline: ${deadlineFormatted}</div>
          </div>
        `;
        
        goalsContainer.appendChild(goalItem);
      });
    } catch (error) {
      console.error("Error loading goals:", error);
      goalsContainer.innerHTML = '<div class="error-loading-goals">Failed to load goals. Please try again later.</div>';
    }
  }

  // Function to load and display saved recommendations
  async function loadRecommendations() {
    try {
      recommendationsContainer.innerHTML = '<div class="loading-recommendations">Loading recommendations...</div>';
      
      // Get recommendations from storage
      chrome.storage.local.get(['storedRecommendations'], (result) => {
        const recommendations = result.storedRecommendations || [];
        
        if (!recommendations || recommendations.length === 0) {
          recommendationsContainer.innerHTML = '<div class="no-recommendations">No recommendations available yet. Recommendations will appear here after analyzing your purchases.</div>';
          // Disable clear button when no recommendations
          clearButton.disabled = true;
          clearButton.style.opacity = '0.5';
          clearButton.style.cursor = 'default';
          return;
        }
        
        // Enable clear button when there are recommendations
        clearButton.disabled = false;
        clearButton.style.opacity = '1';
        clearButton.style.cursor = 'pointer';
        
        // Clear the container
        recommendationsContainer.innerHTML = '';
        
        // Process and display recommendations
        recommendations.forEach(rec => {
          // Determine type class based on category
          let typeClass = 'neutral';
          if (rec.category && rec.category.toLowerCase().includes('compulsive')) {
            typeClass = 'compulsive';
          } else if (rec.category && rec.category.toLowerCase().includes('adequate')) {
            typeClass = 'correct';
          }
          
          // Format date
          const date = new Date(rec.timestamp);
          const dateFormatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Create recommendation summary (first 50 chars)
          const recommendationSummary = rec.recommendation.substring(0, 50) + (rec.recommendation.length > 50 ? '...' : '');
          
          // Create recommendation HTML element
          const recItem = document.createElement("div");
          recItem.className = `recommendation-item ${typeClass}`;
          recItem.innerHTML = `
            <div class="recommendation-header">
              <div class="recommendation-icon">${rec.icon || '💡'}</div>
              <div class="recommendation-title">${recommendationSummary}</div>
              <div class="recommendation-date">${dateFormatted}</div>
            </div>
            <div class="recommendation-content">${rec.recommendation}</div>
            <div class="recommendation-category category-${typeClass}">${rec.category || 'Neutral'}</div>
          `;
          
          // Add click handler for expanding/collapsing
          recItem.addEventListener('click', function() {
            this.classList.toggle('expanded');
          });
          
          recommendationsContainer.appendChild(recItem);
        });
      });
    } catch (error) {
      console.error("Error loading recommendations:", error);
      recommendationsContainer.innerHTML = '<div class="error-loading-recommendations">Failed to load recommendations. Please try again later.</div>';
    }
  }
  
  // Function to load and display goal impact analysis
  async function loadGoalImpact() {
    try {
      goalImpactContainer.innerHTML = '<div class="loading-goal-impact">Analyzing purchase impact on your goals...</div>';
      
      // Get the current purchase under analysis
      chrome.storage.local.get(['currentPurchaseAnalysis'], async (result) => {
        const currentPurchase = result.currentPurchaseAnalysis;
        
        if (!currentPurchase) {
          goalImpactContainer.innerHTML = `
            <div class="no-goal-impact">
              <p>No current purchase to analyze. Goal impact will be shown when you're browsing an online shopping cart.</p>
            </div>`;
          return;
        }
        
        try {
          // Get user goals
          const goals = await getUserGoals();
          
          if (!goals || goals.length === 0) {
            goalImpactContainer.innerHTML = '<div class="no-goals">No goals found to analyze impact against.</div>';
            return;
          }
          
          // Calculate impact on each goal
          const impactAnalysis = await calculateGoalImpact(currentPurchase, goals);
          
          // Clear the container
          goalImpactContainer.innerHTML = '';
          
          // Add purchase details
          const purchaseDetails = document.createElement('div');
          purchaseDetails.className = 'purchase-details';
          purchaseDetails.innerHTML = `
            <h3>Current Purchase</h3>
            <p>${currentPurchase.description || 'Unknown purchase'}</p>
            <p class="purchase-price">${currentPurchase.estimatedPrice || 'Price unknown'}</p>
          `;
          goalImpactContainer.appendChild(purchaseDetails);
          
          // Add impact analysis for each goal
          const impactList = document.createElement('div');
          impactList.className = 'impact-list';
          
          impactAnalysis.forEach(impact => {
            const impactItem = document.createElement('div');
            impactItem.className = `impact-item ${impact.severity}`;
            impactItem.innerHTML = `
              <div class="impact-header">
                <div class="impact-goal-name">${impact.goalName}</div>
                <div class="impact-severity-badge">${impact.severityLabel}</div>
              </div>
              <div class="impact-details">
                <p>${impact.message}</p>
                <div class="impact-metrics">
                  <div class="impact-metric">
                    <span class="metric-label">Delay:</span>
                    <span class="metric-value">${impact.delay} days</span>
                  </div>
                  <div class="impact-metric">
                    <span class="metric-label">% of goal:</span>
                    <span class="metric-value">${impact.percentageOfGoal}%</span>
                  </div>
                </div>
              </div>
            `;
            
            impactList.appendChild(impactItem);
          });
          
          goalImpactContainer.appendChild(impactList);
          
        } catch (error) {
          console.error("Error calculating goal impact:", error);
          goalImpactContainer.innerHTML = '<div class="error-calculating-impact">Failed to calculate goal impact. Please try again later.</div>';
        }
      });
    } catch (error) {
      console.error("Error loading goal impact:", error);
      goalImpactContainer.innerHTML = '<div class="error-loading-goal-impact">Failed to load goal impact. Please try again later.</div>';
    }
  }

  // Function to load and display user subscriptions in alerts
  async function loadUserSubscriptions() {
    try {
      const subscriptionsContainer = document.getElementById("subscription-alerts");
      if (!subscriptionsContainer) {
        console.error("Subscription alerts container not found in DOM");
        return;
      }
      
      // Get subscriptions from the backend
      const subscriptions = await getUserSubscriptions();
      
      // Clear the loading message and any existing subscriptions
      subscriptionsContainer.innerHTML = '';
      
      if (!subscriptions || subscriptions.length === 0) {
        // If no subscriptions, add a message
        const noSubsMessage = document.createElement("div");
        noSubsMessage.className = "no-alerts-message";
        noSubsMessage.textContent = "No active subscriptions found.";
        subscriptionsContainer.appendChild(noSubsMessage);
        return;
      }
      
      // Calculate next payment date (example: for monthly subscriptions, add 1 month to last payment)
      const today = new Date();
      const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency
        }).format(amount);
      };
      
      // Add each subscription as an alert
      subscriptions.forEach(subscription => {
        // Format currency
        const formattedAmount = formatCurrency(subscription.amount, subscription.currency);
        
        // Format last payment date
        const lastPaymentDate = new Date(subscription.lastPayment);
        const formattedLastDate = lastPaymentDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        // Calculate next payment date based on frequency
        let nextPaymentDate = new Date(lastPaymentDate);
        switch(subscription.frequency) {
          case 'monthly':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            break;
          case 'yearly':
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            break;
          case 'weekly':
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
            break;
          case 'quarterly':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
            break;
          default:
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1); // Default to monthly
        }
        
        const formattedNextDate = nextPaymentDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        // Calculate days until next payment
        const daysUntilNextPayment = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
        
        // Create alert item
        const alertItem = document.createElement("div");
        alertItem.className = "alert-item subscription-alert";
        
        // Determine if we should suggest cancellation based on usage level
        let usageText = '';
        let tagHtml = '';
        let message = '';
        
        if (subscription.cancelSuggested) {
          usageText = `Low usage detected`;
          tagHtml = `<div class="alert-tag caution-tag">Low Usage</div>`;
          message = `Consider cancelling to save ${formattedAmount}/${subscription.frequency}.`;
        } else if (daysUntilNextPayment <= 3) {
          tagHtml = `<div class="alert-tag">Upcoming</div>`;
          message = `Next payment in ${daysUntilNextPayment} days: ${formattedNextDate}`;
        } else {
          message = `Next payment: ${formattedNextDate}`;
        }
        
        // Set the HTML content
        alertItem.innerHTML = `
          <div class="alert-icon subscription-icon">
            <span>💳</span>
          </div>
          <div class="alert-content">
            <h3>${subscription.name}</h3>
            <p>${formattedAmount} ${subscription.frequency} - ${message}</p>
            ${tagHtml}
            ${usageText ? `<p style="margin-top: 5px; font-size: 12px; color: #888;">${usageText}</p>` : ''}
          </div>
        `;
        
        // Add to subscriptions container
        subscriptionsContainer.appendChild(alertItem);
      });
      
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      const subscriptionsContainer = document.getElementById("subscription-alerts");
      if (subscriptionsContainer) {
        subscriptionsContainer.innerHTML = '<div class="error-loading">Failed to load subscription information. Please try again later.</div>';
      }
    }
  }

  // New function to update the fraud guard status
  async function updateFraudGuardStatus() {
    try {
      // Set initial loading state
      fraudStatusMessage.innerHTML = "Loading fraud guard status...";
      fraudIconContainer.textContent = "🔄";
      
      // Get purchase recommendation elements
      const purchaseRecommendation = document.getElementById("purchase-recommendation");
      const recommendationContent = document.getElementById("recommendation-content");
      
      // Get the current URL to display appropriate fraud check results
      return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs && tabs[0]) {
            const currentUrl = tabs[0].url;
            const urlKey = encodeURIComponent(currentUrl);
            
            // Get both the URL-specific fraud check and the last fraud check
            chrome.storage.local.get(['lastFraudCheck', 'lastCheckedUrl', `fraudCheck_${urlKey}`], (data) => {
              const urlSpecificCheck = data[`fraudCheck_${urlKey}`];
              const lastFraudCheck = data.lastFraudCheck;
              const lastCheckedUrl = data.lastCheckedUrl;
              
              // Current URL matched a previous fraud check
              if (urlSpecificCheck && 
                  urlSpecificCheck.timestamp && 
                  (new Date().getTime() - urlSpecificCheck.timestamp < 5 * 60 * 1000)) {
                
                // URL-specific result found and is recent (less than 5 minutes old)
                fraudStatusMessage.innerHTML = urlSpecificCheck.message || "No fraud status available";
                fraudIconContainer.textContent = urlSpecificCheck.icon || "🛡️";
                
                // Show purchase recommendation based on fraud check result
                purchaseRecommendation.style.display = "block";
                if (urlSpecificCheck.isFraudulent) {
                  recommendationContent.style.backgroundColor = "#ffebee";
                  recommendationContent.style.color = "#d32f2f";
                  recommendationContent.innerHTML = `<strong>PURCHASE NOT RECOMMENDED</strong><br>This site has been flagged as potentially unsafe. We recommend you avoid making a purchase here.`;
                } else {
                  recommendationContent.style.backgroundColor = "#e8f5e9";
                  recommendationContent.style.color = "#2e7d32";
                  recommendationContent.innerHTML = `<strong>SAFE TO PURCHASE</strong><br>This site appears to be legitimate. You can proceed with your purchase.`;
                }
                
                // Store the result in a data attribute for tab switching
                fraudStatusMessage.dataset.lastResult = JSON.stringify(urlSpecificCheck);
                fraudStatusMessage.dataset.lastCheckTime = urlSpecificCheck.timestamp;
                
                resolve(urlSpecificCheck);
                return;
              } 
              // Check if we have any fraud check results
              else if (lastFraudCheck && lastCheckedUrl) {
                // We have fraud check results, but for a different URL - show that it's for a different page
                const displayUrl = new URL(currentUrl).hostname;
                const lastCheckedDisplayUrl = lastCheckedUrl ? new URL(lastCheckedUrl).hostname : "unknown";
                
                // Show that we have no data for the current URL, but mention the last checked URL
                const result = {
                  url: currentUrl,
                  status: 'different_url',
                  message: `<span style="font-weight: bold; font-size: 16px;">No fraud check for current URL</span><br><br><span style="font-weight: bold;">Current URL:</span> ${displayUrl}<br><br>The fraud guard has not scanned this page yet. It will automatically scan shopping cart pages.`,
                  icon: "🔍"
                };
                
                fraudStatusMessage.innerHTML = result.message;
                fraudIconContainer.textContent = result.icon;
                fraudStatusMessage.dataset.lastResult = JSON.stringify(result);
                
                // Hide purchase recommendation since we don't have data for this URL
                purchaseRecommendation.style.display = "none";
                
                // Check if current page is a cart page
                const currentUrlLower = currentUrl.toLowerCase();
                const isCartPage = currentUrlLower.includes('/cart') || 
                          currentUrlLower.includes('cart.html') || 
                          currentUrlLower.includes('/basket') || 
                          currentUrlLower.includes('/shopping-bag') ||
                          currentUrlLower.includes('/carrito') ||
                          currentUrlLower.endsWith('/cart') ||
                          tabs[0].title.toLowerCase().includes('cart') ||
                          tabs[0].title.toLowerCase().includes('basket') ||
                          tabs[0].title.toLowerCase().includes('shopping bag');
                
                if (isCartPage) {
                  // Add a note that the page will be scanned automatically soon
                  const addendum = document.createElement('p');
                  addendum.innerHTML = '<br><span style="color: #ff9800;">This appears to be a shopping cart. Fraud detection will run automatically soon.</span>';
                  fraudStatusMessage.appendChild(addendum);
                }
                
                resolve(result);
              } else {
                // No fraud check data at all
                const displayUrl = new URL(currentUrl).hostname;
                
                const result = {
                  url: currentUrl,
                  status: 'no_checks',
                  message: `<span style="font-weight: bold; font-size: 16px;">No fraud checks yet</span><br><br><span style="font-weight: bold;">Current URL:</span> ${displayUrl}<br><br>The fraud guard will automatically scan shopping cart pages to protect you when shopping online.`,
                  icon: "🛡️"
                };
                
                fraudStatusMessage.innerHTML = result.message;
                fraudIconContainer.textContent = result.icon;
                fraudStatusMessage.dataset.lastResult = JSON.stringify(result);
                
                // Hide purchase recommendation since we don't have data
                purchaseRecommendation.style.display = "none";
                
                // Check if current page is a cart page
                const currentUrlLower = currentUrl.toLowerCase();
                const isCartPage = currentUrlLower.includes('/cart') || 
                          currentUrlLower.includes('cart.html') || 
                          currentUrlLower.includes('/basket') || 
                          currentUrlLower.includes('/shopping-bag') ||
                          currentUrlLower.includes('/carrito') ||
                          currentUrlLower.endsWith('/cart') ||
                          tabs[0].title.toLowerCase().includes('cart') ||
                          tabs[0].title.toLowerCase().includes('basket') ||
                          tabs[0].title.toLowerCase().includes('shopping bag');
                
                if (isCartPage) {
                  // Add a note that the page will be scanned automatically soon
                  const addendum = document.createElement('p');
                  addendum.innerHTML = '<br><span style="color: #ff9800;">This appears to be a shopping cart. Fraud detection will run automatically soon.</span>';
                  fraudStatusMessage.appendChild(addendum);
                }
                
                resolve(result);
              }
            });
          } else {
            // No active tab information available
            const result = {
              status: 'error',
              error: true,
              message: "Unable to determine current page. Please refresh and try again.",
              icon: "❓"
            };
            
            fraudStatusMessage.innerHTML = result.message;
            fraudIconContainer.textContent = result.icon;
            fraudStatusMessage.dataset.lastResult = JSON.stringify(result);
            
            // Hide purchase recommendation since we don't have data
            purchaseRecommendation.style.display = "none";
            
            resolve(result);
          }
        });
      });
    } catch (error) {
      console.error("Error in updateFraudGuardStatus:", error);
      
      const result = {
        status: 'error',
        error: true,
        message: "An error occurred while checking fraud status.",
        icon: "❓"
      };
      
      fraudStatusMessage.innerHTML = result.message;
      fraudIconContainer.textContent = result.icon;
      
      // Hide purchase recommendation on error
      document.getElementById("purchase-recommendation").style.display = "none";
      
      return result;
    }
  }

  // Helper function to calculate goal impact (placeholder for actual implementation)
  async function calculateGoalImpact(purchase, goals) {
    // This is a mock implementation - in real app this would call an API
    return goals.map(goal => {
      // Simulate calculation based on purchase amount and goal details
      const purchaseAmount = parseFloat(purchase.estimatedPrice?.replace(/[^0-9.-]+/g, '') || 0);
      const dailyContribution = goal.currentAmount / getDaysBetween(new Date(goal.createdAt), new Date());
      const delay = Math.ceil(purchaseAmount / dailyContribution);
      const percentageOfGoal = Math.round((purchaseAmount / goal.targetAmount) * 100);
      
      // Determine severity based on percentage of goal
      let severity = 'low';
      let severityLabel = 'Low Impact';
      if (percentageOfGoal > 30) {
        severity = 'high';
        severityLabel = 'High Impact';
      } else if (percentageOfGoal > 10) {
        severity = 'medium';
        severityLabel = 'Medium Impact';
      }
      
      // Create impact message
      let message = `This purchase could delay your ${goal.name} by approximately ${delay} days.`;
      if (severity === 'high') {
        message = `Warning: This purchase represents a significant portion (${percentageOfGoal}%) of your ${goal.name} goal and could delay it by ${delay} days.`;
      }
      
      return {
        goalName: goal.name,
        delay,
        percentageOfGoal,
        severity,
        severityLabel,
        message
      };
    });
  }
  
  // Helper function to calculate days between two dates
  function getDaysBetween(startDate, endDate) {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const diffDays = Math.round(Math.abs((startDate - endDate) / oneDay));
    return diffDays > 0 ? diffDays : 1; // Avoid division by zero
  }

  // Check if the user is already logged in
  if (await isLoggedIn()) {
    console.log("User is already logged in, skipping login form");
    loginForm.style.display = "none";
    widgetContent.style.display = "block";
    
    // Display the user's name in welcome header
    displayUserName();

    // Display the user's email
    displayUserInfo();
    
    // Load user goals
    loadUserGoals();

    // Load user subscriptions
    loadUserSubscriptions();
    
    // Load saved recommendations
    loadRecommendations();
    
    // Load goal impact analysis if available
    loadGoalImpact();
    
    // Update fraud guard status
    updateFraudGuardStatus();
    
    // Add event listener for clearing recommendations
    document.getElementById("clear-recommendations").addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all purchase recommendations?")) {
        chrome.storage.local.remove(['storedRecommendations'], () => {
          console.log('All recommendations cleared');
          loadRecommendations(); // Reload the recommendations section
        });
      }
    });
  } else {
    // User is not logged in, show login form
    loginForm.style.display = "block";
    widgetContent.style.display = "none";
  }

  // Handle login form submission (from original)
  document.getElementById("submit-login").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await login(email, password);
      console.log("Login successful");
      loginForm.style.display = "none";
      widgetContent.style.display = "block";
      
      // Display the user's name in welcome header after login
      displayUserName();

      // Display the user's email after login
      displayUserInfo();
      
      // Load user goals after login
      loadUserGoals();

      // Load user subscriptions after login
      loadUserSubscriptions();
      
      // Load saved recommendations after login
      loadRecommendations();
      
      // Load goal impact analysis after login
      loadGoalImpact();
      
      // Update fraud guard status after login
      updateFraudGuardStatus();
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });

  // Handle logout button (from original)
  document.getElementById("logout").addEventListener("click", () => {
    logout()
    alert("Logging out succesfully...");
    loginForm.style.display = "block";
    widgetContent.style.display = "none";
    userInfoElement.textContent = "";
  });

  // Bank website link
  document.getElementById("bank-website").addEventListener("click", () => {
    window.open("https://yourbankwebsite.com", "_blank");
  });

  // Sidebar navigation logic (unified)
  const sidebarIcons = document.querySelectorAll('.sidebar-icon');
  sidebarIcons.forEach(icon => {
    icon.addEventListener('click', function() {
      // Remove active class from all icons
      sidebarIcons.forEach(i => i.classList.remove('active'));
      this.classList.add('active');

      // Hide all sections
      const allSections = document.querySelectorAll('#home, #alerts, #accounts, #recommendations, #goalimpact, #fraudguard');
      allSections.forEach(section => section.style.display = 'none');

      // Show the target section
      const sectionId = this.getAttribute('data-section');
      const target = document.getElementById(sectionId);
      if (target) {
        target.style.display = 'block';
        
        // If the fraud guard section is selected
        if (sectionId === 'fraudguard') {
          // Check if we have a stored result first
          if (fraudStatusMessage.dataset.lastResult) {
            try {
              const lastResult = JSON.parse(fraudStatusMessage.dataset.lastResult);
              // Use the stored result to avoid unnecessary API calls when switching tabs
              fraudStatusMessage.innerHTML = lastResult.message;
              fraudIconContainer.textContent = lastResult.icon;
              
              // If the last result is older than 30 seconds, refresh it
              const now = new Date().getTime();
              const lastCheckTime = parseInt(fraudStatusMessage.dataset.lastCheckTime || '0');
              if (!lastCheckTime || now - lastCheckTime > 30000) {
                // Update the timestamp for this check
                fraudStatusMessage.dataset.lastCheckTime = now.toString();
                // Refresh the status
                updateFraudGuardStatus();
              }
            } catch (e) {
              console.error("Error restoring fraud status:", e);
              // If there was an error restoring the state, just update it
              updateFraudGuardStatus();
            }
          } else {
            // No stored result, update the fraud guard status
            updateFraudGuardStatus();
          }
        } else if (sectionId === 'recommendations') {
          // Refresh recommendations when tab is selected
          loadRecommendations();
        } else if (sectionId === 'goalimpact') {
          // Refresh goal impact analysis when tab is selected
          loadGoalImpact();
        }
      }
    });
  });

  // Toggle settings view
  document.getElementById('toggle-settings').addEventListener('click', () => {
    document.getElementById('settings').style.display = 'block';
    document.querySelector('.app-layout').style.display = 'none';
  });
  document.getElementById('back-from-settings').addEventListener('click', () => {
    document.getElementById('settings').style.display = 'none';
    document.querySelector('.app-layout').style.display = 'flex';
  });

  // Close widget confirmation
  document.querySelector('.close-icon').addEventListener('click', () => {
    if (confirm("¿Deseas cerrar la aplicación?")) {
      console.log('Widget closed');
      // window.close();
    }
  });

  // Settings toggles for alerts
  const toggleMap = {
    'fraud-popup': '.fraud-alert',
    'compulsive-popup': '.shopping-alert',
    'subscription-popup': '.subscription-alert',
    'goal-popup': '.goal-alert'
  };

  Object.entries(toggleMap).forEach(([checkboxId, alertSelector]) => {
    document.getElementById(checkboxId).addEventListener('change', (e) => {
      document.querySelectorAll(alertSelector).forEach(el => {
        el.style.display = e.target.checked ? 'flex' : 'none';
      });
    });
  });
});
