/* app.js — NLP Coach Companion */

let appInitialized = false;

function initializeApp() {
  if (appInitialized || !window.APP_DATA) return;
  appInitialized = true;

  const data = window.APP_DATA;

  const demoBadge = document.querySelector(".demo-badge");
  if (demoBadge && data.demoLabel) demoBadge.textContent = data.demoLabel;

  // =================================================================
  // State persistence (localStorage)
  // =================================================================
  const STORAGE_KEY = "nlpCoachCompanionState";

  function defaultState() {
    return {
      favorites: [],           // coaching-question ids
      completedTopics: [],     // learning-topic ids
      viewedQuestions: [],     // "<topicId>::<questionIndex>" ids revealed in Learning
      practicedScenarios: []   // scenario ids whose guidance was opened at least once
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const fallback = defaultState();
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : fallback.favorites,
        completedTopics: Array.isArray(parsed.completedTopics) ? parsed.completedTopics : fallback.completedTopics,
        viewedQuestions: Array.isArray(parsed.viewedQuestions) ? parsed.viewedQuestions : fallback.viewedQuestions,
        practicedScenarios: Array.isArray(parsed.practicedScenarios) ? parsed.practicedScenarios : fallback.practicedScenarios
      };
    } catch (e) {
      console.warn("Could not read saved state, starting fresh.", e);
      return defaultState();
    }
  }

  const state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save state to localStorage.", e);
    }
  }

  function isIn(arr, id) {
    return arr.indexOf(id) !== -1;
  }

  function toggleInArray(arr, id) {
    const idx = arr.indexOf(id);
    if (idx === -1) arr.push(id);
    else arr.splice(idx, 1);
  }

  function markQuestionViewed(qid) {
    if (!isIn(state.viewedQuestions, qid)) {
      state.viewedQuestions.push(qid);
      saveState();
    }
  }

  // =================================================================
  // Navigation
  // =================================================================
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");
  const headerMeta = document.getElementById("header-meta");
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const drawerOverlay = document.getElementById("drawer-overlay");

  function closeMobileMenu() {
    sidebar.classList.remove("is-open");
    drawerOverlay.classList.remove("is-visible");
    drawerOverlay.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "פתיחת תפריט");
  }

  function toggleMobileMenu() {
    const isOpen = sidebar.classList.toggle("is-open");
    drawerOverlay.classList.toggle("is-visible", isOpen);
    drawerOverlay.setAttribute("aria-hidden", isOpen ? "false" : "true");
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    menuToggle.setAttribute("aria-label", isOpen ? "סגירת תפריט" : "פתיחת תפריט");
  }

  function switchView(name) {
    navItems.forEach(b => {
      const isActive = b.dataset.view === name;
      b.classList.toggle("active", isActive);
      if (isActive) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    views.forEach(v => v.classList.toggle("active", v.id === "view-" + name));
    const activeBtn = document.querySelector('.nav-item[data-view="' + name + '"]');
    if (activeBtn) headerMeta.textContent = activeBtn.textContent.trim();
    closeMobileMenu();
  }

  navItems.forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  menuToggle.addEventListener("click", toggleMobileMenu);
  drawerOverlay.addEventListener("click", closeMobileMenu);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileMenu();
  });
  document.querySelector(".header-logo-link").addEventListener("click", () => {
    switchView("home");
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#home") switchView("home");
  });

  // =================================================================
  // Dashboard (ראשי)
  // =================================================================
  function renderDashboardEntryCards() {
    const grid = document.getElementById("dashboard-entry-cards");
    const entries = [
      { view: "learning", title: "המשך/י בחזרה", subtitle: data.learningTopics.length + " נושאי חזרה זמינים" },
      { view: "questions", title: "חפש/י שאלה", subtitle: data.coachingQuestions.length + " שאלות אימון במאגר" },
      { view: "practice", title: "תרגל/י תרחיש", subtitle: data.clientScenarios.length + " תרחישי לקוח לתרגול" }
    ];
    grid.innerHTML = "";
    entries.forEach(entry => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card entry-card";
      card.innerHTML =
        "<h3>" + entry.title + "</h3>" +
        '<div class="card-subtitle" style="margin-block-end:0;">' + entry.subtitle + "</div>";
      card.addEventListener("click", () => switchView(entry.view));
      grid.appendChild(card);
    });
  }

  function renderDashboardStats() {
    const grid = document.getElementById("dashboard-stats");
    const stats = [
      { label: "נושאים שהושלמו", value: state.completedTopics.length + " / " + data.learningTopics.length },
      { label: "שאלות שנצפו", value: state.viewedQuestions.length },
      { label: "מועדפים", value: state.favorites.length },
      { label: "תרגולים", value: state.practicedScenarios.length }
    ];
    grid.innerHTML = "";
    stats.forEach(s => {
      const box = document.createElement("div");
      box.className = "stat-box";
      box.innerHTML =
        '<div class="stat-value">' + s.value + "</div>" +
        '<div class="stat-label">' + s.label + "</div>";
      grid.appendChild(box);
    });
  }

  // =================================================================
  // Review materials (חזרה)
  // =================================================================
  let activeTopicId = data.learningTopics.length ? data.learningTopics[0].id : null;

  function renderLearningHeaderCount() {
    const el = document.getElementById("learning-progress-count");
    el.textContent = state.completedTopics.length + " / " + data.learningTopics.length + " הושלמו";
  }

  function renderTopicSelector() {
    const wrap = document.getElementById("topic-selector");
    wrap.innerHTML = "";
    data.learningTopics.forEach(topic => {
      const done = isIn(state.completedTopics, topic.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill topic-pill" + (topic.id === activeTopicId ? " active" : "");
      btn.textContent = topic.title + (done ? " ✓" : "");
      btn.addEventListener("click", () => {
        activeTopicId = topic.id;
        renderTopicSelector();
        renderTopicDetail();
      });
      wrap.appendChild(btn);
    });
  }

  function renderTopicDetail() {
    const container = document.getElementById("topic-detail");
    const topic = data.learningTopics.find(t => t.id === activeTopicId);
    container.innerHTML = "";
    if (!topic) return;

    const viewedInTopic = topic.questions.filter((q, i) => isIn(state.viewedQuestions, topic.id + "::" + i)).length;
    const isDone = isIn(state.completedTopics, topic.id);

    const qaHtml = topic.questions.map((item, i) => {
      const qid = topic.id + "::" + i;
      const revealed = isIn(state.viewedQuestions, qid);
      return (
        '<div class="qa-block">' +
          '<div class="qa-q">' + item.q + "</div>" +
          (revealed
            ? '<div class="qa-a">' + item.a + "</div>"
            : '<button type="button" class="reveal-btn" data-qid="' + qid + '">הצג תשובה</button>') +
        "</div>"
      );
    }).join("");

    const card = document.createElement("div");
    card.className = "card topic-detail-card";
    card.innerHTML =
      '<div class="topic-detail-header">' +
        "<div>" +
          "<h3>" + topic.title + "</h3>" +
          '<div class="card-subtitle" style="margin-block-end:0;">' + topic.subtitle + "</div>" +
        "</div>" +
        '<span class="progress-pill">' + viewedInTopic + " / " + topic.questions.length + " נצפו</span>" +
      "</div>" +
      qaHtml +
      '<button type="button" class="complete-btn' + (isDone ? " is-done" : "") + '" id="complete-topic-btn">' +
        (isDone ? "✓ נושא הושלם" : "סמן/י נושא כהושלם") +
      "</button>";

    container.appendChild(card);

    container.querySelectorAll(".reveal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        markQuestionViewed(btn.dataset.qid);
        renderTopicDetail();
        renderDashboardStats();
      });
    });

    document.getElementById("complete-topic-btn").addEventListener("click", () => {
      toggleInArray(state.completedTopics, topic.id);
      saveState();
      renderTopicDetail();
      renderTopicSelector();
      renderLearningHeaderCount();
      renderDashboardStats();
    });
  }

  // =================================================================
  // Questions bank (שאלות)
  // =================================================================
  const questionListEl = document.getElementById("question-list");
  const searchInput = document.getElementById("question-search");
  const pillsEl = document.getElementById("category-pills");
  let activeCategory = "הכל";

  function renderEmptyState(message, actionLabel, action) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML =
      '<div class="empty-state-icon" aria-hidden="true">✦</div>' +
      '<p>' + message + "</p>" +
      '<button type="button" class="empty-state-action">' + actionLabel + "</button>";
    empty.querySelector(".empty-state-action").addEventListener("click", action);
    return empty;
  }

  function renderCategoryPills() {
    const cats = ["הכל"].concat(data.questionCategories);
    pillsEl.innerHTML = "";
    cats.forEach(cat => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "pill" + (cat === activeCategory ? " active" : "");
      pill.setAttribute("aria-pressed", cat === activeCategory ? "true" : "false");
      pill.textContent = cat;
      pill.addEventListener("click", () => {
        activeCategory = cat;
        renderCategoryPills();
        renderQuestionList();
      });
      pillsEl.appendChild(pill);
    });
  }

  function questionRowHtml(item, isFav) {
    return (
      '<div class="question-row-main">' +
        '<div class="q-text">' + item.text + "</div>" +
        (item.context ? '<div class="q-context">' + item.context + "</div>" : "") +
      "</div>" +
      '<div class="question-row-actions">' +
        '<span class="q-category-tag">' + item.category + "</span>" +
        '<button type="button" class="fav-toggle' + (isFav ? " is-active" : "") + '" data-id="' + item.id + '" ' +
          'aria-pressed="' + (isFav ? "true" : "false") + '" aria-label="' + (isFav ? "הסר/י ממועדפים" : "הוסף/י למועדפים") + '">' +
          (isFav ? "★" : "☆") +
        "</button>" +
      "</div>"
    );
  }

  function renderQuestionList() {
    document.getElementById("questions-count").textContent = data.coachingQuestions.length;

    const term = searchInput.value.trim();
    const filtered = data.coachingQuestions.filter(item => {
      const matchesCategory = activeCategory === "הכל" || item.category === activeCategory;
      const matchesSearch = term === "" || item.text.indexOf(term) !== -1;
      return matchesCategory && matchesSearch;
    });

    questionListEl.innerHTML = "";
    if (filtered.length === 0) {
      questionListEl.appendChild(renderEmptyState(
        "לא נמצאו שאלות שמתאימות לחיפוש או לסינון הנוכחי.",
        "הצג/י את כל השאלות",
        () => {
          searchInput.value = "";
          activeCategory = "הכל";
          renderCategoryPills();
          renderQuestionList();
          searchInput.focus();
        }
      ));
      return;
    }

    filtered.forEach(item => {
      const row = document.createElement("div");
      row.className = "question-row";
      row.innerHTML = questionRowHtml(item, isIn(state.favorites, item.id));
      questionListEl.appendChild(row);
    });

    bindFavoriteToggles(questionListEl, () => {
      renderQuestionList();
      renderFavoritesView();
      renderDashboardStats();
    });
  }

  function bindFavoriteToggles(scopeEl, afterToggle) {
    scopeEl.querySelectorAll(".fav-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        toggleInArray(state.favorites, btn.dataset.id);
        saveState();
        afterToggle();
      });
    });
  }

  searchInput.addEventListener("input", renderQuestionList);

  // =================================================================
  // Favorites (מועדפים)
  // =================================================================
  function renderFavoritesView() {
    document.getElementById("favorites-count").textContent = state.favorites.length;
    const list = document.getElementById("favorites-list");
    const favItems = data.coachingQuestions.filter(q => isIn(state.favorites, q.id));

    list.innerHTML = "";
    if (favItems.length === 0) {
      list.appendChild(renderEmptyState(
        "עדיין אין כאן שאלות שמורות. כוכב קטן ליד כל שאלה יוסיף אותה למועדפים.",
        "חזרה למאגר השאלות",
        () => switchView("questions")
      ));
      return;
    }

    favItems.forEach(item => {
      const row = document.createElement("div");
      row.className = "question-row";
      row.innerHTML = questionRowHtml(item, true);
      list.appendChild(row);
    });

    bindFavoriteToggles(list, () => {
      renderFavoritesView();
      renderQuestionList();
      renderDashboardStats();
    });
  }

  // =================================================================
  // Practice / scenarios (תרגול)
  // =================================================================
  function renderScenarios() {
    document.getElementById("practice-count").textContent = data.clientScenarios.length;
    const list = document.getElementById("scenario-list");
    list.innerHTML = "";

    function guidanceBlock(title, items) {
      return (
        '<div class="guidance-block">' +
          "<h4>" + title + "</h4>" +
          "<ul>" + items.map(i => "<li>" + i + "</li>").join("") + "</ul>" +
        "</div>"
      );
    }

    data.clientScenarios.forEach(scenario => {
      const alreadyPracticed = isIn(state.practicedScenarios, scenario.id);
      const tagsHtml = scenario.tags.map(t => '<span class="scenario-tag">' + t + "</span>").join("");

      const card = document.createElement("div");
      card.className = "scenario-card";
      card.innerHTML =
        '<div class="scenario-tags">' + tagsHtml +
          (alreadyPracticed ? '<span class="practiced-badge">✓ תורגל</span>' : "") +
        "</div>" +
        "<h3>" + scenario.title + "</h3>" +
        '<div class="scenario-summary">' + scenario.summary + "</div>" +
        (scenario.clientQuote ? '<blockquote class="client-quote">' + scenario.clientQuote + "</blockquote>" : "") +
        '<button type="button" class="expand-toggle" data-id="' + scenario.id + '" aria-expanded="false">הצג/י כיווני הנחיה ▾</button>' +
        '<div class="guidance-grid is-collapsed">' +
          guidanceBlock("מה אפשר לברר", scenario.guidance.explore) +
          guidanceBlock("שאלות אפשריות", scenario.guidance.possibleQuestions) +
          guidanceBlock("כיווני חשיבה", scenario.guidance.thinkingDirections) +
          guidanceBlock("למה לשים לב", scenario.guidance.watchFor) +
        "</div>";
      list.appendChild(card);
    });

    list.querySelectorAll(".expand-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const card = btn.closest(".scenario-card");
        const grid = card.querySelector(".guidance-grid");
        const nowCollapsed = grid.classList.toggle("is-collapsed");
        btn.textContent = nowCollapsed ? "הצג/י כיווני הנחיה ▾" : "הסתר/י כיווני הנחיה ▴";
        btn.setAttribute("aria-expanded", nowCollapsed ? "false" : "true");

        if (!nowCollapsed && !isIn(state.practicedScenarios, id)) {
          state.practicedScenarios.push(id);
          saveState();
          renderDashboardStats();
          const tagsWrap = card.querySelector(".scenario-tags");
          if (!tagsWrap.querySelector(".practiced-badge")) {
            const badge = document.createElement("span");
            badge.className = "practiced-badge";
            badge.textContent = "✓ תורגל";
            tagsWrap.appendChild(badge);
          }
        }
      });
    });
  }

  // =================================================================
  // Init
  // =================================================================
  renderDashboardEntryCards();
  renderDashboardStats();

  renderTopicSelector();
  renderTopicDetail();
  renderLearningHeaderCount();

  renderCategoryPills();
  renderQuestionList();

  renderFavoritesView();
  renderScenarios();
}

window.addEventListener("appDataReady", initializeApp);

// Handles cached data that became available before app.js registered its listener.
if (window.APP_DATA) initializeApp();
