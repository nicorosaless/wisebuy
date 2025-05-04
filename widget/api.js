// Function to handle login
async function login(email, password) {
    const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error("Login failed");
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
}

// Function to handle logout
function logout() {
    localStorage.removeItem("token");
}

// Function to validate the session token
async function validateToken(token) {
    try {
        const response = await fetch("http://localhost:8000/validate-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error("Error validating token:", error);
        return false;
    }
}

// Function to check if the user is logged in
async function isLoggedIn() {
    const token = localStorage.getItem("token");
    if (!token) {
        return false;
    }

    return await validateToken(token);
}

// Function to get the current user's email from the token
async function getCurrentUserEmail() {
    const token = localStorage.getItem("token");
    if (!token) {
        return null;
    }
    
    try {
        const response = await fetch("http://localhost:8000/get-current-user", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        return data.email;
    } catch (error) {
        console.error("Error getting user email:", error);
        return null;
    }
}

// Function to get the user's name from MongoDB
async function getUserName() {
    const token = localStorage.getItem("token");
    if (!token) {
        return "User";
    }
    
    try {
        const response = await fetch("http://localhost:8000/get-user-info", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            return "User";
        }
        
        const data = await response.json();
        return data.name || "User";
    } catch (error) {
        console.error("Error getting user name:", error);
        return "User";
    }
}

// Function to get the user's goals from MongoDB
async function getUserGoals() {
    const token = localStorage.getItem("token");
    if (!token) {
        return null;
    }
    
    try {
        const response = await fetch("http://localhost:8000/get-user-goals", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error("Error fetching goals:", response.statusText);
            return [];
        }
        
        const data = await response.json();
        return data.goals;
    } catch (error) {
        console.error("Error getting user goals:", error);
        return [];
    }
}