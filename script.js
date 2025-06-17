// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyCZNCCF-MuqSVxasc0anAeEXBeA8VicRtI",
  authDomain: "bucketlist-93504.firebaseapp.com",
  projectId: "bucketlist-93504",
  storageBucket: "bucketlist-93504.appspot.com",
  messagingSenderId: "712638862581",
  appId: "1:712638862581:web:51399cea38486d27af61bc",
  databaseURL: "https://bucketlist-93504-default-rtdb.firebaseio.com/", // Added Realtime Database URL
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const authContainer = document.getElementById("authContainer");
const appContainer = document.getElementById("appContainer");
const taskList = document.getElementById("taskList");
const categoryList = document.getElementById("categoryList");

// State Variables
let currentFilter = "all";
let editIndex = -1;

// Show/hide app based on auth state
function showApp(loggedIn) {
  authContainer.style.display = loggedIn ? "none" : "flex";
  appContainer.style.display = loggedIn ? "flex" : "none";
  if (loggedIn) {
    updateHeader();
    renderItems();
    requestNotificationPermission();
  } else {
    clearTaskViews();
  }
}

// Auth State Observer
auth.onAuthStateChanged((user) => {
  showApp(!!user);
});

// Update header with user info
function updateHeader() {
  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  // Get current hour
  const hour = new Date().getHours();

  // Determine greeting based on time of day
  let greeting;
  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }

  document.getElementById(
    "greetingText"
  ).textContent = `${greeting}, ${displayName}`;

  // Update date
  const date = new Date();
  const day = date.getDate();
  const month = date
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  document.getElementById("dateCircle").innerHTML = `${day}<br>${month}`;
}
// Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  sidebar.classList.toggle("active");
  if (window.innerWidth <= 768) {
    mainContent.classList.toggle("sidebar-open");
  }
}

// Authentication Functions
function signup() {
  const email = document.getElementById("emailSignup").value;
  const password = document.getElementById("passwordSignup").value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  auth
    .createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const displayName = email.split("@")[0];
      return user.updateProfile({ displayName });
    })
    .catch((error) => {
      alert(error.message);
    });
}

function login() {
  const email = document.getElementById("emailLogin").value;
  const password = document.getElementById("passwordLogin").value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  auth.signInWithEmailAndPassword(email, password).catch((error) => {
    alert(error.message);
  });
}

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((error) => {
    alert(error.message);
  });
}

function logout() {
  auth.signOut();
}

// Task Management with Firebase Realtime Database
function getTasks(callback) {
  const user = auth.currentUser;
  if (!user) return callback([]);

  database
    .ref(`users/${user.uid}/tasks`)
    .once("value")
    .then((snapshot) => {
      const tasks = snapshot.val() || [];
      callback(Array.isArray(tasks) ? tasks : []);
    })
    .catch((error) => {
      console.error("Error getting tasks:", error);
      callback([]);
    });
}

function saveTasks(tasks, callback = () => {}) {
  const user = auth.currentUser;
  if (!user) return;

  database
    .ref(`users/${user.uid}/tasks`)
    .set(tasks)
    .then(() => callback())
    .catch((error) => {
      console.error("Error saving tasks:", error);
    });
}

function clearTaskViews() {
  taskList.innerHTML = "";
}

function calculateDaysLeft(endDate, completed) {
  if (completed) return { text: "Completed", class: "completed" };
  if (!endDate) return { text: "No due date", class: "" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(endDate);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { text: `${diffDays} days left`, class: "" };
  } else if (diffDays === 0) {
    return { text: "Due today", class: "" };
  } else {
    return { text: `Overdue by ${Math.abs(diffDays)} days`, class: "overdue" };
  }
}

