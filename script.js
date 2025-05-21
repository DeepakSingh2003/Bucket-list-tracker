// 🔧 Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZNCCF-MuqSVxasc0anAeEXBeA8VicRtI",
  authDomain: "bucketlist-93504.firebaseapp.com",
  projectId: "bucketlist-93504",
  storageBucket: "bucketlist-93504.firebasestorage.app",
  messagingSenderId: "712638862581",
  appId: "1:712638862581:web:51399cea38486d27af61bc",
};

// 🔌 Initialize Firebase and Authentication
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// 🎛️ Toggle visibility of login form and app content
function showApp(loggedIn) {
  document.getElementById("authContainer").style.display = loggedIn
    ? "none"
    : "block";
  document.getElementById("appContainer").style.display = loggedIn
    ? "block"
    : "none";
}

// 🧠 Listen to login/logout events
auth.onAuthStateChanged((user) => {
  showApp(!!user); // Show app if user is logged in
  if (user) renderItems(); // Load tasks
});

// 🔐 User login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password).catch(alert); // Show error if login fails
}

// 📝 User signup
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password).catch(alert); // Show error if signup fails
}

// 🔓 Google Sign-In
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(alert); // Show error if Google login fails
}

// 🚪 User logout
function logout() {
  auth.signOut();
}

// ➕ Handle new bucket list item submission
document.getElementById("bucketForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const input = document.getElementById("bucketInput").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const item = {
    text: input,
    completed: false,
    startDate: start,
    endDate: end,
  };

  const tasks = getTasks();
  tasks.push(item);
  saveTasks(tasks);
  renderItems();
  this.reset(); // Reset form fields
});

// 📥 Get tasks from localStorage
function getTasks() {
  return JSON.parse(localStorage.getItem("bucketTasks") || "[]");
}

// 📤 Save tasks to localStorage
function saveTasks(tasks) {
  localStorage.setItem("bucketTasks", JSON.stringify(tasks));
}

// 📋 Render tasks into the DOM
function renderItems() {
  const list = document.getElementById("bucketList");
  const previous = document.getElementById("previousList");
  list.innerHTML = "";
  previous.innerHTML = "";

  getTasks().forEach((item, index) => {
    const li = document.createElement("li");
    li.className = item.completed ? "completed" : "";
    li.innerHTML = `
      <div class="info">${item.text}</div>
      <div class="date-info">
        <div>From: ${item.startDate || "N/A"}</div>
        <div>To: ${item.endDate || "N/A"}</div>
      </div>
      <div class="buttons">
        <button class="complete-btn" onclick="toggleComplete(${index})">
          ${item.completed ? "Undo" : "Complete"}
        </button>
        <button class="delete-btn" onclick="deleteItem(${index})">Delete</button>
      </div>`;
    (item.completed ? previous : list).appendChild(li);
  });
}

// ✅ Toggle task completion status
function toggleComplete(index) {
  const tasks = getTasks();
  tasks[index].completed = !tasks[index].completed;
  saveTasks(tasks);
  renderItems();
}

// 🗑️ Delete task by index
function deleteItem(index) {
  const tasks = getTasks();
  tasks.splice(index, 1);
  saveTasks(tasks);
  renderItems();
}

// 📤 Export tasks as JSON file
function exportTasksJSON() {
  const blob = new Blob([JSON.stringify(getTasks(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bucket_tasks.json";
  a.click();
  URL.revokeObjectURL(url); // Clean up URL
}

// 📥 Import tasks from JSON file
document.getElementById("importFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        saveTasks(imported);
        renderItems();
      }
    };
    reader.readAsText(file); // Read the JSON as text
  }
});

// 📄 Export tasks as PDF using jsPDF and autoTable
function exportTasksPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const tasks = getTasks().map((t) => [
    t.text,
    t.startDate,
    t.endDate,
    t.completed ? "Yes" : "No",
  ]);

  doc.text("Bucket List Tasks", 14, 16);
  doc.autoTable({
    head: [["Task", "Start Date", "End Date", "Completed"]],
    body: tasks,
    startY: 20,
  });

  doc.save("bucket_tasks.pdf");
}
