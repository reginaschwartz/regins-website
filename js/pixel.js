const PIXEL_CONFIG = {
  pixelId: "1234567890123456",
  requireConsent: true,
  debug: true,
};

const CONSENT_STORAGE_KEY = "meta-pixel-consent";
const firedEvents = new Set();
let trackingEnabled = false;

function isConfigured() {
  return Boolean(PIXEL_CONFIG.pixelId) && PIXEL_CONFIG.pixelId.startsWith("1234567890123456");
}

function log(...args) {
  if (PIXEL_CONFIG.debug || !isConfigured()) {
    console.info("[meta-pixel]", ...args);
  }
}

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function saveConsent(choice) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch (error) {
    log("consent could not be stored", error.message);
  }
}

// Official Meta Pixel base code: creates the fbq() queue and loads fbevents.js.
function loadPixelLibrary() {
  if (window.fbq) {
    return;
  }

  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  fbq('init', 'shopify');
  fbq('track', 'PageView');

}

// !function (f, b, e, v, n, t, s) {
//   if (f.fbq) return;
//   n = f.fbq = function () {
//     n.callMethod ?
//         n.callMethod.apply(n, arguments) : n.queue.push(arguments)
//   };
//   if (!f._fbq) f._fbq = n;
//   n.push = n;
//   n.loaded = !0;
//   n.version = '2.0';
//   n.queue = [];
//   t = b.createElement(e);
//   t.async = !0;
//   t.src = v;
//   s = b.getElementsByTagName(e)[0];
//   s.parentNode.insertBefore(t, s)
// }(window, document, 'script',
//     'https://connect.facebook.net/en_US/fbevents.js');

// fbq('init', 'shopify');
// fbq('track', 'PageView');

function track(eventName, params = {}, options = {}) {
  if (!trackingEnabled) {
    return;
  }

  if (options.once) {
    if (firedEvents.has(options.once)) {
      return;
    }
    firedEvents.add(options.once);
  }

  log(eventName, params);

  if (!window.fbq) {
    return;
  }

  if (options.custom) {
    window.fbq("trackCustom", eventName, params);
  } else {
    window.fbq("track", eventName, params);
  }
}

function startTracking() {
  trackingEnabled = true;

  if (!isConfigured()) {
    log("pixel id is not set — events are logged to the console only");
    track("PageView");
    return;
  }

  loadPixelLibrary();
  window.fbq("init", PIXEL_CONFIG.pixelId);
  track("PageView");
}

function wireLinkEvents() {
  document.querySelectorAll('a[href*="linkedin.com"]').forEach((link) => {
    link.addEventListener("click", () => {
      track("Lead", {
        content_name: "LinkedIn profile",
        content_category: link.closest("section, header, footer")?.id || "page",
      });
    });
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.addEventListener("click", () => {
      track("Contact", { content_name: "Email" });
    });
  });
}

function wireSectionViews() {
  const sections = document.querySelectorAll("main section[id]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const sectionId = entry.target.id;
        track(
          "ViewContent",
          { content_name: sectionId, content_type: "section" },
          { once: `section-${sectionId}` }
        );
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  sections.forEach((section) => observer.observe(section));
}

function wireScrollDepth() {
  const milestones = [50, 90];

  const onScroll = () => {
    const viewed =
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100;

    milestones.forEach((percent) => {
      if (viewed >= percent) {
        track("ScrollDepth", { percent }, { once: `scroll-${percent}`, custom: true });
      }
    });

    if (milestones.every((percent) => firedEvents.has(`scroll-${percent}`))) {
      window.removeEventListener("scroll", onScroll);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}

function showConsentBanner() {
  const banner = document.createElement("aside");
  banner.className = "consent-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Cookie consent");
  banner.innerHTML = `
    <p>I use the Meta Pixel to measure how visitors reach this page. May I enable it?</p>
    <div class="consent-actions">
      <button type="button" class="linkedin-cta" data-consent="granted">Accept</button>
      <button type="button" class="ghost-btn" data-consent="denied">Decline</button>
    </div>
  `;

  banner.addEventListener("click", (event) => {
    const choice = event.target.dataset.consent;
    if (!choice) {
      return;
    }

    saveConsent(choice);
    banner.remove();

    if (choice === "granted") {
      startTracking();
    }
  });

  document.body.appendChild(banner);
}

document.addEventListener("DOMContentLoaded", () => {
  wireLinkEvents();
  wireSectionViews();
  wireScrollDepth();

  const consent = readConsent();

  // if (!PIXEL_CONFIG.requireConsent || consent === "granted") {
  //   startTracking();
  // } else
  if (consent !== "denied") {
    showConsentBanner();
  }
});
