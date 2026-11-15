// ===== Roadmap page JavaScript =====
// What this file does:
// 1. Reads the career id from the link (roadmap.html?career=web)
// 2. Loads that career from data/careers.json
// 3. Builds the 4 stages with a checklist of topics
// 4. Saves ticked topics in localStorage and updates the progress bar

const PROGRESS_KEY = "pathwise_progress";   // name used to save progress in the browser

const missingEl = document.getElementById("roadmap-missing");
const mainEl = document.getElementById("roadmap-main");

if (mainEl) {
  // Step 1: which career? Read it from the link
  const careerId = new URLSearchParams(window.location.search).get("career");

  fetch("data/careers.json")
    .then((response) => response.json())
    .then((careers) => {
      const career = careers.find((item) => item.id === careerId);
      if (career) {
        startRoadmap(career);
      } else {
        missingEl.hidden = false;
      }
    })
    .catch(() => {
      missingEl.hidden = false;
      missingEl.querySelector("p").textContent =
        "The roadmap data could not be loaded. Please open this page with Live Server.";
    });
}

function startRoadmap(career) {
  // ----- Grab the elements we will fill -----
  const stagesEl = document.getElementById("stages");
  const overallTextEl = document.getElementById("overall-text");
  const overallBarEl = document.getElementById("overall-bar");
  const nextUpEl = document.getElementById("next-up");
  const completeEl = document.getElementById("complete-msg");
  const storageMsgEl = document.getElementById("storage-msg");
  const resetBtn = document.getElementById("reset-btn");

  // ----- Every topic gets a unique key like "1-2" (stage 1, topic 2) -----
  const allKeys = [];
  career.stages.forEach((stage, s) => {
    stage.topics.forEach((topic, t) => allKeys.push(s + "-" + t));
  });

  // Saved progress (only keep keys that still exist)
  const done = new Set(loadProgress(career.id).filter((key) => allKeys.includes(key)));

  // We remember the parts of each stage that must update when a box is ticked
  const stageRefs = [];

  // ----- Top part of the page -----
  document.title = career.name + " roadmap | Pathwise";
  document.getElementById("career-name").textContent = career.name;
  document.getElementById("career-tagline").textContent = career.tagline;
  document.getElementById("career-summary").textContent = career.summary;

  const metaEl = document.getElementById("career-meta");
  metaEl.appendChild(makeEl("li", "", "Difficulty: " + career.difficulty));
  metaEl.appendChild(makeEl("li", "", career.timeEstimate));

  if (career.note) {
    const noteEl = document.getElementById("career-note");
    noteEl.textContent = career.note;
    noteEl.hidden = false;
  }

  // ----- Build the 4 stages -----
  career.stages.forEach((stage, s) => {
    stagesEl.appendChild(buildStage(stage, s));
  });

  // ----- Tools and project ideas -----
  const toolsEl = document.getElementById("tools");
  career.tools.forEach((tool) => toolsEl.appendChild(makeEl("li", "", tool)));

  const projectsEl = document.getElementById("projects");
  career.projects.forEach((project) => projectsEl.appendChild(makeEl("li", "", project)));

  // Show the page, then work out the first progress numbers
  mainEl.hidden = false;
  updateProgress();

  // Open the first stage that is not finished yet
  const firstOpen = stageRefs.findIndex((ref) => !isStageDone(ref));
  const openIndex = firstOpen === -1 ? 0 : firstOpen;
  stageRefs[openIndex].details.open = true;

  // ----- Reset button -----
  resetBtn.addEventListener("click", () => {
    if (!window.confirm("Reset all progress for this roadmap?")) return;

    done.clear();
    document.querySelectorAll(".topic input").forEach((box) => {
      box.checked = false;
    });
    saveProgress();
    updateProgress();
  });

  // =====================================================
  // Helper functions (they live inside startRoadmap so they can use `career` and `done`)
  // =====================================================

  // One stage = a <details> box that opens and closes
  function buildStage(stage, s) {
    const details = makeEl("details", "stage");

    // Clickable title row
    const summary = makeEl("summary", "stage-summary");
    const number = makeEl("span", "stage-number", String(s + 1));
    const titleBox = makeEl("span", "stage-title-box");
    titleBox.appendChild(makeEl("span", "stage-title", stage.title));
    const countEl = makeEl("span", "stage-count", "");
    titleBox.appendChild(countEl);
    summary.append(number, titleBox);
    details.appendChild(summary);

    // Inside the stage
    const body = makeEl("div", "stage-body");
    body.appendChild(makeEl("p", "stage-goal", "Goal: " + stage.goal));

    // Checklist
    const list = makeEl("ul", "topic-list");
    stage.topics.forEach((topic, t) => {
      const key = s + "-" + t;
      const li = makeEl("li", "");
      const label = makeEl("label", "topic");

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = done.has(key);

      // When a box is ticked or unticked
      box.addEventListener("change", () => {
        if (box.checked) {
          done.add(key);
        } else {
          done.delete(key);
        }
        saveProgress();
        updateProgress();
      });

      label.append(box, makeEl("span", "topic-text", topic));
      li.appendChild(label);
      list.appendChild(li);
    });
    body.appendChild(list);

    // Free resources
    body.appendChild(makeEl("h3", "resource-title", "Free resources"));
    const resources = makeEl("ul", "resource-list");
    stage.resources.forEach((resource) => {
      const li = makeEl("li", "");
      const link = makeEl("a", "", resource.name);
      link.href = resource.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";   // safe way to open links in a new tab
      li.appendChild(link);
      resources.appendChild(li);
    });
    body.appendChild(resources);

    details.appendChild(body);

    stageRefs.push({ details: details, countEl: countEl, stageIndex: s, total: stage.topics.length });
    return details;
  }

  // How many topics of a stage are ticked?
  function stageDoneCount(ref) {
    let count = 0;
    for (let t = 0; t < ref.total; t++) {
      if (done.has(ref.stageIndex + "-" + t)) count++;
    }
    return count;
  }

  function isStageDone(ref) {
    return stageDoneCount(ref) === ref.total;
  }

  // Update every number and bar on the page
  function updateProgress() {
    const total = allKeys.length;
    const count = done.size;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    overallTextEl.textContent = count + " of " + total + " topics done (" + percent + "%)";
    overallBarEl.style.width = percent + "%";

    // Each stage's own count
    stageRefs.forEach((ref) => {
      const stageCount = stageDoneCount(ref);
      ref.countEl.textContent = isStageDone(ref)
        ? "Stage complete"
        : stageCount + " of " + ref.total + " done";
      ref.details.classList.toggle("is-done", isStageDone(ref));
    });

    // "Up next" suggestion = first topic that is not ticked
    let nextText = "";
    for (let s = 0; s < career.stages.length && nextText === ""; s++) {
      for (let t = 0; t < career.stages[s].topics.length; t++) {
        if (!done.has(s + "-" + t)) {
          nextText = "Up next: " + career.stages[s].topics[t] + " (" + career.stages[s].title + ")";
          break;
        }
      }
    }

    nextUpEl.textContent = nextText;
    nextUpEl.hidden = nextText === "";
    completeEl.hidden = count !== total;
  }

  // Save to the browser
  function saveProgress() {
    storageMsgEl.textContent = "";
    try {
      const all = loadAllProgress();
      all[career.id] = Array.from(done);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch (error) {
      storageMsgEl.textContent = "Could not save your progress. Your browser may be blocking storage.";
    }
  }
}

// ----- Reading saved progress (progress for all careers is stored in one object) -----
function loadAllProgress() {
  try {
    const text = localStorage.getItem(PROGRESS_KEY);
    const data = text ? JSON.parse(text) : {};
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    return {};
  }
}

function loadProgress(careerId) {
  const list = loadAllProgress()[careerId];
  return Array.isArray(list) ? list : [];
}

// ----- Small helper to create an element -----
function makeEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}