const translations = window.Logos7Translations || {};

const languageButtons = document.querySelectorAll("[data-language]");

const readStoredLanguage = () => {
  try {
    return localStorage.getItem("logos7-language");
  } catch {
    return null;
  }
};

const storeLanguage = language => {
  try {
    localStorage.setItem("logos7-language", language);
  } catch {
  }
};

const translateAttributes = (element, language) => {
  const specification = element.dataset.i18nAttr;

  if (!specification) {
    return;
  }

  for (const entry of specification.split(";")) {
    const separator = entry.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const attribute = entry.slice(0, separator);
    const key = entry.slice(separator + 1);
    const value = translations[language][key];

    if (value !== undefined) {
      element.setAttribute(attribute, value);
    }
  }
};

const applyLanguage = (language, persist = false) => {
  if (!translations[language]) {
    language = "en";
  }

  document.documentElement.lang = language;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    const value = translations[language][element.dataset.i18n];

    if (value !== undefined) {
      element.textContent = value;
    }
  }

  for (const element of document.querySelectorAll("[data-i18n-html]")) {
    const value = translations[language][element.dataset.i18nHtml];

    if (value !== undefined) {
      element.innerHTML = value;
    }
  }

  for (const element of document.querySelectorAll("[data-i18n-attr]")) {
    translateAttributes(element, language);
  }

  for (const button of languageButtons) {
    const isActive = button.dataset.language === language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  if (persist) {
    storeLanguage(language);
  }
};

for (const button of languageButtons) {
  button.addEventListener("click", () => applyLanguage(button.dataset.language, true));
}

applyLanguage(readStoredLanguage() || "en");

const year = document.querySelector("[data-year]");

if (year) {
  year.textContent = String(new Date().getFullYear());
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });

  for (const item of revealItems) {
    observer.observe(item);
  }
} else {
  for (const item of revealItems) {
    item.classList.add("is-visible");
  }
}

const projectFilters = document.querySelectorAll("[data-project-filter]");
const projectCards = document.querySelectorAll("[data-project-category]");
const projectsEmpty = document.querySelector("[data-projects-empty]");

for (const filter of projectFilters) {
  filter.addEventListener("click", () => {
    const selected = filter.dataset.projectFilter;
    let visibleCount = 0;

    for (const item of projectFilters) {
      const isActive = item === filter;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    }

    for (const card of projectCards) {
      const isVisible = selected === "all" || card.dataset.projectCategory === selected;
      card.hidden = !isVisible;
      visibleCount += Number(isVisible);
    }

    if (projectsEmpty) {
      projectsEmpty.hidden = visibleCount !== 0;
    }
  });
}
