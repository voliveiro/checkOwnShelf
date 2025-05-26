import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy
  } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
  
import {
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut
  } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
  
const firebaseConfig = {
    apiKey: "AIzaSyDgn8oJWwjG_DS8DWoNo6WTgpdMAm9xuAQ",
    authDomain: "shelfcheck-f83a8.firebaseapp.com",
    projectId: "shelfcheck-f83a8",
    storageBucket: "shelfcheck-f83a8.firebasestorage.app",
    messagingSenderId: "433039982306",
    appId: "1:433039982306:web:7292e2ba20b6909a9fe8bb",
    measurementId: "G-562P1D6Q7E"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
    db, auth,
    collection, getDocs, addDoc, query, where, deleteDoc, doc, serverTimestamp, orderBy,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut
  };