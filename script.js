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
   
  document.addEventListener("DOMContentLoaded", function () {
    const libraryMenu = document.getElementById("libraryMenu");
    const addMenu = document.getElementById("addMenu");
    const myLibrary = document.getElementById("my-library");
    const searchAdd = document.getElementById("search-add");
  
    // Debug: Log elements to ensure they are correctly referenced
    console.log("libraryMenu:", libraryMenu);
    console.log("addMenu:", addMenu);
    console.log("myLibrary:", myLibrary);
    console.log("searchAdd:", searchAdd);
  
    // Hide both sections by default on page load
    myLibrary.style.display = "none";
    searchAdd.style.display = "none";
  
    // Show "Library" section and hide "Add" section
    libraryMenu.addEventListener("click", function () {
      console.log("Library menu clicked");
      myLibrary.style.display = "block"; // Show the library section
      searchAdd.style.display = "none"; // Hide the add/search section
    });
  
    // Show "Add" section and hide "Library" section
    addMenu.addEventListener("click", function () {
      console.log("Add menu clicked");
      myLibrary.style.display = "none"; // Hide the library section
      searchAdd.style.display = "block"; // Show the add/search section
    });
  });

  window.checkLibrary = async function () {
    const isbnInput = document.getElementById("isbnInput").value.trim();
    const resultsDiv = document.getElementById("searchResults");
    const bookList = document.getElementById("bookList");
  
    resultsDiv.innerHTML = "";
    bookList.innerHTML = "";
  
    if (!isbnInput) {
      loadBooks(); // fallback: show all books
      return;
    }
  
    const booksRef = collection(db, "books");
    const q = query(booksRef, where("isbn", "==", isbnInput), where("username", "==", username));
    const snap = await getDocs(q);
  
    // ✅ Already in library
    if (!snap.empty) {
      const book = snap.docs[0].data();
  
      resultsDiv.innerHTML = `
        <div class="bookRow">
          <div class="bookThumbnail">
            ${book.thumbnail ? `<img src="${book.thumbnail}" alt="Book cover">` : ""}
          </div>
          <div class="bookInfo">
            <strong>${book.title}</strong><br>
            by ${book.author}<br>
            Publisher: ${book.publisher}<br>
            ISBN: ${book.isbn}<br>
            <div style="color: green; margin-top: 8px;">✅ This book is already in your library.</div>
          </div>
        </div>
      `;
      return;
    }
  
    // ❌ Not in library — fetch from Google Books
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnInput}`);
      const data = await res.json();
  
      if (!data.items || data.items.length === 0) {
        resultsDiv.textContent = "❌ Book not found in Google Books.";
        return;
      }
  
      const book = data.items[0].volumeInfo;
      const title = book.title || "Unknown Title";
      const author = (book.authors && book.authors.join(", ")) || "Unknown Author";
      const publisher = book.publisher || "Unknown Publisher";
      const thumbnail = book.imageLinks?.thumbnail || "";
  
      resultsDiv.innerHTML = `
        <div class="bookRow">
          <div class="bookThumbnail">
            ${thumbnail ? `<img src="${thumbnail}" alt="Book cover">` : ""}
          </div>
          <div class="bookInfo">
            <strong>${title}</strong><br>
            by ${author}<br>
            Publisher: ${publisher}<br>
            ISBN: ${isbnInput}<br>
            <button class="addBookBtn"> Add </button>
          </div>
        </div>
      `;
  
      document.querySelector(".addBookBtn").onclick = async () => {
        await addDoc(booksRef, {
          isbn: isbnInput,
          title,
          author,
          publisher,
          thumbnail,
          username
        });
  
        resultsDiv.innerHTML = `
          <div class="bookRow">
            <div class="bookThumbnail">
              ${thumbnail ? `<img src="${thumbnail}" alt="Book cover">` : ""}
            </div>
            <div class="bookInfo">
              <strong>${title}</strong><br>
              by ${author}<br>
              Publisher: ${publisher}<br>
              ISBN: ${isbnInput}<br>
              <div style="color: green; margin-top: 8px;">✅ Added to your library!</div>
            </div>
            
          </div>
        `;
        loadBooks();
      };
    } catch (error) {
      console.error("Google Books API error:", error);
      resultsDiv.textContent = "⚠️ Error retrieving book data.";
    }
  };
  

  window.clearSearch = function () {
    document.getElementById("isbnInput").value = "";
    document.getElementById("titleInput").value = "";
    document.getElementById("authorInput").value = "";
    document.getElementById("searchResults").innerHTML = "";
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
    const bookList = document.getElementById("bookList");
    bookList.innerHTML = "";
  
    const booksRef = collection(db, "books");
    const q = query(booksRef, where("username", "==", username));
    const snap = await getDocs(q);
  
    if (snap.empty) {
      bookList.innerHTML = "<li>You don't have any books in your library yet.</li>";
      return;
    }
  
    snap.forEach(docSnap => {
      const b = docSnap.data();
      const li = document.createElement("li");
      li.classList.add("bookRow");
  
      li.innerHTML = `
        <div class="bookRow">
          <div class="bookThumbnail">
            ${b.thumbnail ? `<img src="${b.thumbnail}" alt="Book cover">` : ""}
          </div>
        <div class="bookInfo">
          <strong>${b.title}</strong><br>
          by ${b.author}<br>
          Publisher: ${b.publisher}<br>
          ISBN: ${b.isbn}<br>
          <button class="delete-button" onclick="deleteBook('${docSnap.id}')"><p> Remove </p> </button>
        </div>
      `;
  
      bookList.appendChild(li);
    });
  };
  

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
    const userQuery = query(booksRef, where("username", "==", username));
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
  
    // 📚 Local results
    if (localMatches.length > 0) {
      resultsDiv.innerHTML += `<p><strong>📚 Books already in your library:</strong></p>`;
      localMatches.forEach(b => {
        const bookDiv = document.createElement("div");
        bookDiv.classList.add("bookRow");
        bookDiv.innerHTML = `
          <div class="bookInfo">
            <strong>${b.title}</strong><br>
            by ${b.author}<br>
            Publisher: ${b.publisher}<br>
            ISBN: ${b.isbn}<br>
            <div style="color: green;">✅ Already in your library.</div>
          </div>
          <div class="bookThumbnail"></div>
        `;
        resultsDiv.appendChild(bookDiv);
      });
    }
  
    // 🔍 Google Books API fallback
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
        const thumbnail = info.imageLinks?.thumbnail || "";
  
        const bookDiv = document.createElement("div");
        bookDiv.classList.add("bookRow");
  
        bookDiv.innerHTML = `
          <div class="bookRow">
            <div class="bookThumbnail">
            ${thumbnail ? `<img src="${thumbnail}" alt="Book cover">` : ""}
          </div>
          <div class="bookInfo">
            <strong>${bookTitle}</strong><br>
            by ${bookAuthor}<br>
            Publisher: ${publisher}<br>
            ISBN: ${isbn}<br>
            <button class="addBookBtn" onclick="addToLibrary('${isbn}', '${bookTitle.replace(/'/g, "\\'")}', '${bookAuthor.replace(/'/g, "\\'")}', '${publisher.replace(/'/g, "\\'")}')">Add </button>
          </div>
          
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
  
    // Check for duplicates
    const q = query(booksRef, where("isbn", "==", isbn), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("You already have this book in your library.");
      return;
    }
  
    // Fetch thumbnail from Google Books
    let thumbnail = "";
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await res.json();
      thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || "";
    } catch (e) {
      console.warn("No thumbnail found for", isbn);
    }
  
    await addDoc(booksRef, {
      isbn,
      title,
      author,
      publisher,
      thumbnail,
      username
    });
  
    alert(`✅ "${title}" added to your library.`);
    loadBooks();
  };
  
  // Barcode scanner
  
  window.startScanner = function () {
    const scannerElem = document.getElementById("barcode-scanner");
    scannerElem.style.display = "block";

    Quagga.offDetected();
    Quagga.onDetected(result => {
      console.log("DETECTED CODE:", result.codeResult);
      const code = result.codeResult.code;

      if (code.startsWith("978") || code.startsWith("979")) {
        document.getElementById("isbnInput").value = code;
        Quagga.stop();
        scannerElem.style.display = "none";
        window.checkLibrary();
      } else {
        console.log("Detected non-ISBN barcode:", code);
      }
    });
    
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: scannerElem,
          constraints: {
            facingMode: "environment", // back camera
          },
        },
        decoder: {
          readers: ["ean_reader"], // EAN-13 barcodes
        },

        locator: {
          patchSize: "medium", // "x-small", "small", "medium", "large", "x-large"
          halfSample: true
        },

        locate: true, // enable locating barcode in image
        numOfWorkers: 2,

      }, function (err) {
        if (err) {
          console.error("Quagga init error:", err);
          return;
        }
        Quagga.start();
      });
    
      Quagga.onProcessed(result => {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;
      
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      
        if (result && result.boxes) {
          result.boxes
            .filter(box => box !== result.box)
            .forEach(box => {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                color: "green",
                lineWidth: 2,
              });
            });
      
          if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
              color: "#00F",
              lineWidth: 2,
            });
          }
      
          if (result.codeResult && result.codeResult.code) {
            Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, drawingCtx, {
              color: "red",
              lineWidth: 3,
            });
          }
        }
      });   
    
    // Attach event handler *after* function is defined
    document.addEventListener("DOMContentLoaded", function () {
      document.getElementById("scanButton").addEventListener("click", startScanner);
    });
  
 