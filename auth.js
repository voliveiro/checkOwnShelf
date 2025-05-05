import {
    db,
    collection,
    getDocs,
    query,
    where,
    addDoc
  } from './firebase.js';
  
  window.proceed = async function () {
    const username = document.getElementById("username").value.trim();
    const msg = document.getElementById("authMessage");
  
    if (!username) {
      msg.textContent = "Please enter a username.";
      return;
    }
  
    // Check if user already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snap = await getDocs(q);
  
    // Store in localStorage
    localStorage.setItem("username", username);
  
    if (snap.empty) {
      // Create new user
      await addDoc(usersRef, { username });
    }
  
    // Redirect
    window.location.href = "dashboard.html";
  };
  
  