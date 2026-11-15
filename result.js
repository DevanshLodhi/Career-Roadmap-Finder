// ===== Result page JavaScript =====
// What this file does:
// 1. Reads the saved quiz result from localStorage
// 2. Loads careers.json and questions.json
// 3. Turns points into match percentages and sorts the careers
// 4. Shows the top 3 careers (with reasons) and the rest in a short list

const contentEl = document.getElementById("result-content");
const topEl = document.getElementById("result-top");
const emptyEl = document.getElementById("no-result");
const dateEl = document.getElementById("result-date");

const RESULT_KEY = "pathwise_result";

if (contentEl) {
  const saved = loadResult();

  if (!saved) {
    emptyEl.hidden = false;           // no quiz taken yet
  } else {
    // Load both data files at the same time
    Promise.all([
      fetch("data/careers.json").then((response) => response.json()),
      fetch("data/questions.json").then((response) => response.json())
    ])
      .then(([careers, questionData]) => {
        showResults(saved, careers, questionData.questions);
      })
      .catch(() => {
        contentEl.textContent = "Sorry, your results could not be loaded. Please open this page with Live Server.";
      });
  }
}

// ----- Read the saved result safely -----
function loadResult() {
  try {
    const text = localStorage.getItem(RESULT_KEY);
    if (!text) return null;
    const data = JSON.parse(text);
    if (!data || typeof data.scores !== "object" || typeof data.max !== "object") return null;
    return data;
  } catch (error) {
    return null;
  }
}

// ----- Build the whole page -----
function showResults(saved, careers, questions) {
  // Make it easy to find a career by its id
  const byId = {};
  careers.forEach((career) => {
    byId[career.id] = career;
  });

  // Match % = points you got / best points possible for that career
  const ranked = Object.keys(saved.scores)
    .filter((id) => byId[id])
    .map((id) => {
      const max = saved.max[id] || 0;
      const percent = max > 0 ? Math.round((saved.scores[id] / max) * 100) : 0;
      return { career: byId[id], percent: percent, score: saved.scores[id] };
    })
    .sort((a, b) => b.percent - a.percent || b.score - a.score);   // highest first

  if (ranked.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  topEl.hidden = false;
  showDate(saved.date);

  const answers = Array.isArray(saved.answers) ? saved.answers : [];

  // 1) Best match (big card)
  contentEl.appendChild(
    makeCard(ranked[0], "Best match", true, getReasons(ranked[0].career.id, questions, answers, 3))
  );

  // 2) Second and third match (smaller cards)
  const nextTwo = ranked.slice(1, 3);
  if (nextTwo.length > 0) {
    const heading = makeEl("h2", "result-subtitle", "Also a strong fit");
    const grid = makeEl("div", "match-grid");
    const labels = ["Second match", "Third match"];

    nextTwo.forEach((item, index) => {
      grid.appendChild(
        makeCard(item, labels[index], false, getReasons(item.career.id, questions, answers, 2))
      );
    });

    contentEl.append(heading, grid);
  }

  // 3) The remaining careers in a short list
  const others = ranked.slice(3);
  if (others.length > 0) {
    contentEl.append(makeEl("h2", "result-subtitle", "Other careers"), makeOtherList(others));
  }

  // 4) Buttons at the bottom
  const actions = makeEl("div", "result-actions");
  actions.append(
    makeLink("Retake the quiz", "quiz.html", "button button-secondary"),
    makeLink("Browse all careers", "careers.html", "button")
  );
  contentEl.appendChild(actions);

  // Animate the bars (set width after the page is drawn)
  requestAnimationFrame(() => {
    document.querySelectorAll(".meter-fill").forEach((bar) => {
      bar.style.width = bar.dataset.percent + "%";
    });
  });
}

// ----- One career card -----
function makeCard(item, label, isTop, reasons) {
  const career = item.career;
  const card = makeEl("article", isTop ? "match-card match-top" : "match-card");

  card.appendChild(makeEl("span", "badge", label));
  card.appendChild(makeEl(isTop ? "h2" : "h3", "match-name", career.name));

  // Percentage and bar
  const row = makeEl("div", "percent-row");
  row.append(makeEl("span", "percent", item.percent + "%"), makeEl("span", "percent-label", "match"));
  card.append(row, makeMeter(item.percent));

  card.appendChild(makeEl("p", "match-tagline", career.tagline));

  if (isTop) {
    card.appendChild(makeEl("p", "match-summary", career.summary));
  }

  // "Why this fits you" list, built from the user's own answers
  if (reasons.length > 0) {
    const why = makeEl("div", "why");
    why.appendChild(makeEl("h4", "why-title", "Why this fits you"));
    const list = makeEl("ul", "why-list");
    reasons.forEach((text) => {
      list.appendChild(makeEl("li", "", "You chose \u201C" + text + "\u201D"));
    });
    why.appendChild(list);
    card.appendChild(why);
  }

  // Difficulty and time
  const meta = makeEl("ul", "meta");
  meta.appendChild(makeEl("li", "", "Difficulty: " + career.difficulty));
  if (isTop) {
    meta.appendChild(makeEl("li", "", career.timeEstimate));
  }
  card.appendChild(meta);

  card.appendChild(
    makeLink("View roadmap", "roadmap.html?career=" + encodeURIComponent(career.id), isTop ? "button" : "button button-secondary")
  );

  return card;
}

// ----- The list of remaining careers -----
function makeOtherList(items) {
  const list = makeEl("ul", "other-list");

  items.forEach((item) => {
    const li = makeEl("li", "other-item");
    const top = makeEl("div", "other-top");
    top.append(
      makeLink(item.career.name, "roadmap.html?career=" + encodeURIComponent(item.career.id), "other-name"),
      makeEl("span", "other-percent", item.percent + "%")
    );
    li.append(top, makeMeter(item.percent));
    list.appendChild(li);
  });

  return list;
}

// ----- Answers that gave this career the most points -----
function getReasons(careerId, questions, answers, limit) {
  const found = [];

  questions.forEach((question, index) => {
    const option = question.options[answers[index]];
    if (!option) return;
    const points = option.scores[careerId] || 0;
    if (points > 0) found.push({ text: option.text, points: points });
  });

  found.sort((a, b) => b.points - a.points);
  return found.slice(0, limit).map((entry) => entry.text);
}

// ----- Small helper functions -----
function makeEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeLink(text, href, className) {
  const link = makeEl("a", className, text);
  link.href = href;
  return link;
}

function makeMeter(percent) {
  const track = makeEl("div", "meter");
  track.setAttribute("aria-hidden", "true");   // the % number already says it
  const fill = makeEl("div", "meter-fill");
  fill.dataset.percent = percent;
  track.appendChild(fill);
  return track;
}

function showDate(isoDate) {
  const date = new Date(isoDate);
  if (isNaN(date)) return;
  dateEl.textContent = "Quiz taken on " + date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}