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
          <button id="addBookBtn"> Add to My Library</button>
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
  
    let query = "";
    if (title) query += `intitle:${title}`;
    if (author) query += (query ? "+" : "") + `inauthor:${author}`;
  
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
      const data = await res.json();
  
      if (!data.items || data.items.length === 0) {
        resultsDiv.textContent = "No books found.";
        return;
      }
  
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
          <button id="addBookBtn" onclick="addToLibrary('${isbn}', '${bookTitle.replace(/'/g, "\\'")}', '${bookAuthor.replace(/'/g, "\\'")}', '${publisher.replace(/'/g, "\\'")}')">Add to My Library</button>
        `;
  
        resultsDiv.appendChild(bookDiv);
      });
    } catch (error) {
      console.error("Google Books API error:", error);
      resultsDiv.textContent = "⚠️ Error searching books.";
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
  
  
