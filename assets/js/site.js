const year = document.querySelector("[data-year]");

if (year) {
  year.textContent = String(new Date().getFullYear());
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });

  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add("is-visible"));
}


const projectFilters = document.querySelectorAll("[data-project-filter]");
const projectCards = document.querySelectorAll("[data-project-category]");
const projectsEmpty = document.querySelector("[data-projects-empty]");

projectFilters.forEach(filter => {
  filter.addEventListener("click", () => {
    const selected = filter.dataset.projectFilter;
    let visibleCount = 0;

    projectFilters.forEach(item => {
      const isActive = item === filter;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    projectCards.forEach(card => {
      const isVisible = selected === "all" || card.dataset.projectCategory === selected;
      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (projectsEmpty) {
      projectsEmpty.hidden = visibleCount !== 0;
    }
  });
});
