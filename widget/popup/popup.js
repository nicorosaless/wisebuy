document.addEventListener("DOMContentLoaded", () => {
  // Handle login/logout buttons
  document.getElementById("login").addEventListener("click", () => {
    alert("Log In functionality not implemented yet.");
  });

  document.getElementById("logout").addEventListener("click", () => {
    alert("Log Out functionality not implemented yet.");
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