// Render tasks with real-time updates
function renderItems() {
  getTasks((tasks) => {
    taskList.innerHTML = "";
    categoryList.innerHTML = "";

    const categories = [
      ...new Set(tasks.map((t) => t.category).filter((c) => c)),
    ];
    const today = new Date().toISOString().split("T")[0];

    // Populate categories in sidebar
    categories.forEach((cat) => {
      const li = document.createElement("li");
      li.dataset.filter = `category:${cat}`;
      li.innerHTML = `<i class="fas fa-folder"></i> <span>${cat}</span>`;
      li.addEventListener("click", () => {
        document
          .querySelectorAll(".sidebar-menu li")
          .forEach((l) => l.classList.remove("active"));
        li.classList.add("active");
        currentFilter = `category:${cat}`;
        renderItems();
        if (window.innerWidth <= 768) {
          toggleSidebar();
        }
      });
      categoryList.appendChild(li);
    });

    // Filter tasks
    const filteredTasks = tasks.filter((task) => {
      if (currentFilter === "all") return true;
      if (currentFilter === "due-today")
        return task.endDate && task.endDate <= today && !task.completed;
      if (currentFilter === "completed") return task.completed;
      if (currentFilter.startsWith("category:"))
        return task.category === currentFilter.split(":")[1];
      return true;
    });

    // Render tasks
    filteredTasks.forEach((task, i) => {
      const row = document.createElement("div");
      row.className = `task-row ${task.completed ? "completed" : ""}`;
      if (task.endDate && task.endDate < today && !task.completed) {
        row.classList.add("overdue");
      }

      const daysLeft = calculateDaysLeft(task.endDate, task.completed);

      row.innerHTML = `
        <div><input type="checkbox" ${
          task.completed ? "checked" : ""
        } onchange="toggleComplete(${i}, this)"></div>
        <div class="title ${
          task.endDate && task.endDate < today && !task.completed
            ? "overdue"
            : ""
        }">
          ${task.text}
        </div>
        <div class="quick-look">
          Edit Task
        </div>
        <div class="days-left ${daysLeft.class}">
          ${daysLeft.text}
        </div>
        <div class="category">${task.category || "General"}</div>
       
        <div class="delete-action">
          <i class="fas fa-trash" onclick="event.stopPropagation(); deleteItem(${i})"></i>
        </div>
      `;
      row.addEventListener("click", (e) => {
        if (!e.target.matches("input[type='checkbox']")) openModal(i);
      });
      taskList.appendChild(row);
    });
  });
}

// Task Operations
function toggleComplete(index, checkbox) {
  getTasks((tasks) => {
    tasks[index].completed = checkbox.checked;
    saveTasks(tasks, () => {
      renderItems();
      if (tasks[index].completed) {
        notify(
          "Task Completed",
          `${tasks[index].text} has been marked as completed! 🎉`
        );
      } else {
        notify(
          "Task Reopened",
          `${tasks[index].text} has been marked as incomplete.`
        );
      }
    });
  });
}

function deleteItem(index) {
  if (confirm("Delete this task?")) {
    getTasks((tasks) => {
      tasks.splice(index, 1);
      saveTasks(tasks, () => renderItems());
    });
  }
}

// Modal Functions
function openAddTaskModal() {
  document.getElementById("bucketForm").reset();
  document.getElementById("addTaskModal").style.display = "flex";
}

function closeAddTaskModal() {
  document.getElementById("addTaskModal").style.display = "none";
}

document.getElementById("bucketForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const input = document.getElementById("bucketInput").value.trim();
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const priority = document.getElementById("priorityInput").value;
  const category = document.getElementById("categoryInput").value;
  const subtasksInput = document.getElementById("subtasks").value;

  if (!input) {
    alert("Task description cannot be empty");
    return;
  }

  const subtasks = subtasksInput
    .split(",")
    .map((t) => ({ text: t.trim(), done: false, dueDate: "" }))
    .filter((t) => t.text);

  const task = {
    text: input,
    startDate: start,
    endDate: end,
    completed: false,
    subtasks,
    priority,
    category,
    notes: "",
  };

  getTasks((tasks) => {
    tasks.push(task);
    saveTasks(tasks, () => {
      renderItems();
      closeAddTaskModal();
      checkDueDates();
    });
  });
});

