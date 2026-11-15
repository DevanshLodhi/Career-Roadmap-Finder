// ===== Quiz page JavaScript =====
// What this file does:
// 1. Loads the questions from data/questions.json
// 2. Shows one question at a time with a progress bar
// 3. Adds up points for each career based on the answers
// 4. Saves the result in localStorage and opens result.html

// Grab the HTML elements we need
const legendEl = document.getElementById("question-text");
const optionsEl = document.getElementById("options");
const progressTextEl = document.getElementById("progress-text");
const progressBarEl = document.getElementById("progress-bar");
const progressEl = document.querySelector(".progress");
const messageEl = document.getElementById("quiz-message");
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");

const RESULT_KEY = "pathwise_result";   // name used to save the result in the browser

if (legendEl) {
  let questions = [];    // the questions from the JSON file
  let answers = [];      // answers[i] = index of the option chosen for question i
  let current = 0;       // which question we are on

  // ----- 1. Load the questions -----
  fetch("data/questions.json")
    .then((response) => response.json())
    .then((data) => {
      questions = data.questions;
      answers = new Array(questions.length).fill(null);
      showQuestion(false);
    })
    .catch(() => {
      legendEl.textContent = "Sorry, the questions could not be loaded.";
      messageEl.textContent = "Please open this page with Live Server and check that data/questions.json exists.";
      nextBtn.disabled = true;
    });

  // ----- 2. Show the current question -----
  function showQuestion(moveFocus) {
    const question = questions[current];

    legendEl.textContent = question.text;
    optionsEl.innerHTML = "";
    messageEl.textContent = "";

    // Make one radio-button option for each answer
    question.options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = index;
      input.checked = answers[current] === index;   // remember earlier choice

      // When the user picks an option, remember it
      input.addEventListener("change", () => {
        answers[current] = index;
        messageEl.textContent = "";
      });

      const box = document.createElement("span");
      box.className = "option-box";
      box.textContent = option.text;

      label.append(input, box);
      optionsEl.appendChild(label);
    });

    // Progress bar and text
    const percent = Math.round((current / questions.length) * 100);
    progressTextEl.textContent = "Question " + (current + 1) + " of " + questions.length;
    progressBarEl.style.width = percent + "%";
    progressEl.setAttribute("aria-valuenow", percent);

    // Buttons
    backBtn.disabled = current === 0;
    nextBtn.textContent = current === questions.length - 1 ? "See my results" : "Next";

    // After moving to a new question, send focus to it (helps keyboard and screen reader users)
    if (moveFocus) legendEl.focus();
  }

  // ----- 3. Next and Back buttons -----
  nextBtn.addEventListener("click", () => {
    if (answers[current] === null) {
      messageEl.textContent = "Please choose an option to continue.";
      return;
    }

    if (current < questions.length - 1) {
      current++;
      showQuestion(true);
    } else {
      finishQuiz();
    }
  });

  backBtn.addEventListener("click", () => {
    if (current > 0) {
      current--;
      showQuestion(true);
    }
  });

  // ----- 4. Add up the points and save the result -----
  function finishQuiz() {
    const scores = {};   // e.g. { web: 12, ai: 5, ... }
    const max = {};      // the most points each career could have got

    questions.forEach((question, qIndex) => {
      // Points for the option the user chose
      const chosen = question.options[answers[qIndex]];
      for (const careerId in chosen.scores) {
        scores[careerId] = (scores[careerId] || 0) + chosen.scores[careerId];
      }

      // Best possible points for each career in this question
      const best = {};
      question.options.forEach((option) => {
        for (const careerId in option.scores) {
          best[careerId] = Math.max(best[careerId] || 0, option.scores[careerId]);
        }
      });
      for (const careerId in best) {
        max[careerId] = (max[careerId] || 0) + best[careerId];
      }
    });

    // Make sure every career has a score, even if it is 0
    for (const careerId in max) {
      if (scores[careerId] === undefined) scores[careerId] = 0;
    }

    try {
      localStorage.setItem(
        RESULT_KEY,
        JSON.stringify({ scores: scores, max: max, answers: answers, date: new Date().toISOString() })
      );
    } catch (error) {
      messageEl.textContent = "Could not save your result. Your browser may be blocking storage.";
      return;
    }

    progressBarEl.style.width = "100%";
    window.location.href = "result.html";
  }
}