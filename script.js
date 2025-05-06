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
    const isbnInput = document.getElementById("isbnInput").value.trim();
    const infoDiv = document.getElementById("bookInfo");
    const bookList = document.getElementById("bookList");
  
    infoDiv.innerHTML = "";
    bookList.innerHTML = "";
  
    if (!isbnInput) {
      loadBooks(); // fallback: show all books
      return;
    }
  
    const booksRef = collection(db, "books");
    const q = query(booksRef, where("isbn", "==", isbnInput), where("username", "==", username));
    const snap = await getDocs(q);
  
    if (!snap.empty) {
      // ✅ Book already in library
      const book = snap.docs[0].data();
      infoDiv.innerHTML = `
        <strong>${book.title}</strong><br>
        by ${book.author}<br>
        Publisher: ${book.publisher}<br>
        ISBN: ${book.isbn}<br>
        <div style="color: green; margin-top: 8px;">✅ This book is already in your library.</div>
      `;
      return;
    }
  
    // Not in library — search Google Books
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnInput}`);
      const data = await res.json();
  
      if (!data.items || data.items.length === 0) {
        infoDiv.textContent = "❌ Book not found in Google Books.";
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
        ISBN: ${isbnInput}<br>
        <button class="addBookBtn">Add to My Library</button>
      `;
  
      document.getElementsByClassName("addBookBtn").onclick = async () => {
        await addDoc(booksRef, { isbn: isbnInput, title, author, publisher, username });
        infoDiv.innerHTML = `
          <strong>${title}</strong><br>
          by ${author}<br>
          Publisher: ${publisher}<br>
          ISBN: ${isbnInput}<br>
          <div style="color: green; margin-top: 8px;">✅ Added to your library!</div>
        `;
        loadBooks();
      };
    } catch (error) {
      console.error("Google Books API error:", error);
      infoDiv.textContent = "⚠️ Error retrieving book data.";
    }
  };
  
  
  window.deleteBook = async function (bookId) {
    try {
      await deleteDoc(doc(db, "books", bookId));
      alert("📚 Book removed.");
      loadBooks(); // refresh list
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("⚠️ Could not delete the book.");
    }
  };
  
  window.loadBooks = async function () {
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
        <strong>${b.title}</strong> by ${b.author} (${b.publisher}) <br>
        ISBN: ${b.isbn}
        <div>
          <button class="delete-button" onclick="deleteBook('${docSnap.id}')">Remove</button>
        </div>
      `;
      bookList.appendChild(li);
    });
  }

  window.searchGoogleBooks = async function () {
    const title = document.getElementById("titleInput").value.trim();
    const author = document.getElementById("authorInput").value.trim();
    const resultsDiv = document.getElementById("searchResults");
    resultsDiv.innerHTML = "";
  
    if (!title && !author) {
      resultsDiv.textContent = "❗ Enter a title or author to search.";
      return;
    }
  
    const booksRef = collection(db, "books");
    let userQuery = query(booksRef, where("username", "==", username));
    const userSnap = await getDocs(userQuery);
  
    const localMatches = [];
    userSnap.forEach(docSnap => {
      const b = docSnap.data();
      const titleMatch = title && b.title.toLowerCase().includes(title.toLowerCase());
      const authorMatch = author && b.author.toLowerCase().includes(author.toLowerCase());
      if ((title && titleMatch) || (author && authorMatch)) {
        localMatches.push(b);
      }
    });
  
    // 📚 List library matches (if any)
    if (localMatches.length > 0) {
      resultsDiv.innerHTML += `<p><strong>📚 Books already in your library:</strong></p>`;
      localMatches.forEach(b => {
        const bookDiv = document.createElement("div");
        bookDiv.style.marginBottom = "15px";
        bookDiv.innerHTML = `
          <strong>${b.title}</strong><br>
          by ${b.author}<br>
          Publisher: ${b.publisher}<br>
          ISBN: ${b.isbn}<br>
          <div style="color: green;">✅ Already in your library.</div>
        `;
        resultsDiv.appendChild(bookDiv);
      });
    }
  
    // 🔎 Now search Google Books regardless
    let queryStr = "";
    if (title) queryStr += `intitle:${title}`;
    if (author) queryStr += (queryStr ? "+" : "") + `inauthor:${author}`;
  
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryStr)}&maxResults=10`);
      const data = await res.json();
  
      if (!data.items || data.items.length === 0) {
        resultsDiv.innerHTML += "<p>❌ No books found in Google Books.</p>";
        return;
      }
  
      resultsDiv.innerHTML += `<p><strong>🔍 Books found on Google Books:</strong></p>`;
      data.items.forEach(book => {
        const info = book.volumeInfo;
        const isbnObj = (info.industryIdentifiers || []).find(i => i.type.includes("ISBN"));
        const isbn = isbnObj ? isbnObj.identifier : "Unknown ISBN";
        const bookTitle = info.title || "Untitled";
        const bookAuthor = (info.authors && info.authors.join(", ")) || "Unknown Author";
        const publisher = info.publisher || "Unknown Publisher";
  
        const bookDiv = document.createElement("div");
        bookDiv.style.marginBottom = "15px";
        bookDiv.innerHTML = `
          <strong>${bookTitle}</strong><br>
          by ${bookAuthor}<br>
          Publisher: ${publisher}<br>
          ISBN: ${isbn}<br>
          <button class="addBookBtn" onclick="addToLibrary('${isbn}', '${bookTitle.replace(/'/g, "\\'")}', '${bookAuthor.replace(/'/g, "\\'")}', '${publisher.replace(/'/g, "\\'")}')">Add to My Library</button>
        `;
  
        resultsDiv.appendChild(bookDiv);
      });
    } catch (error) {
      console.error("Google Books API error:", error);
      resultsDiv.innerHTML += "<p>⚠️ Error searching Google Books.</p>";
    }
  };
  
  
  window.addToLibrary = async function (isbn, title, author, publisher) {
    const booksRef = collection(db, "books");
  
    // Check for duplicates first
    const q = query(booksRef, where("isbn", "==", isbn), where("username", "==", username));
    const snap = await getDocs(q);
  
    if (!snap.empty) {
      alert("You already have this book in your library.");
      return;
    }
  
    await addDoc(booksRef, { isbn, title, author, publisher, username });
    alert(`✅ "${title}" added to your library.`);
    loadBooks();
  };

  window.clearSearch = function () {
    document.getElementById("isbnInput").value = "";
    document.getElementById("bookInfo").innerHTML = "";
  
    document.getElementById("titleInput").value = "";
    document.getElementById("authorInput").value = "";
    document.getElementById("searchResults").innerHTML = "";
  };
  
  
