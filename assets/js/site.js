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
