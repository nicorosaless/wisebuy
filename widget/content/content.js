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

function sendHtmlBodyToServer(htmlBody) {
  fetch('http://127.0.0.1:8000/generate-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: htmlBody })
  })
    .then(response => response.json())
    .then(data => {
      if (data.description) {
        console.log('Generated Description:', data.description);
        // Replace blocking alert with non-blocking notification
        showNotification('Generated Description: ' + data.description);

        // Start listening for new transactions
        listenForNewTransaction(data.description);
      } else {
        console.error('Error:', data);
      }
    })
    .catch(error => console.error('Error:', error));
}

function checkFraud(url) {
  fetch('http://127.0.0.1:8000/check-fraud', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  })
    .then(response => response.json())
    .then(data => {
      if (data.isFraudulent) {
        console.warn('Fraud detected on this page!');
        // Replace blocking alert with non-blocking notification
        showNotification('Fraud detected on this page! Proceed with caution.', true);
      } else {
        console.log('No fraud detected on this page.');
        showNotification('No fraud detected on this page.', false);
      }
    })
    .catch(error => console.error('Error during fraud detection:', error));
}

// Helper function to show non-blocking notifications
function showNotification(message, isWarning = false) {
  // Create a notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${isWarning ? '#f44336' : '#4caf50'};
    color: white;
    padding: 15px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 300px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    transition: opacity 0.5s;
  `;
  
  // Add to the page
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

function checkAndLogBody() {
  const url = window.location.href.toLowerCase();
  if (url.includes('/cart')) {// || url.includes('/checkout')) {
    setTimeout(() => {
      console.log('Checking body content for URL:', url);
      checkFraud(url);
      const htmlBody = document.body.innerHTML;
      //console.log('HTML Body Content:', htmlBody);
      sendHtmlBodyToServer(htmlBody);
      
    }, 1000); // Delay to allow dynamic content to load
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

// Fire once when DOM is ready
// if (document.readyState === "complete" || document.readyState === "interactive") {
//   checkAndLogBody();
// } else {
//   document.addEventListener("DOMContentLoaded", checkAndLogBody);
// }

// Function to observe URL changes dynamically
function observeUrlChanges() {
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkAndLogBody();
    }
  });

  observer.observe(document, { subtree: true, childList: true });
}

// Call observeUrlChanges to monitor URL changes
observeUrlChanges();

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