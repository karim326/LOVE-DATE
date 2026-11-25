/* ============================================================
   Picova · دعوة إلى موعد
   منطق التجربة: أربع خطوات، تقويم، اختيار طعام، ورسالة
   ============================================================ */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fullDateFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const shortDateFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const monthFormatter = new Intl.DateTimeFormat("ar-u-nu-latn", {
    month: "long",
    year: "numeric"
  });

  const today = startOfDay(new Date());

  const state = {
    step: 1,
    noAttempts: 0,
    selectedDate: null,
    selectedFood: null,
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth()
  };

  const card = $("#card");
  const steps = $$(".step");
  const dots = $$(".progress-dot");
  const stepNow = $("#stepNow");
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");
  const dateActions = $("#dateActions");
  const noTease = $("#noTease");
  const dateSummary = $("#dateSummary");
  const chosenDateText = $("#chosenDateText");
  const dateNext = $("#dateNext");
  const calendarTitle = $("#calTitle");
  const calPrev = $("#calPrev");
  const calNext = $("#calNext");
  const weekdaysEl = $("#weekdays");
  const daysEl = $("#calDays");
  const foodCards = $$(".food-card");
  const foodGrid = $("#foodGrid");
  const foodHint = $("#foodHint");
  const foodNext = $("#foodNext");
  const foodDateChip = $("#foodDateChip");
  const letterDate = $("#letterDate");
  const letterFood = $("#letterFood");
  const replayBtn = $("#replayBtn");
  const toastEl = $("#toast");
  const particlesEl = $("#particles");

  let lastEscapeTime = 0;
  let focusTimer = null;
  let toastTimer = null;
  let calendarRendered = false;

  /* ---------- أدوات صغيرة ---------- */

  function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function isSameDay(a, b) {
    return Boolean(a && b) &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function randomBetween(min, max) {
    return min + Math.random() * Math.max(0, max - min);
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 2800);
  }

  function burstHearts(x, y, count = 12) {
    if (reducedMotion) return;

    const px = Number.isFinite(x) ? x : window.innerWidth / 2;
    const py = Number.isFinite(y) ? y : window.innerHeight / 2;
    const symbols = ["♥", "✦", "❀", "✧"];

    for (let i = 0; i < count; i += 1) {
      const heart = document.createElement("span");
      const angle = Math.random() * Math.PI * 2;
      const distance = 42 + Math.random() * 112;

      heart.className = "burst-heart";
      heart.textContent = symbols[i % symbols.length];
      heart.style.left = `${px}px`;
      heart.style.top = `${py}px`;
      heart.style.fontSize = `${11 + Math.random() * 12}px`;
      heart.style.color = i % 3 === 0 ? "#c9a36a" : i % 3 === 1 ? "#d86f91" : "#c084d6";
      heart.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      heart.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      heart.style.setProperty("--rot", `${Math.random() * 220 - 110}deg`);
      heart.style.setProperty("--dur", `${800 + Math.random() * 700}ms`);

      document.body.appendChild(heart);
      window.setTimeout(() => heart.remove(), 1700);
    }
  }

  /* ---------- خلفية من القلوب والورود ---------- */

  function initParticles() {
    if (reducedMotion) return;

    const glyphs = ["♥", "✦", "❀", "✧", "·"];
    const colors = [
      "rgba(216, 111, 145, 0.34)",
      "rgba(201, 163, 106, 0.32)",
      "rgba(174, 145, 215, 0.3)"
    ];
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 20; i += 1) {
      const particle = document.createElement("span");
      particle.className = "particle";
      particle.textContent = glyphs[i % glyphs.length];
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.fontSize = `${9 + Math.random() * 14}px`;
      particle.style.color = colors[i % colors.length];
      particle.style.setProperty("--dur", `${15 + Math.random() * 18}s`);
      particle.style.setProperty("--delay", `${-Math.random() * 30}s`);
      particle.style.setProperty("--drift", `${Math.round(Math.random() * 160 - 80)}px`);
      particle.style.setProperty("--spin", `${Math.round(Math.random() * 220 - 110)}deg`);
      fragment.appendChild(particle);
    }

    particlesEl.appendChild(fragment);
  }

  /* ---------- التنقل بين الخطوات ---------- */

  function goToStep(nextStep) {
    if (nextStep === state.step && nextStep !== 1) return;

    const target = $(`.step[data-step="${nextStep}"]`);
    if (!target) return;

    dockNoButton();

    state.step = nextStep;
    steps.forEach((step) => {
      step.classList.toggle("is-active", step === target);
    });

    dots.forEach((dot, index) => {
      const dotStep = index + 1;
      dot.classList.toggle("is-done", dotStep < nextStep);
      dot.classList.toggle("is-active", dotStep === nextStep);
    });

    stepNow.textContent = String(nextStep);

    if (nextStep === 2 && !calendarRendered) {
      renderCalendar();
    }

    if (nextStep === 3) {
      syncFoodStep();
    }

    if (nextStep === 4) {
      syncLetter();
      window.setTimeout(() => {
        if (state.step === 4) {
          const rect = card.getBoundingClientRect();
          burstHearts(rect.left + rect.width / 2, rect.top + rect.height * 0.36, 16);
        }
      }, 420);
    }

    if (window.scrollY > 4) {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    }

    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => {
      if (state.step !== nextStep) return;
      const heading = target.querySelector("h1, h2");
      if (!heading) return;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }, 380);
  }

  /* ---------- زر «لا» الهارب ---------- */

  const noMessages = [
    "يبدو أن زر «لا» خجول جداً... 👀",
    "كل محاولة تجعل «حسناً» أكبر. أليست هذه إشارة؟ ♥",
    "حتى الزر يعرف الإجابة الصحيحة. 😌",
    "لا يزال يهرب... لكن قلبي لا. 🌸",
    "ربما آن الأوان لتجرب «حسناً»؟ ✨",
    "الزر يرفض التعاون... والقلب يوافق. 🤍"
  ];

  function growYesButton() {
    const scale = Math.min(1.8, 1 + state.noAttempts * 0.085);
    yesBtn.style.setProperty("--grow", scale.toFixed(3));
    yesBtn.classList.toggle("is-max", scale >= 1.8);
    yesBtn.setAttribute(
      "aria-label",
      `حسناً، أريد الخروج معك في موعد. كبر الزر ليصبح ${Math.round(scale * 100)} بالمئة من حجمه الأصلي`
    );
  }

  function moveNoButton() {
    if (!noBtn.classList.contains("is-free")) return;

    const pad = Math.max(14, Math.min(26, window.innerWidth * 0.035));
    const width = noBtn.offsetWidth || 110;
    const height = noBtn.offsetHeight || 52;
    const maxX = Math.max(pad, window.innerWidth - width - pad);
    const maxY = Math.max(pad, window.innerHeight - height - pad - 48);
    const yesRect = yesBtn.getBoundingClientRect();
    const safe = 20;

    let x = pad;
    let y = pad;

    for (let attempt = 0; attempt < 28; attempt += 1) {
      x = randomBetween(pad, maxX);
      y = randomBetween(pad, maxY);

      const overlapsYes =
        x < yesRect.right + safe &&
        x + width > yesRect.left - safe &&
        y < yesRect.bottom + safe &&
        y + height > yesRect.top - safe;

      if (!overlapsYes) break;
    }

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.transform = `rotate(${randomBetween(-9, 9).toFixed(1)}deg)`;
  }

  function escapeNo(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (state.step !== 1) return;

    const now = performance.now();
    if (now - lastEscapeTime < 140) return;
    lastEscapeTime = now;

    if (!noBtn.classList.contains("is-free")) {
      const rect = noBtn.getBoundingClientRect();

      noBtn.style.width = `${rect.width}px`;
      noBtn.style.height = `${rect.height}px`;
      noBtn.classList.add("is-free");
      noBtn.style.left = `${rect.left}px`;
      noBtn.style.top = `${rect.top}px`;
      document.body.appendChild(noBtn);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(moveNoButton);
      });
    } else {
      moveNoButton();
    }

    state.noAttempts += 1;
    growYesButton();
    noTease.textContent = noMessages[(state.noAttempts - 1) % noMessages.length];
  }

  function dockNoButton() {
    if (!noBtn) return;

    noBtn.classList.remove("is-free");
    noBtn.removeAttribute("style");
    if (noBtn.parentElement !== dateActions) {
      dateActions.appendChild(noBtn);
    }
    lastEscapeTime = 0;
  }

  function keepNoButtonOnScreen() {
    if (!noBtn.classList.contains("is-free")) return;

    const pad = 10;
    const rect = noBtn.getBoundingClientRect();
    const maxX = Math.max(pad, window.innerWidth - rect.width - pad);
    const maxY = Math.max(pad, window.innerHeight - rect.height - pad);

    noBtn.style.left = `${Math.min(Math.max(pad, rect.left), maxX)}px`;
    noBtn.style.top = `${Math.min(Math.max(pad, rect.top), maxY)}px`;
  }

  noBtn.addEventListener("pointerenter", escapeNo);
  noBtn.addEventListener("pointerdown", escapeNo);
  noBtn.addEventListener("click", escapeNo);
  noBtn.addEventListener("touchstart", escapeNo, { passive: false });

  window.addEventListener("resize", keepNoButtonOnScreen, { passive: true });

  window.addEventListener(
    "pointermove",
    (event) => {
      if (state.step !== 1) return;
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      if (performance.now() - lastEscapeTime < 180) return;

      const rect = noBtn.getBoundingClientRect();
      const nearestX = Math.max(rect.left, Math.min(event.clientX, rect.right));
      const nearestY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));
      const distance = Math.hypot(event.clientX - nearestX, event.clientY - nearestY);

      if (distance < 30) {
        escapeNo();
      }
    },
    { passive: true }
  );

  yesBtn.addEventListener("click", (event) => {
    if (state.step !== 1) return;

    const rect = card.getBoundingClientRect();
    const x = Number.isFinite(event.clientX) && event.clientX > 0
      ? event.clientX
      : rect.left + rect.width / 2;
    const y = Number.isFinite(event.clientY) && event.clientY > 0
      ? event.clientY
      : rect.top + rect.height / 2;

    burstHearts(x, y, 18);

    if (state.noAttempts > 0) {
      showToast("أخيراً! سيكون هذا موعداً جميلاً. 🥰");
    }

    goToStep(2);
  });

  /* ---------- التقويم ---------- */

  function renderCalendar(animate = false) {
    const year = state.viewYear;
    const month = state.viewMonth;
    const viewDate = new Date(year, month, 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastAllowed = new Date(today.getFullYear(), today.getMonth() + 11, 1);

    calendarTitle.textContent = monthFormatter.format(viewDate);
    calPrev.disabled = viewDate <= monthStart;
    calNext.disabled = viewDate >= lastAllowed;

    const firstWeekday = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const fragment = document.createDocumentFragment();

    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const spacer = document.createElement("span");
      spacer.className = "day-spacer";
      spacer.setAttribute("aria-hidden", "true");
      fragment.appendChild(spacer);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const button = document.createElement("button");
      const isSelected = isSameDay(date, state.selectedDate);
      const isToday = isSameDay(date, today);

      button.type = "button";
      button.className = "day";
      button.textContent = String(day);
      button.dataset.date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      button.disabled = date < today;
      button.setAttribute("aria-pressed", String(isSelected));
      button.setAttribute(
        "aria-label",
        `${fullDateFormatter.format(date)}${isToday ? "، اليوم" : ""}`
      );

      if (isSelected) button.classList.add("is-selected");
      if (isToday) button.classList.add("is-today");

      fragment.appendChild(button);
    }

    daysEl.replaceChildren(fragment);

    if (animate) {
      daysEl.classList.remove("is-switching");
      void daysEl.offsetWidth;
      daysEl.classList.add("is-switching");
    }

    calendarRendered = true;
  }

  function shiftMonth(direction) {
    const candidate = new Date(state.viewYear, state.viewMonth + direction, 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastAllowed = new Date(today.getFullYear(), today.getMonth() + 11, 1);

    if (candidate < monthStart || candidate > lastAllowed) return;

    state.viewYear = candidate.getFullYear();
    state.viewMonth = candidate.getMonth();
    renderCalendar(true);
  }

  function selectDate(date, event) {
    if (date < today) return;

    state.selectedDate = date;
    chosenDateText.textContent = fullDateFormatter.format(date);
    dateSummary.classList.add("has-value");
    dateNext.classList.remove("is-disabled");
    dateNext.setAttribute("aria-disabled", "false");
    renderCalendar(false);

    if (event) {
      burstHearts(event.clientX, event.clientY, 9);
    }
  }

  calPrev.addEventListener("click", () => shiftMonth(-1));
  calNext.addEventListener("click", () => shiftMonth(1));

  daysEl.addEventListener("click", (event) => {
    const button = event.target.closest(".day");
    if (!button || button.disabled) return;

    const parts = button.dataset.date.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    selectDate(date, event);
  });

  dateNext.addEventListener("click", (event) => {
    if (!state.selectedDate) {
      showToast("اختَر يوماً أولاً... ثم نكمل 🌷");
      dateSummary.classList.add("is-shaking");
      window.setTimeout(() => dateSummary.classList.remove("is-shaking"), 450);
      return;
    }

    burstHearts(event.clientX, event.clientY, 10);
    goToStep(3);
  });

  /* ---------- الطعام ---------- */

  function syncFoodStep() {
    if (state.selectedDate) {
      foodDateChip.textContent = shortDateFormatter.format(state.selectedDate);
    } else {
      foodDateChip.textContent = "لم يتم اختيار اليوم بعد";
    }

    foodCards.forEach((cardEl) => {
      const selected = Boolean(state.selectedFood) &&
        cardEl.dataset.food === state.selectedFood.label;
      cardEl.classList.toggle("is-selected", selected);
      cardEl.setAttribute("aria-pressed", String(selected));
    });

    if (state.selectedFood) {
      foodHint.textContent = `اختيارك: ${state.selectedFood.label} ${state.selectedFood.emoji}`;
      foodNext.classList.remove("is-disabled");
      foodNext.setAttribute("aria-disabled", "false");
    } else {
      foodHint.textContent = "اختيار واحد فقط... والقلب يعرف ما يريد. 🤍";
      foodNext.classList.add("is-disabled");
      foodNext.setAttribute("aria-disabled", "true");
    }
  }

  foodCards.forEach((foodCard) => {
    foodCard.addEventListener("click", (event) => {
      state.selectedFood = {
        label: foodCard.dataset.food,
        emoji: foodCard.dataset.emoji || "♥"
      };

      foodCards.forEach((item) => {
        const selected = item === foodCard;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });

      foodHint.textContent = `اختيارك: ${state.selectedFood.label} ${state.selectedFood.emoji}`;
      foodNext.classList.remove("is-disabled");
      foodNext.setAttribute("aria-disabled", "false");
      burstHearts(event.clientX, event.clientY, 7);
    });
  });

  foodNext.addEventListener("click", () => {
    if (!state.selectedFood) {
      showToast("اختر طبقاً واحداً... يكفي أن يكون لذيذاً 😋");
      foodGrid.classList.add("is-shaking");
      window.setTimeout(() => foodGrid.classList.remove("is-shaking"), 450);
      return;
    }

    goToStep(4);
  });

  /* ---------- الرسالة ---------- */

  function syncLetter() {
    letterDate.textContent = state.selectedDate
      ? fullDateFormatter.format(state.selectedDate)
      : "يوماً قريباً";
    letterFood.textContent = state.selectedFood
      ? state.selectedFood.label
      : "شيئاً لذيذاً";
  }

  replayBtn.addEventListener("click", () => {
    resetExperience();
  });

  /* ---------- إعادة الضبط ---------- */

  function resetExperience() {
    state.noAttempts = 0;
    state.selectedDate = null;
    state.selectedFood = null;
    state.viewYear = today.getFullYear();
    state.viewMonth = today.getMonth();

    dockNoButton();
    yesBtn.style.setProperty("--grow", "1");
    yesBtn.classList.remove("is-max");
    yesBtn.setAttribute("aria-label", "حسناً، أريد الخروج معك في موعد");
    noTease.textContent = "لا توجد إجابة خاطئة... لكن واحدة منها ألطف. 😉";

    chosenDateText.textContent = "لم يتم الاختيار بعد";
    dateSummary.classList.remove("has-value");
    dateNext.classList.add("is-disabled");
    dateNext.setAttribute("aria-disabled", "true");

    foodCards.forEach((foodCard) => {
      foodCard.classList.remove("is-selected");
      foodCard.setAttribute("aria-pressed", "false");
    });
    foodHint.textContent = "اختيار واحد فقط... والقلب يعرف ما يريد. 🤍";
    foodNext.classList.add("is-disabled");
    foodNext.setAttribute("aria-disabled", "true");
    foodDateChip.textContent = "لم يتم اختيار اليوم بعد";

    letterDate.textContent = "يوماً قريباً";
    letterFood.textContent = "شيئاً لذيذاً";

    renderCalendar(false);
    goToStep(1);
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  $$("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.back);
      if (target === 1) {
        dockNoButton();
      }
      goToStep(target);
    });
  });

  /* ---------- البداية ---------- */

  weekdaysEl.innerHTML = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
    .map((day) => `<span class="weekday">${day}</span>`)
    .join("");

  initParticles();
  renderCalendar();
})();