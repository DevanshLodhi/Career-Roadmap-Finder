// ===== Careers page JavaScript =====
// What this file does:
// 1. Loads all careers from data/careers.json
// 2. Shows them as cards
// 3. Lets the user search and filter by difficulty
// 4. Marks the user's top quiz match and shows roadmap progress (if any)

const gridEl = document.getElementById("career-grid");
const searchEl = document.getElementById("career-search");
const chipsEl = document.getElementById("difficulty-chips");
const countEl = document.getElementById("career-count");
const emptyEl = document.getElementById("career-empty");

const RESULT_KEY = "pathwise_result";
const PROGRESS_KEY = "pathwise_progress";

if (gridEl) {
  let careers = [];                 // data from careers.json
  let activeDifficulty = "All";     // which filter button is selected
  let topMatchId = null;            // id of the user's best quiz match
  let progressById = {};            // e.g. { web: 29, ai: 0, ... } (percent done)

  // ----- 1. Load the careers -----
  fetch("data/careers.json")
    .then((response) => response.json())
    .then((data) => {
      careers = data;
      topMatchId = findTopMatch(careers);
      progressById = calculateProgress(careers);
      buildDifficultyChips();
      showCareers();
    })
    .catch(() => {
      countEl.textContent = "Could not load careers. Please open this page with Live Server.";
    });

  // ----- 2. Search box -----
  searchEl.addEventListener("input", showCareers);

  // ----- 3. Difficulty buttons (made from the data, so they always match) -----
  function buildDifficultyChips() {
    // Collect each difficulty once: ["Beginner-friendly", "Moderate", ...]
    const levels = ["All"];
    careers.forEach((career) => {
      if (!levels.includes(career.difficulty)) levels.push(career.difficulty);
    });

    levels.forEach((level) => {
      const button = makeEl("button", "filter-chip", level);
      button.type = "button";
      button.dataset.level = level;
      button.setAttribute("aria-pressed", level === activeDifficulty);
      if (level === activeDifficulty) button.classList.add("is-active");
      chipsEl.appendChild(button);
    });
  }

  chipsEl.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-chip");
    if (!button) return;

    activeDifficulty = button.dataset.level;

    chipsEl.querySelectorAll(".filter-chip").forEach((chip) => {
      const isActive = chip === button;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", isActive);
    });

    showCareers();
  });

  // ----- 4. Filter and show the cards -----
  function showCareers() {
    const text = searchEl.value.trim().toLowerCase();

    const results = careers.filter((career) => {
      const matchesLevel = activeDifficulty === "All" || career.difficulty === activeDifficulty;

      // Search in name, tagline, summary, tools and "best for" lines
      const searchable = [
        career.name,
        career.tagline,
        career.summary,
        career.tools.join(" "),
        career.bestFor.join(" ")
      ].join(" ").toLowerCase();

      return matchesLevel && searchable.includes(text);
    });

    gridEl.innerHTML = "";
    results.forEach((career) => gridEl.appendChild(makeCard(career)));

    countEl.textContent = results.length + " career" + (results.length === 1 ? "" : "s");
    emptyEl.hidden = results.length > 0;
  }

  // ----- One career card -----
  function makeCard(career) {
    const card = makeEl("article", "career-card");

    // Small label if this is the user's best quiz match
    if (career.id === topMatchId) {
      card.classList.add("is-top");
      card.appendChild(makeEl("span", "top-badge", "Your top match"));
    }

    card.appendChild(makeEl("h2", "career-card-name", career.name));
    card.appendChild(makeEl("p", "career-card-tagline", career.tagline));

    const meta = makeEl("ul", "career-card-meta");
    meta.appendChild(makeEl("li", "", "Difficulty: " + career.difficulty));
    meta.appendChild(makeEl("li", "", career.stages.length + " stages"));
    card.appendChild(meta);

    // Good fit if... (first two lines)
    const fit = makeEl("ul", "fit-list");
    career.bestFor.slice(0, 2).forEach((line) => fit.appendChild(makeEl("li", "", line)));
    card.appendChild(fit);

    // Progress bar, only if the user has started this roadmap
    const progress = progressById[career.id] || 0;
    if (progress > 0) {
      card.appendChild(makeEl("p", "card-progress-text", "Your progress: " + progress + "%"));
      const track = makeEl("div", "meter");
      track.setAttribute("aria-hidden", "true");
      const fill = makeEl("div", "meter-fill");
      fill.style.width = progress + "%";
      track.appendChild(fill);
      card.appendChild(track);
    }

    const link = makeEl("a", "button button-secondary", progress > 0 ? "Continue roadmap" : "View roadmap");
    link.href = "roadmap.html?career=" + encodeURIComponent(career.id);
    link.setAttribute("aria-label", (progress > 0 ? "Continue " : "View ") + career.name + " roadmap");
    card.appendChild(link);

    return card;
  }
}

// ===== Helper functions =====

// Work out the user's best quiz match (same maths as the result page)
function findTopMatch(careers) {
  try {
    const saved = JSON.parse(localStorage.getItem(RESULT_KEY));
    if (!saved || typeof saved.scores !== "object" || typeof saved.max !== "object") return null;

    let bestId = null;
    let bestPercent = -1;
    let bestScore = -1;

    careers.forEach((career) => {
      const score = saved.scores[career.id] || 0;
      const max = saved.max[career.id] || 0;
      const percent = max > 0 ? Math.round((score / max) * 100) : 0;

      if (percent > bestPercent || (percent === bestPercent && score > bestScore)) {
        bestId = career.id;
        bestPercent = percent;
        bestScore = score;
      }
    });

    return bestId;
  } catch (error) {
    return null;
  }
}

// Percent of topics ticked for each career
function calculateProgress(careers) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch (error) {
    saved = {};
  }

  const result = {};
  careers.forEach((career) => {
    // All valid topic keys, like "0-0", "0-1", "1-0" ...
    const validKeys = [];
    career.stages.forEach((stage, s) => {
      stage.topics.forEach((topic, t) => validKeys.push(s + "-" + t));
    });

    const ticked = Array.isArray(saved[career.id]) ? saved[career.id] : [];
    const doneCount = ticked.filter((key) => validKeys.includes(key)).length;
    result[career.id] = validKeys.length > 0 ? Math.round((doneCount / validKeys.length) * 100) : 0;
  });

  return result;
}

function makeEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}