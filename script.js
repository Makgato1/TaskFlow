(() => {
  "use strict";

  const STORAGE_KEY = "taskflow.tasks.v1";
  const THEME_KEY = "taskflow.theme.v1";
  const $ = (selector) => document.querySelector(selector);

  const els = {
    form: $("#taskForm"), input: $("#taskInput"), list: $("#taskList"),
    empty: $("#emptyState"), emptyTitle: $("#emptyTitle"), emptyCopy: $("#emptyCopy"),
    emptyAdd: $("#emptyAdd"), clearCompleted: $("#clearCompleted"),
    themeToggle: $("#themeToggle"), themeIcon: $("#themeIcon"), themeLabel: $("#themeLabel"),
    toast: $("#toast"), breadcrumb: $("#breadcrumbCurrent"), pageTitle: $("#pageTitle"),
    pageSubtitle: $("#pageSubtitle"), heading: $("#listHeading"), headingCount: $("#headingCount"),
    allCount: $("#allCount"), activeCount: $("#activeCount"), completedCount: $("#completedCount"),
    tabAll: $("#tabAll"), tabActive: $("#tabActive"), tabCompleted: $("#tabCompleted"),
    totalStat: $("#totalStat"), activeStat: $("#activeStat"), completedStat: $("#completedStat"),
    completedNote: $("#completedNote"), remainingText: $("#remainingText"),
    progressBar: $("#progressBar"), progressText: $("#progressText")
  };

  let tasks = loadTasks();
  let currentFilter = "all";
  let toastTimer;

  function loadTasks() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored.filter(t => t && typeof t.id === "string" && typeof t.title === "string") : [];
    } catch (error) {
      console.warn("TaskFlow could not read saved tasks.", error);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      showToast("Could not save changes in this browser.");
      console.warn("TaskFlow could not save tasks.", error);
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function formatTaskDate(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Added just now";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Added today";
    if (date.toDateString() === yesterday.toDateString()) return "Added yesterday";
    return `Added ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }

  function visibleTasks() {
    const filtered = tasks.filter(task => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      return true;
    });
    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function render() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    els.allCount.textContent = total;
    els.activeCount.textContent = active;
    els.completedCount.textContent = completed;
    els.tabAll.textContent = total;
    els.tabActive.textContent = active;
    els.tabCompleted.textContent = completed;
    els.totalStat.textContent = total;
    els.activeStat.textContent = active;
    els.completedStat.textContent = completed;
    els.completedNote.textContent = completed ? `${percent}% of your list complete` : "Celebrate each win";
    els.progressBar.style.width = `${percent}%`;
    els.progressText.textContent = `${percent}%`;
    els.clearCompleted.hidden = completed === 0;
    els.headingCount.textContent = visibleTasks().length;

    document.querySelectorAll("[data-filter]").forEach(button => {
      const isActive = button.dataset.filter === currentFilter;
      if (button.classList.contains("nav-item")) button.classList.toggle("active", isActive);
      else button.classList.toggle("selected", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    const filterNames = { all: "All tasks", active: "Active tasks", completed: "Completed tasks" };
    els.breadcrumb.textContent = filterNames[currentFilter];
    els.heading.childNodes[0].textContent = currentFilter === "all" ? "Your tasks " : filterNames[currentFilter] + " ";
    els.pageTitle.innerHTML = currentFilter === "completed"
      ? 'Look how far <span>you’ve come.</span>'
      : currentFilter === "active" ? 'One thing at a time<span>.</span>' : 'A little progress <span>goes a long way.</span>';
    els.pageSubtitle.textContent = currentFilter === "completed"
      ? "Every checked box is a win worth celebrating."
      : currentFilter === "active" ? "Keep going - you’re making it happen." : "Keep your focus on what matters most.";

    const shown = visibleTasks();
    els.list.innerHTML = shown.map(task => `
      <article class="task-row ${task.completed ? "is-completed" : ""}" data-task-id="${escapeHTML(task.id)}">
        <button class="task-check ${task.completed ? "checked" : ""}" type="button" data-action="toggle" aria-label="${task.completed ? "Mark as active" : "Mark as completed"}" aria-pressed="${task.completed}">
          ${task.completed ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5"/></svg>' : ""}
        </button>
        <div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div><div class="task-meta">${formatTaskDate(task.createdAt)}</div></div>
        <span class="task-badge">${task.completed ? "Done" : "In progress"}</span>
        <button class="delete-task" type="button" data-action="delete" aria-label="Delete task">×</button>
      </article>`).join("");

    const isEmpty = shown.length === 0;
    els.empty.hidden = !isEmpty;
    if (isEmpty) {
      if (currentFilter === "active" && tasks.length) {
        els.emptyTitle.textContent = "All clear for now!";
        els.emptyCopy.textContent = "You’ve completed every task. Take a breath and enjoy it.";
        els.emptyAdd.hidden = true;
      } else if (currentFilter === "completed") {
        els.emptyTitle.textContent = "Your wins are waiting.";
        els.emptyCopy.textContent = "Complete a task and it will show up here.";
        els.emptyAdd.hidden = true;
      } else {
        els.emptyTitle.textContent = "A fresh start.";
        els.emptyCopy.textContent = "Add your first task and turn your plans into progress.";
        els.emptyAdd.hidden = false;
      }
    }
    els.remainingText.textContent = active === 0
      ? (total ? "Everything is done. Nicely done!" : "You're all caught up.")
      : `${active} task${active === 1 ? "" : "s"} left to complete`;
  }

  function addTask(title) {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      els.input.focus();
      return;
    }
    tasks.push({
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: cleanTitle,
      completed: false,
      createdAt: Date.now()
    });
    saveTasks();
    currentFilter = "all";
    render();
    els.input.value = "";
    els.input.focus();
    showToast("Task added to your list");
  }

  function toggleTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
    showToast(task.completed ? "Nice work — task completed!" : "Task moved back to active");
  }

  function deleteTask(id) {
    const before = tasks.length;
    tasks = tasks.filter(task => task.id !== id);
    if (tasks.length === before) return;
    saveTasks();
    render();
    showToast("Task deleted");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function setFilter(filter) {
    if (!["all", "active", "completed"].includes(filter)) return;
    currentFilter = filter;
    render();
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark", dark);
    els.themeIcon.textContent = dark ? "☀" : "☾";
    els.themeLabel.textContent = dark ? "Light mode" : "Dark mode";
    els.themeToggle.setAttribute("aria-pressed", String(dark));
    document.querySelector('meta[name="theme-color"]').content = dark ? "#171824" : "#f6f7fb";
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (_) {}
  }

  els.form.addEventListener("submit", event => {
    event.preventDefault();
    addTask(els.input.value);
  });

  document.addEventListener("click", event => {
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      setFilter(filterButton.dataset.filter);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const row = actionButton.closest("[data-task-id]");
      if (!row) return;
      if (actionButton.dataset.action === "toggle") toggleTask(row.dataset.taskId);
      if (actionButton.dataset.action === "delete") deleteTask(row.dataset.taskId);
    }
  });

  els.clearCompleted.addEventListener("click", () => {
    const count = tasks.filter(task => task.completed).length;
    if (!count) return;
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    render();
    showToast(`${count} completed task${count === 1 ? "" : "s"} cleared`);
  });

  els.themeToggle.addEventListener("click", () => {
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });

  els.emptyAdd.addEventListener("click", () => els.input.focus());

  const now = new Date();
  $("#dateDay").textContent = now.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  $("#dateNumber").textContent = now.getDate();
  $("#dateMonth").textContent = now.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  $("#dateLabel").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
  $("#year").textContent = now.getFullYear();

  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "light"; } catch (_) {}
  applyTheme(savedTheme);
  render();
})();
