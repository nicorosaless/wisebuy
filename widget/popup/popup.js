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

  // Handle login form submission
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

  // Handle logout button
  document.getElementById("logout").addEventListener("click", async () => {
    logout();
    alert("Logged out successfully");
    loginForm.style.display = "block";
    widgetContent.style.display = "none";
    userInfoElement.textContent = "";
  });

  document.getElementById("bank-website").addEventListener("click", () => {
    window.open("https://www.yourbankwebsite.com", "_blank");
  });

  // Load goals dynamically
  const goalsList = document.getElementById("goals-list");
  const goals = ["Save $500 this month", "Pay off credit card debt", "Invest in stocks"];
  goals.forEach(goal => {
    const li = document.createElement("li");
    li.textContent = goal;
    goalsList.appendChild(li);
  });

  // Load reminders dynamically
  const remindersList = document.getElementById("reminders-list");
  const reminders = ["Netflix subscription due tomorrow", "Gym membership renewal next week"];
  reminders.forEach(reminder => {
    const li = document.createElement("li");
    li.textContent = reminder;
    remindersList.appendChild(li);
  });

  // Handle settings toggles
  document.getElementById("fraud-popup").addEventListener("change", (event) => {
    alert(`Fraud alerts ${event.target.checked ? 'enabled' : 'disabled'}.`);
  });

  document.getElementById("compulsive-popup").addEventListener("change", (event) => {
    alert(`Compulsive purchase alerts ${event.target.checked ? 'enabled' : 'disabled'}.`);
  });

  document.getElementById("subscription-popup").addEventListener("change", (event) => {
    alert(`Subscription reminders ${event.target.checked ? 'enabled' : 'disabled'}.`);
  });
});

