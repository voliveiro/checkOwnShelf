import {
    db,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    deleteDoc,
    doc
  } from './firebase.js';
  
  let username = localStorage.getItem("username");
  
  if (!username) {
    window.location.href = "index.html"; // Block if not logged in
  }
  
  window.logout = function () {
    localStorage.removeItem("username");
    window.location.href = "index.html";
  };
  
  window.checkLibrary = async function () {
    const queryInput = document.getElementById("isbnInput").value.trim().toLowerCase();
    const infoDiv = document.getElementById("bookInfo");
    const bookList = document.getElementById("bookList");
  
    infoDiv.innerHTML = "";
    bookList.innerHTML = "";
  
    const booksRef = collection(db, "books");
    const snap = await getDocs(query(booksRef, where("username", "==", username)));
  
    const allBooks = [];
    snap.forEach(docSnap => {
      allBooks.push({ ...docSnap.data(), id: docSnap.id });
    });
  
    // Show all books if input is empty
    if (!queryInput) {
      loadBooks();
      return;
    }
  
    // Use Fuse.js for fuzzy matching
    const fuse = new Fuse(allBooks, {
      keys: ['title', 'author', 'publisher'],
      threshold: 0.4 // lower = stricter; 0.4 = nice fuzzy match
    });
  
    const results = fuse.search(queryInput);
  
    if (results.length > 0) {
      results.forEach(result => {
        const b = result.item;
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${b.title}</strong><br>
          by ${b.author}<br>
          Publisher: ${b.publisher}
          <div>
            <button class="delete-button" onclick="deleteBook('${b.id}')"> Remove</button>
          </div>
        `;
        bookList.appendChild(li);
      });
      return;
    }
  
    // If query looks like ISBN, try Google Books
    const isISBN = /^\d{10}(\d{3})?$/.test(queryInput);
    if (isISBN) {
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${queryInput}`);
        const data = await res.json();
  
        if (!data.items || data.items.length === 0) {
          infoDiv.textContent = "❌ No match found in your library or Google.";
          return;
        }
  
        const book = data.items[0].volumeInfo;
        const title = book.title || "Unknown Title";
        const author = (book.authors && book.authors.join(", ")) || "Unknown Author";
        const publisher = book.publisher || "Unknown Publisher";
  
        infoDiv.innerHTML = `
          <strong>${title}</strong><br>
          by ${author}<br>
          Publisher: ${publisher}<br>
          <button id="addBookBtn">📚 Add to My Library</button>
        `;
  
        document.getElementById("addBookBtn").onclick = async () => {
          await addDoc(booksRef, { isbn: queryInput, title, author, publisher, username });
          infoDiv.textContent = `✅ "${title}" added to your library.`;
          loadBooks();
        };
      } catch (error) {
        console.error("Google Books API error:", error);
        infoDiv.textContent = "⚠️ Error retrieving book data.";
      }
    } else {
      infoDiv.textContent = "❌ No match found in your library.";
    }
  };
  
  
  async function loadBooks() {
    const booksRef = collection(db, "books");
    const q = query(booksRef, where("username", "==", username));
    const snap = await getDocs(q);
    const bookList = document.getElementById("bookList");
    bookList.innerHTML = "";
  
    if (snap.empty) {
      bookList.innerHTML = "<li>No books yet.</li>";
      return;
    }
  
    snap.forEach(docSnap => {
      const b = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${b.title}</strong> by ${b.author} (${b.publisher})
        <div>
          <button class="delete-button" onclick="deleteBook('${docSnap.id}')">Remove</button>
        </div>
      `;
      bookList.appendChild(li);
    });
  }
  