function openModal(index) {
  editIndex = index;
  getTasks((tasks) => {
    const task = tasks[index];
    document.getElementById("editTitle").value = task.text;
    document.getElementById("editCategory").value = task.category || "";
    document.getElementById("editPriority").value = task.priority;
    document.getElementById("editStartDate").value = task.startDate || "";
    document.getElementById("editEndDate").value = task.endDate || "";
    document.getElementById("editNotes").value = task.notes || "";

    const subtaskList = document.getElementById("subtaskList");
    subtaskList.innerHTML = "";
    (task.subtasks || []).forEach((st, i) => {
      const div = document.createElement("div");
      div.className = "subtask-item";
      div.innerHTML = `
        <input type="checkbox" ${
          st.done ? "checked" : ""
        } onchange="toggleModalSubtask(${i})">
        <input type="text" value="${
          st.text
        }" onchange="updateModalSubtask(${i}, this.value)">
        <input type="date" value="${
          st.dueDate || ""
        }" onchange="updateModalSubtaskDueDate(${i}, this.value)">
        <button type="button" onclick="removeModalSubtask(${i})"><i class="fas fa-trash"></i></button>
      `;
      subtaskList.appendChild(div);
    });

    const progress = task.subtasks?.length
      ? (
          (task.subtasks.filter((s) => s.done).length / task.subtasks.length) *
          100
        ).toFixed(0)
      : 0;
    document.getElementById("modalProgressBar").style.width = `${progress}%`;
    document.getElementById(
      "modalProgressText"
    ).textContent = `${progress}% Complete`;

    document.getElementById("taskModal").style.display = "flex";
  });
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
  editIndex = -1;
}

// Subtask Operations
function addSubtaskToModal() {
  const newSubtask = document.getElementById("newSubtask").value.trim();
  if (!newSubtask) return;

  getTasks((tasks) => {
    tasks[editIndex].subtasks = tasks[editIndex].subtasks || [];
    tasks[editIndex].subtasks.push({
      text: newSubtask,
      done: false,
      dueDate: "",
    });
    saveTasks(tasks, () => {
      openModal(editIndex);
      document.getElementById("newSubtask").value = "";
    });
  });
}

function toggleModalSubtask(index) {
  getTasks((tasks) => {
    tasks[editIndex].subtasks[index].done =
      !tasks[editIndex].subtasks[index].done;
    saveTasks(tasks, () => {
      openModal(editIndex);
      checkDueDates();
    });
  });
}

function updateModalSubtask(index, text) {
  getTasks((tasks) => {
    tasks[editIndex].subtasks[index].text = text;
    saveTasks(tasks);
  });
}

function updateModalSubtaskDueDate(index, dueDate) {
  getTasks((tasks) => {
    tasks[editIndex].subtasks[index].dueDate = dueDate;
    saveTasks(tasks, () => checkDueDates());
  });
}

function removeModalSubtask(index) {
  getTasks((tasks) => {
    tasks[editIndex].subtasks.splice(index, 1);
    saveTasks(tasks, () => openModal(editIndex));
  });
}

document
  .getElementById("editTaskForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    getTasks((tasks) => {
      tasks[editIndex] = {
        ...tasks[editIndex],
        text: document.getElementById("editTitle").value,
        category: document.getElementById("editCategory").value,
        priority: document.getElementById("editPriority").value,
        startDate: document.getElementById("editStartDate").value,
        endDate: document.getElementById("editEndDate").value,
        notes: document.getElementById("editNotes").value,
      };
      saveTasks(tasks, () => {
        closeModal();
        renderItems();
        checkDueDates();
      });
    });
  });

// Category Management
function openNewCategoryModal() {
  document.getElementById("newCategoryInput").value = "";
  document.getElementById("newCategoryModal").style.display = "flex";
}

function closeNewCategoryModal() {
  document.getElementById("newCategoryModal").style.display = "none";
}

