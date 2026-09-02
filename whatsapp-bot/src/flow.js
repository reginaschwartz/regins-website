// Conversation definition. Each node either offers buttons (max 3, titles max
// 20 chars — a Cloud API limit) or waits for free text.
export const START_NODE = "intent";

export const flow = {
  intent: {
    prompt:
      "Hi, this is Regina's assistant. Thanks for reaching out! What brings you here?",
    options: [
      { id: "hiring", title: "Hiring", next: "hiring_role" },
      { id: "mentoring", title: "Mentoring", next: "mentoring_stage" },
      { id: "other", title: "Something else", next: "other_topic" },
    ],
  },

  hiring_role: {
    prompt: "Great. What kind of engagement do you have in mind?",
    options: [
      { id: "fulltime", title: "Full-time role", next: "hiring_focus" },
      { id: "contract", title: "Contract", next: "hiring_focus" },
      { id: "advisory", title: "Advisory", next: "hiring_focus" },
    ],
  },
  hiring_focus: {
    prompt: "Which area is closest to the work?",
    options: [
      { id: "backend", title: "Backend / Java", next: "hiring_seniority" },
      { id: "cloud", title: "Cloud / K8s", next: "hiring_seniority" },
      { id: "ai", title: "AI / LLM", next: "hiring_seniority" },
    ],
  },
  hiring_seniority: {
    prompt: "What seniority are you hiring for?",
    options: [
      { id: "ic", title: "IC / hands-on", next: "hiring_location" },
      { id: "lead", title: "Tech lead", next: "hiring_location" },
      { id: "architect", title: "Architect", next: "hiring_location" },
    ],
  },
  hiring_location: {
    prompt: "Where would the work be based?",
    options: [
      { id: "israel", title: "Israel", next: "hiring_timing" },
      { id: "remote", title: "Remote", next: "hiring_timing" },
      { id: "hybrid", title: "Hybrid / other", next: "hiring_timing" },
    ],
  },
  hiring_timing: {
    prompt: "When would you like someone to start?",
    options: [
      { id: "asap", title: "ASAP", next: "hiring_details" },
      { id: "month", title: "Within a month", next: "hiring_details" },
      { id: "later", title: "Later / exploring", next: "hiring_details" },
    ],
  },
  hiring_details: {
    prompt: "Which company is this for, and a line about the team or product?",
    expect: "text",
    next: "wrap_up",
  },

  mentoring_stage: {
    prompt: "Happy to help. Where are you in your career right now?",
    options: [
      { id: "junior", title: "Junior dev", next: "mentoring_focus" },
      { id: "switcher", title: "Career switcher", next: "mentoring_focus" },
      { id: "senior", title: "Senior dev", next: "mentoring_focus" },
    ],
  },
  mentoring_focus: {
    prompt: "What would you most like help with?",
    options: [
      { id: "interviews", title: "Interviews", next: "mentoring_stack" },
      { id: "system_design", title: "System design", next: "mentoring_stack" },
      { id: "career", title: "Career path", next: "mentoring_stack" },
    ],
  },
  mentoring_stack: {
    prompt: "Which stack are you closest to today?",
    options: [
      { id: "java", title: "Java / Spring", next: "mentoring_cadence" },
      { id: "python", title: "Python / AI", next: "mentoring_cadence" },
      { id: "mixed", title: "Mixed / other", next: "mentoring_cadence" },
    ],
  },
  mentoring_cadence: {
    prompt: "How often would you want to talk?",
    options: [
      { id: "weekly", title: "Weekly", next: "mentoring_goal" },
      { id: "biweekly", title: "Every 2 weeks", next: "mentoring_goal" },
      { id: "once", title: "One-off session", next: "mentoring_goal" },
    ],
  },
  mentoring_goal: {
    prompt:
      "What would you most like to achieve in the next six months? A sentence or two is plenty.",
    expect: "text",
    next: "wrap_up",
  },

  other_topic: {
    prompt: "No problem. Which of these is closest?",
    options: [
      { id: "architecture", title: "Architecture", next: "other_urgency" },
      { id: "migration", title: "Cloud migration", next: "other_urgency" },
      { id: "ai_adoption", title: "AI adoption", next: "other_urgency" },
    ],
  },
  other_urgency: {
    prompt: "How urgent is this?",
    options: [
      { id: "now", title: "This week", next: "other_size" },
      { id: "soon", title: "This month", next: "other_size" },
      { id: "explore", title: "Just exploring", next: "other_size" },
    ],
  },
  other_size: {
    prompt: "Roughly what scale are we talking about?",
    options: [
      { id: "feature", title: "One feature", next: "other_details" },
      { id: "service", title: "A service / team", next: "other_details" },
      { id: "platform", title: "Whole platform", next: "other_details" },
    ],
  },
  other_details: {
    prompt: "Tell me a bit more about what you are working on.",
    expect: "text",
    next: "wrap_up",
  },

  wrap_up: {
    prompt: "Thanks! Here is what I noted:",
    summary: true,
    end: true,
  },
};

export const LABELS = {
  intent: "Reason",
  hiring_role: "Engagement",
  hiring_focus: "Focus area",
  hiring_seniority: "Seniority",
  hiring_location: "Location",
  hiring_timing: "Start",
  hiring_details: "Company",
  mentoring_stage: "Career stage",
  mentoring_focus: "Help with",
  mentoring_stack: "Stack",
  mentoring_cadence: "Cadence",
  mentoring_goal: "Goal",
  other_topic: "Topic",
  other_urgency: "Urgency",
  other_size: "Scale",
  other_details: "Details",
};

export const CLOSING =
  "Regina will read this and reply personally, usually within a day. Send \"restart\" any time to start over.";
