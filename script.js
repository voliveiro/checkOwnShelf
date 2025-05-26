console.log ("Script loaded successfully!");
import {
    db,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    deleteDoc,
    doc,
    serverTimestamp, 
    orderBy,
  } from './firebase.js';

import {
    limit,
    startAfter
  } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.min.js";

let username = localStorage.getItem("username");

if (!username) {
  window.location.href = "index.html"; // Block if not logged in
}

window.logout = function () {
  localStorage.removeItem("username");
  window.location.href = "index.html";
};
   
document.addEventListener("DOMContentLoaded", function () {
  const addSection = document.getElementById("add-section");
  const checkSection = document.getElementById("check-section");
  const librarySection = document.getElementById("my-library");

  const addMenu = document.getElementById("addMenu");
  const checkMenu = document.getElementById("checkMenu");
  const libraryMenu = document.getElementById("libraryMenu");

  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  const sortOrderSelect = document.getElementById("sortOrder");

  if (sortOrderSelect) {
    sortOrderSelect.addEventListener("change", () => {
      console.log("Dropdown changed (mobile-safe)"); // Optional debug
      reloadBooks();
    });
  }

  // Initial state
  addSection.style.display = "none";
  checkSection.style.display = "none";
  librarySection.style.display = "none";

  // Hamburger toggle
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });

  // Add Menu
  addMenu.addEventListener("click", () => {
    addSection.style.display = "block";
    checkSection.style.display = "none";
    librarySection.style.display = "none";
    navLinks.classList.remove("show");
    document.getElementById("searchResults").innerHTML = "";

  });

  // Check Menu
  checkMenu.addEventListener("click", () => {
    addSection.style.display = "none";
    checkSection.style.display = "block";
    librarySection.style.display = "none";
    navLinks.classList.remove("show");
    document.getElementById("searchResults").innerHTML = "";

  });

  // Library Menu
  libraryMenu.addEventListener("click", () => {
    addSection.style.display = "none";
    checkSection.style.display = "none";
    librarySection.style.display = "block";
    navLinks.classList.remove("show");
    document.getElementById("searchResults").innerHTML = "";



    // Reset lazy loading state
    lastVisibleDoc = null;
    hasMoreBooks = true;
    isLoadingBooks = false;
    document.getElementById("bookList").innerHTML = "";

    // Load first batch of books
    loadBooks();
  });

  // Scan Button (if present)
  const scanButton = document.getElementById("scanButton");
  const scannerModal = document.getElementById("scannerModal");
const closeScanner = document.getElementById("closeScanner");
const scannerElem = document.getElementById("barcode-scanner");

if (scanButton) {
  scanButton.addEventListener("click", () => {
    if (scannerModal) scannerModal.style.display = "block";
    startScanner();
  });
}

if (closeScanner) {
  closeScanner.addEventListener("click", () => {
    scannerModal.style.display = "none";
    Quagga.stop();
  });
}

