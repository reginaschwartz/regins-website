const LINKEDIN_URL = "https://www.linkedin.com/in/regina-schwartz-6b4901161/";

const profile = {
  roles: [
    "Senior Software Developer & Technical Lead",
    "Distributed systems, cloud platforms, and microservices",
    "Bridging backend engineering with modern AI workflows",
  ],
  about:
    "Highly accomplished, autonomous Technical Lead with 15+ years designing, building, and scaling high-performance distributed systems. I own the full feature lifecycle of microservices architectures — 50+ Spring Boot services — on enterprise cloud platforms, and I pair that with hands-on Python and LLM work for agentic tools and modular AI skills.",
  highlights: [
    "Architecture reviews, code reviews, and mentorship across the group",
    "NoSQL (Couchbase, Cassandra) and event streaming with Kafka",
    "CI/CD ownership on Jenkins, Docker, Kubernetes, and OpenShift",
  ],
  experience: [
    { label: "Java", years: 20 },
    { label: "Spring Boot", years: 9 },
    { label: "Kubernetes", years: 9 },
    { label: "Python", years: 3 },
    { label: "Microservices", years: 9 },
    { label: "Kafka", years: 9 },
    { label: "NoSQL", years: 10 },
    { label: "AI & LLMs", years: 2 },
  ],
  expertise: [
    "Java",
    "J2EE",
    "Spring Boot",
    "Spring Cloud",
    "REST APIs",
    "Python",
    "LLMs",
    "Prompt Engineering",
    "Agentic Frameworks",
    "MCP",
    "Kubernetes",
    "Docker",
    "OpenShift",
    "Jenkins",
    "CI/CD",
    "Distributed Systems",
    "Microservices",
    "Platform Engineering",
    "Couchbase",
    "Cassandra",
    "Kafka",
    "Oracle",
    "JUnit",
    "Mockito",
  ],
  timeline: [
    {
      title: "Technical Lead / Software Development Expert",
      meta: "Amdocs · 2017 – Present",
      detail:
        "Lead architecture and delivery of cloud-ready microservices with Docker, Kubernetes, OpenShift, Couchbase, Kafka, and Spring Boot/Cloud. Pioneer internal AI initiatives and mentor developers across the group.",
    },
    {
      title: "Software Development Specialist",
      meta: "Amdocs · 2014 – 2017",
      detail:
        "Built enterprise code across all layers of core distributed applications and helped migrate legacy Java-Oracle stacks toward high-throughput NoSQL and Cassandra.",
    },
    {
      title: "J2EE Implementor & Software Developer",
      meta: "Amdocs · 2006 – 2014",
      detail:
        "Designed multi-server WebLogic and WebSphere topologies, automated Oracle and JMS/JDBC setup, and implemented core Java/JEE business components.",
    },
    {
      title: "Middleware Expert & Technical Support Lead",
      meta: "Amdocs & BEA Systems Israel · 2004 – 2005",
      detail:
        "Fine-tuned high-availability J2EE application servers and provided specialized infrastructure support for distributed enterprise middleware.",
    },
  ],
};

function renderList(target, items, markup) {
  target.innerHTML = items.map(markup).join("");
}

function renderPage() {
  renderList(
    document.getElementById("hero-roles"),
    profile.roles,
    (role) => `<li>${role}</li>`
  );

  renderList(
    document.getElementById("experience-grid"),
    profile.experience,
    (item) => `
      <article class="exp-card">
        <p class="label">${item.label}</p>
        <p class="years"><span data-count="${item.years}">0</span> Years</p>
      </article>
    `
  );

  renderList(
    document.getElementById("expertise-tags"),
    profile.expertise,
    (tag) => `<span class="tag">${tag}</span>`
  );

  document.getElementById("about-lead").textContent = profile.about;

  renderList(
    document.getElementById("highlights"),
    profile.highlights,
    (item) => `<li>${item}</li>`
  );

  renderList(
    document.getElementById("timeline"),
    profile.timeline,
    (role) => `
      <article class="role-card">
        <h3>${role.title}</h3>
        <p class="meta">${role.meta}</p>
        <p>${role.detail}</p>
      </article>
    `
  );

  document.getElementById("year").textContent = String(new Date().getFullYear());
}

function animateCounters() {
  const counters = document.querySelectorAll("[data-count]");
  const seen = new WeakSet();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || seen.has(entry.target)) {
          return;
        }

        seen.add(entry.target);
        const end = Number(entry.target.dataset.count);
        const start = performance.now();
        const duration = 900;

        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          entry.target.textContent = String(Math.round(end * progress));
          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        };

        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function wireNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPage();
  animateCounters();
  wireNav();
  document.querySelectorAll('a[href="' + LINKEDIN_URL + '"]').forEach((link) => {
    link.setAttribute("title", "Go to LinkedIn");
  });
});