document
  .getElementById("newCategoryForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const newCategory = document
      .getElementById("newCategoryInput")
      .value.trim();
    if (!newCategory) return;

    getTasks((tasks) => {
      if (!tasks.some((t) => t.category === newCategory)) {
        tasks.push({
          text: `Placeholder for ${newCategory}`,
          category: newCategory,
          priority: "low",
          completed: false,
          subtasks: [],
          notes: "",
        });
        saveTasks(tasks, () => {
          closeNewCategoryModal();
          renderItems();
          if (window.innerWidth <= 768) {
            toggleSidebar();
          }
        });
      } else {
        alert("Category already exists");
      }
    });
  });

// Notifications
function requestNotificationPermission() {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function notify(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function checkDueDates() {
  getTasks((tasks) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    tasks.forEach((task) => {
      if (task.endDate === todayStr && !task.completed) {
        notify("Task Due Today", `${task.text} is due today!`);
      } else if (task.endDate === tomorrowStr && !task.completed) {
        notify("Task Due Tomorrow", `${task.text} is due tomorrow.`);
      }
      (task.subtasks || []).forEach((st) => {
        if (st.dueDate === todayStr && !st.done) {
          notify(
            "Subtask Due Today",
            `${st.text} in ${task.text} is due today!`
          );
        } else if (st.dueDate === tomorrowStr && !st.done) {
          notify(
            "Subtask Due Tomorrow",
            `${st.text} in ${task.text} is due tomorrow.`
          );
        }
      });
    });
  });
}

// Sidebar Filters
document
  .querySelectorAll(".sidebar-menu > li:not([data-filter='categories'])")
  .forEach((li) => {
    li.addEventListener("click", () => {
      document
        .querySelectorAll(".sidebar-menu li")
        .forEach((l) => l.classList.remove("active"));
      li.classList.add("active");
      currentFilter = li.dataset.filter;
      renderItems();
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
    });
  });

// Export/Import
function exportTasksJSON() {
  getTasks((tasks) => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bucket_tasks.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

document.getElementById("importFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        saveTasks(imported, () => {
          renderItems();
          document.getElementById("fileNameDisplay").textContent = file.name;
        });
      } else {
        alert("Invalid JSON file. Please upload a valid task file.");
      }
    } catch (error) {
      alert("Error parsing JSON file");
    }
  };
  reader.readAsText(file);
});

// PDF Export
function exportTasksPDF() {
  getTasks((tasks) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const formattedTasks = tasks.map((t) => [
      t.text,
      t.startDate || "N/A",
      t.endDate || "N/A",
      t.completed ? "Yes" : "No",
      t.category || "General",
      t.priority,
      t.notes || "None",
    ]);

    doc.text("Bucket List Tasks", 14, 16);
    doc.autoTable({
      head: [
        [
          "Task",
          "Start Date",
          "End Date",
          "Completed",
          "Category",
          "Priority",
          "Notes",
        ],
      ],
      body: formattedTasks,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [74, 144, 226] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save("bucket_tasks.pdf");
  });
}

// Auth View Toggle
function toggleForm(isRegister) {
  const container = document.getElementById("authContainer");
  if (isRegister) {
    container.classList.add("right-panel-active");
  } else {
    container.classList.remove("right-panel-active");
  }
}

const container = document.querySelector(".auth-container");
const signInBtn = document.getElementById("mobileSignInBtn");
const signUpBtn = document.getElementById("mobileSignUpBtn");

function updateView(mode) {
  if (window.innerWidth <= 768) {
    container.classList.toggle("show-signin", mode === "signin");
    container.classList.toggle("show-signup", mode === "signup");
  } else {
    container.classList.toggle("right-panel-active", mode === "signup");
  }
}

signInBtn.addEventListener("click", () => {
  updateView("signin");
  signInBtn.classList.add("active");
  signUpBtn.classList.remove("active");
});

signUpBtn.addEventListener("click", () => {
  updateView("signup");
  signInBtn.classList.remove("active");
  signUpBtn.classList.add("active");
});

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  updateView("signin");

  // Check due dates periodically
  setInterval(checkDueDates, 24 * 60 * 60 * 1000); // Daily
  checkDueDates();
});