window.onclick = function (event) {
  if (event.target === scannerModal) {
    scannerModal.style.display = "none";
    Quagga.stop();
  }
};

});

 
window.checkLibrary = async function (addMode = false) {
  const isbnField = addMode ? document.getElementById("addIsbnInput") : document.getElementById("isbnInput");
  console.log("checkLibrary called, addMode =", addMode);
  console.log("ISBN entered:", isbnField.value.trim());

  const isbnInput = isbnField.value.trim();
  const resultsDiv = document.getElementById("searchResults");
  const bookList = document.getElementById("bookList");

  resultsDiv.innerHTML = "";
  bookList.innerHTML = "";

  if (!isbnInput) {
    if (!addMode) loadBooks();
    return;
  }

  const booksRef = collection(db, "books");
  const q = query(booksRef, where("isbn", "==", isbnInput), where("username", "==", username));
  const snap = await getDocs(q);

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

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnInput}`);
    const data = await res.json();
    console.log("Fetching from Google Books:", `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnInput}`);


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
          ${addMode ? `<button class="addBookBtn"> Add </button>` : ""}
        </div>
      </div>
    `;

    if (addMode) {
      document.querySelector(".addBookBtn").onclick = async () => {
        await addDoc(booksRef, {
          isbn: isbnInput,
          title,
          author,
          publisher,
          thumbnail,
          username,
          timestamp: serverTimestamp()
        });
        alert(`✅ "${title}" added to your library.`);
        resultsDiv.innerHTML = "";
        loadBooks();
      };
    }
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
    // Remove from database
    await deleteDoc(doc(db, "books", bookId));

    // Find and update the corresponding DOM element
    const button = document.querySelector(`button[onclick="deleteBook('${bookId}')"]`);
    if (button) {
      const bookRow = button.closest(".bookListing");

      // Grey out and mark as removed
      if (bookRow) {
        bookRow.style.opacity = "0.5";
        bookRow.style.pointerEvents = "none";
        bookRow.innerHTML += `<div style="color: red; margin-top: 8px;"><em>❌ Book removed</em></div>`;
      }
    }
  } catch (error) {
    console.error("Error deleting book:", error);
    alert("⚠️ Could not delete the book.");
  }
};

  
let lastVisibleDoc = null;
let isLoadingBooks = false;
let hasMoreBooks = true;
let batchSize = Math.ceil(window.innerHeight / 160); // Rough estimate: 160px per book row
batchSize = Math.max(batchSize, 15); // Minimum 15
console.log("Batch size set to:", batchSize);

  
window.loadBooks = async function () {
  if (isLoadingBooks || !hasMoreBooks) return;
  isLoadingBooks = true;

  const bookList = document.getElementById("bookList");
  const booksRef = collection(db, "books");

  const sortOrder = document.getElementById("sortOrder")?.value || "timestamp_desc";
  let orderField = "timestamp";
  let direction = "desc";

  if (sortOrder === "author_asc") {
    orderField = "author";
    direction = "asc";
  } else if (sortOrder === "title_asc") {
    orderField = "title";
    direction = "asc";
  }
  


  let q = query(
    booksRef,
    where("username", "==", username),
    orderBy(orderField, direction),
    ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : []),
    limit(batchSize)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    if (!lastVisibleDoc) {
      bookList.innerHTML = "<li>You don't have any books in your library yet.</li>";
    }
    hasMoreBooks = false;
    isLoadingBooks = false;
    return;
  }

  snap.forEach(docSnap => {
    const b = docSnap.data();
    const li = document.createElement("li");
    li.classList.add("bookListing");
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
          <button class="delete-button" onclick="deleteBook('${docSnap.id}')"><p> Remove </p></button>
        </div>
      </div>
    `;
    bookList.appendChild(li);
  });

  lastVisibleDoc = snap.docs[snap.docs.length - 1];
  if (snap.docs.length < batchSize) hasMoreBooks = false;
  isLoadingBooks = false;
}
  

window.searchGoogleBooks = async function (isAddMode = false) {
  const title = isAddMode ? document.getElementById("addTitleInput").value.trim() : document.getElementById("titleInput").value.trim();
  const author = isAddMode ? document.getElementById("addAuthorInput").value.trim() : document.getElementById("authorInput").value.trim();
  const resultsDiv = document.getElementById("searchResults");
  resultsDiv.innerHTML = "";

  if (!title && !author) {
    resultsDiv.textContent = "❗ Enter a title or author to search.";
    return;
  }

  if (!isAddMode) {
    // 🔍 CHECK LIBRARY MODE: search user's Firestore only
    const booksRef = collection(db, "books");
    const q = query(booksRef, where("username", "==", username), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const allBooks = snap.docs.map(doc => doc.data());

    const options = {
      keys: ["title", "author"],
      threshold: 0.4,
      includeScore: true
    };
    const fuse = new Fuse(allBooks, options);
    const inputQuery = title || author;
    const results = fuse.search(inputQuery);

    if (results.length === 0) {
      resultsDiv.textContent = "❌ No matching books found in your library.";
      return;
    }

    resultsDiv.innerHTML += `<p><strong>📚 Books found in your library:</strong></p>`;
    results.forEach(result => {
      const b = result.item;
      const bookDiv = document.createElement("div");
      bookDiv.classList.add("bookRow");
      bookDiv.innerHTML = `
        <div class="bookThumbnail">
          ${b.thumbnail ? `<img src="${b.thumbnail}" alt="Book cover">` : ""}
        </div>
        <div class="bookInfo">
          <strong>${b.title}</strong><br>
          by ${b.author}<br>
          Publisher: ${b.publisher}<br>
          ISBN: ${b.isbn}<br>
        </div>
      `;
      resultsDiv.appendChild(bookDiv);
    });
    return;
  }

  // ➕ ADD MODE: search Google Books
let queryStr = "";
if (title) queryStr += `intitle:${title}`;
if (author) queryStr += (queryStr ? "+" : "") + `inauthor:${author}`;

let startIndex = 0;
let loading = false;

async function loadGoogleBooksBatch() {
  if (loading) return;
  loading = true;
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryStr)}&startIndex=${startIndex}&maxResults=10`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      if (startIndex === 0) resultsDiv.innerHTML += "<p>❌ No books found in Google Books.</p>";
      return;
    }

    if (startIndex === 0) resultsDiv.innerHTML += `<p><strong>🔍 Books found on Google Books:</strong></p>`;

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
        <div class="bookThumbnail">
          ${thumbnail ? `<img src="${thumbnail}" alt="Book cover">` : ""}
        </div>
        <div class="bookInfo">
          <strong>${bookTitle}</strong><br>
          by ${bookAuthor}<br>
          Publisher: ${publisher}<br>
          ISBN: ${isbn}<br>
          <button class="addBookBtn" onclick="addToLibrary('${isbn}', '${bookTitle.replace(/'/g, "\\'")}', '${bookAuthor.replace(/'/g, "\\'")}', '${publisher.replace(/'/g, "\\'")}', '${thumbnail}')">Add</button>

        </div>
      `;
      resultsDiv.appendChild(bookDiv);
    });
    startIndex += 10;
  } catch (error) {
    console.error("Google Books API error:", error);
    resultsDiv.innerHTML += "<p>⚠️ Error searching Google Books.</p>";
  }
  loading = false;
}

await loadGoogleBooksBatch();

window.addEventListener("scroll", async () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
  if (nearBottom) {
    await loadGoogleBooksBatch();
  }
});
    
  };


window.addManualBook = async function () {
  const title = document.getElementById("manualTitle").value.trim();
  const author = document.getElementById("manualAuthor").value.trim();
  const isbn = document.getElementById("manualIsbn").value.trim();
  const publisher = document.getElementById("manualPublisher").value.trim();
  const resultsDiv = document.getElementById("searchResults");

  if (!title || !author) {
    alert("❗ Please enter both a title and an author.");
    if (!title) {
      document.getElementById("manualTitle").focus();
    } else {
      document.getElementById("manualAuthor").focus();
    }
    return;
  }

  const book = {
    title,
    author: author, 
    isbn: isbn || "Manual",
    publisher: publisher || "Unknown Publisher",
    thumbnail: ""
  };

  await addDoc(collection(db, "books"), { ...book, username, timestamp: serverTimestamp() });

  alert(`✅ "${title}" added manually to your library.`);
  resultsDiv.innerHTML = "";
  loadBooks();
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
    username,
    timestamp: serverTimestamp() // ✅ THIS IS THE FIX
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
      document.getElementById("addIsbnInput").value = code;
      Quagga.stop();
      scannerElem.style.display = "none";
      window.checkLibrary(true);
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
  };

  window.reloadBooks = function () {
    lastVisibleDoc = null;
    hasMoreBooks = true;
    isLoadingBooks = false;
    document.getElementById("bookList").innerHTML = "";
    loadBooks();
  };

window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
  if (nearBottom) {
    loadBooks();
  }
});
