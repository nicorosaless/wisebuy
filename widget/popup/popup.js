document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("login-form");
  const widgetContent = document.getElementById("widget");
  const userInfoElement = document.getElementById("user-info");

  // Function to display the user's email
  async function displayUserInfo() {
    const email = await getCurrentUserEmail();
    if (email) {
      userInfoElement.textContent = `Logged in as: ${email}`;
    }
  }

  // Check if the user is already logged in
  if (await isLoggedIn()) {
    console.log("User is already logged in, skipping login form");
    loginForm.style.display = "none";
    widgetContent.style.display = "block";
    
    // Display the user's email
    displayUserInfo();
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
      
      // Display the user's email after login
      displayUserInfo();
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

    // Lógica para cerrar sesión


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
      const allSections = document.querySelectorAll('#home, #alerts, #accounts, #payments, #cards');
      allSections.forEach(section => section.style.display = 'none');

      // Show the target section
      const sectionId = this.getAttribute('data-section');
      const target = document.getElementById(sectionId);
      if (target) target.style.display = 'block';
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
