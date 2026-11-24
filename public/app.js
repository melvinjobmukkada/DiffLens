// E2 / E3 Website Content Comparator
// File location: public/app.js

const compareBtn = document.getElementById("compareBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const comparisonEl = document.getElementById("comparison");
const searchInput = document.getElementById("searchInput");
const summaryEl = document.getElementById("summary");
// Show comparison completion notification
function showCompletionToast(message) {
  const toast = document.getElementById("completionToast");
  const toastMessage = document.getElementById("toastMessage");

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.classList.add("show");

  clearTimeout(showCompletionToast.timeout);

  showCompletionToast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 4500);
}
let latestData = null;

let aiSummaryPanel;
let aiSummaryButton;
let aiSummaryOutput;

function setupAISummaryUI() {
  aiSummaryPanel = document.createElement("section");
  aiSummaryPanel.className = "ai-summary-panel";

  const titleRow = document.createElement("div");
  titleRow.className = "ai-summary-title-row";

  const icon = document.createElement("span");
  icon.className = "ai-summary-icon";
  icon.textContent = "✦";

  const titleText = document.createElement("div");
  titleText.className = "ai-summary-title-text";

  const heading = document.createElement("h3");
  heading.textContent = "AI Change Summary";

  const provider = document.createElement("span");
  provider.className = "ai-summary-provider";
  provider.textContent = "Powered by local Ollama";

  titleText.append(heading, provider);
  titleRow.append(icon, titleText);

  const description = document.createElement("p");
  description.textContent =
    "Generate an intelligent summary of the differences between E2 and E3.";
  description.className = "ai-summary-description";

  aiSummaryButton = document.createElement("button");
  aiSummaryButton.textContent = "Generate AI Summary";

  aiSummaryButton.addEventListener("click", generateAISummary);

  aiSummaryOutput = document.createElement("div");
  aiSummaryOutput.className = "ai-summary-output";

  aiSummaryPanel.append(
    titleRow,
    description,
    aiSummaryButton,
    aiSummaryOutput,
  );

  resultsEl.insertBefore(aiSummaryPanel, comparisonEl);
}

async function generateAISummary() {
  if (!latestData) return;

  const sections = compareSections(latestData.e2, latestData.e3);

  const added = [];
  const removed = [];

  sections.forEach((section) => {
    section.added.forEach((text) => {
      added.push(`[${section.heading}] ${text}`);
    });

    section.removed.forEach((text) => {
      removed.push(`[${section.heading}] ${text}`);
    });
  });

  aiSummaryButton.disabled = true;
  aiSummaryButton.textContent = "Generating summary...";
  aiSummaryOutput.textContent =
    "Ollama is analysing the website changes. Please wait...";

  try {
    const response = await fetch("/api/ai-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        added: added.slice(0, 60),
        removed: removed.slice(0, 60),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "AI summary failed.");
    }

    renderAISummary(data.summary);
  } catch (error) {
    console.error("AI summary error:", error);

    aiSummaryOutput.textContent =
      "Unable to generate AI summary: " + error.message;
  } finally {
    aiSummaryButton.disabled = false;
    aiSummaryButton.textContent = "Generate AI Summary";
  }
}

function renderAISummary(markdown) {
  aiSummaryOutput.replaceChildren();

  const lines = String(markdown || "").split("\n");
  if (!String(markdown || "").trim()) {
    aiSummaryOutput.textContent = "No summary was returned by the AI.";
    return;
  }

  function addInlineText(container, text) {
    const parts = text.split(/(\*\*.*?\*\*)/g);

    parts.forEach((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        container.appendChild(strong);
      } else if (part) {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  let list = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      list = null;
      return;
    }

    // Markdown headings
    if (/^#{1,3}\s/.test(line)) {
      list = null;

      const heading = document.createElement(
        line.startsWith("# ") ? "h3" : "h4",
      );

      heading.className = "ai-report-heading";
      heading.textContent = line.replace(/^#{1,3}\s/, "");

      aiSummaryOutput.appendChild(heading);
      return;
    }

    // Bold-only headings, e.g. **1. Overall Summary**
    if (/^\*\*.*\*\*$/.test(line)) {
      list = null;

      const heading = document.createElement("h4");
      heading.className = "ai-report-heading";
      heading.textContent = line.replace(/\*\*/g, "");

      aiSummaryOutput.appendChild(heading);
      return;
    }

    // Bullet lists
    if (/^[-*]\s/.test(line)) {
      if (!list) {
        list = document.createElement("ul");
        list.className = "ai-report-list";
        aiSummaryOutput.appendChild(list);
      }

      const li = document.createElement("li");
      addInlineText(li, line.replace(/^[-*]\s/, ""));
      list.appendChild(li);
      return;
    }

    list = null;

    // Normal paragraphs
    const paragraph = document.createElement("p");
    paragraph.className = "ai-report-paragraph";

    addInlineText(paragraph, line);

    aiSummaryOutput.appendChild(paragraph);
  });
}

// Check that all required HTML elements exist
if (
  !compareBtn ||
  !statusEl ||
  !resultsEl ||
  !comparisonEl ||
  !searchInput ||
  !summaryEl
) {
  console.error("Comparator setup error: Missing HTML elements.");

  if (statusEl) {
    statusEl.textContent =
      "Page setup error: Check the element IDs in index.html.";
  }
} else {
  compareBtn.addEventListener("click", compare);
  searchInput.addEventListener("input", render);
  setupAISummaryUI();
}

// Compare E2 and E3 pages
async function compare() {
  const e2Url = document.getElementById("e2Url")?.value.trim() || "";
  const e3Url = document.getElementById("e3Url")?.value.trim() || "";

  statusEl.textContent = "";

  if (!e2Url || !e3Url) {
    statusEl.textContent = "Please enter both public URLs.";
    return;
  }

  compareBtn.disabled = true;
  compareBtn.textContent = "Opening pages...";

  statusEl.textContent =
    "Opening both URLs and extracting page content. This may take a minute...";

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        e2Url,
        e3Url,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Server error (${response.status}).`);
    }

    if (!Array.isArray(data.e2) || !Array.isArray(data.e3)) {
      throw new Error(
        "Server response is missing E2/E3 content. Check server.js.",
      );
    }

    latestData = data;
    aiSummaryOutput.replaceChildren();
    aiSummaryButton.disabled = false;
    aiSummaryButton.textContent = "Generate AI Summary";

    resultsEl.hidden = false;
    searchInput.value = "";

    statusEl.textContent = "Comparison completed successfully.";

    render();

    showCompletionToast("Comparison completed successfully!");
  } catch (error) {
    console.error("Comparison failed:", error);

    statusEl.textContent =
      error.message || "Comparison failed. Check the server terminal.";
  } finally {
    compareBtn.disabled = false;
    compareBtn.textContent = "Compare contents";
  }
}

// Normalize text for comparison
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Compare sections and their text content
function compareSections(e2 = [], e3 = []) {
  const oldMap = new Map(
    e3.map((section) => [normalize(section.heading), section]),
  );

  const newMap = new Map(
    e2.map((section) => [normalize(section.heading), section]),
  );

  const keys = [
    ...new Set([
      ...e2.map((section) => normalize(section.heading)),
      ...e3.map((section) => normalize(section.heading)),
    ]),
  ];

  return keys.map((key) => {
    const newer = newMap.get(key);
    const older = oldMap.get(key);

    const newItems = newer?.items || [];
    const oldItems = older?.items || [];

    const oldSet = new Set(oldItems.map(normalize));
    const newSet = new Set(newItems.map(normalize));

    return {
      heading: (newer || older)?.heading || "General content",

      added: newItems.filter((item) => !oldSet.has(normalize(item))),

      removed: oldItems.filter((item) => !newSet.has(normalize(item))),

      e2ItemDetails: newer?.itemDetails || [],
      e3ItemDetails: older?.itemDetails || [],
    };
  });
}

// Find images associated with the exact changed text item
function findItemImages(text, itemDetails = []) {
  const wanted = normalize(text);

  const match = itemDetails.find((detail) => normalize(detail.text) === wanted);

  const images = Array.isArray(match?.images) ? match.images : [];

  const unique = new Map();

  images.forEach((img) => {
    if (img?.url && !unique.has(img.url)) {
      unique.set(img.url, img);
    }
  });

  return [...unique.values()];
}

// Create a text item with associated images
function makeTextItem(text, type, images = []) {
  const wrapper = document.createElement("div");
  wrapper.className = `item ${type}`;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  wrapper.appendChild(paragraph);

  if (images.length) {
    const imageWrap = document.createElement("div");
    imageWrap.className = "associated-images";

    images.forEach((img) => {
      const image = document.createElement("img");

      image.src = img.url;
      image.alt = img.alt || "Associated page image";
      image.loading = "lazy";
      image.className = "item-associated-image";

      image.onerror = () => image.remove();

      imageWrap.appendChild(image);
    });

    wrapper.appendChild(imageWrap);
  }

  return wrapper;
}

// Normalize image URLs for E2/E3 comparison
function normalizeImageUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);

    return `${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

// Compare images between E2 and E3
function compareImages(e2Images = [], e3Images = []) {
  const uniqueByUrl = (images) => {
    const map = new Map();

    images.forEach((img) => {
      if (img?.url) {
        const key = normalizeImageUrl(img.url);

        if (!map.has(key)) {
          map.set(key, img);
        }
      }
    });

    return map;
  };

  const e2 = uniqueByUrl(e2Images);
  const e3 = uniqueByUrl(e3Images);

  return {
    added: [...e2].filter(([key]) => !e3.has(key)).map(([, img]) => img),

    removed: [...e3].filter(([key]) => !e2.has(key)).map(([, img]) => img),
  };
}

// Display image-only changes
function createImageItem(img, type) {
  const card = document.createElement("div");
  card.className = `image-item ${type}`;

  const image = document.createElement("img");

  image.src = img.url;
  image.alt = img.alt || "Page image";
  image.loading = "lazy";

  image.onerror = () => {
    image.alt = "Image preview unavailable";
  };

  const details = document.createElement("div");

  const name = document.createElement("strong");
  name.textContent = img.alt || "Unnamed image";

  const url = document.createElement("p");
  url.textContent = img.url;

  details.append(name, url);
  card.append(image, details);

  return card;
}

// Display image changes not already shown beside changed text
function renderImageComparison(query, sections) {
  const changes = compareImages(
    latestData.e2Images || [],
    latestData.e3Images || [],
  );

  const shownE2 = new Set();
  const shownE3 = new Set();

  sections.forEach((section) => {
    section.added.forEach((text) => {
      findItemImages(text, section.e2ItemDetails).forEach((img) => {
        shownE2.add(normalizeImageUrl(img.url));
      });
    });

    section.removed.forEach((text) => {
      findItemImages(text, section.e3ItemDetails).forEach((img) => {
        shownE3.add(normalizeImageUrl(img.url));
      });
    });
  });

  const added = changes.added.filter(
    (img) =>
      !shownE2.has(normalizeImageUrl(img.url)) &&
      (!query || normalize(`${img.alt} ${img.url}`).includes(query)),
  );

  const removed = changes.removed.filter(
    (img) =>
      !shownE3.has(normalizeImageUrl(img.url)) &&
      (!query || normalize(`${img.alt} ${img.url}`).includes(query)),
  );

  if (!added.length && !removed.length) {
    return;
  }

  const section = document.createElement("article");
  section.className = "section-card";

  const heading = document.createElement("h3");
  heading.className = "section-title";
  heading.textContent = "Other Image Changes";

  section.appendChild(heading);

  const columns = document.createElement("div");
  columns.className = "columns";

  const e2Col = document.createElement("div");
  const e3Col = document.createElement("div");

  e2Col.className = "column";
  e3Col.className = "column";

  const e2Title = document.createElement("h4");
  const e3Title = document.createElement("h4");

  e2Title.textContent = `New in E2 (${added.length})`;
  e3Title.textContent = `Removed from E3 (${removed.length})`;

  e2Col.appendChild(e2Title);
  e3Col.appendChild(e3Title);

  added.forEach((img) => {
    e2Col.appendChild(createImageItem(img, "added"));
  });

  removed.forEach((img) => {
    e3Col.appendChild(createImageItem(img, "removed"));
  });

  columns.append(e2Col, e3Col);
  section.appendChild(columns);

  comparisonEl.appendChild(section);
}

// Render comparison results
function render() {
  if (!latestData) return;

  const query = normalize(searchInput.value);

  const allSections = compareSections(latestData.e2, latestData.e3);

  const changedSections = allSections.filter(
    (section) => section.added.length || section.removed.length,
  );

  const filteredSections = changedSections.filter((section) => {
    if (!query) return true;

    return (
      normalize(section.heading).includes(query) ||
      [...section.added, ...section.removed].some((text) =>
        normalize(text).includes(query),
      )
    );
  });

  const addedCount = changedSections.reduce(
    (sum, section) => sum + section.added.length,
    0,
  );

  const removedCount = changedSections.reduce(
    (sum, section) => sum + section.removed.length,
    0,
  );

  const imageChanges = compareImages(
    latestData.e2Images || [],
    latestData.e3Images || [],
  );

  // Summary statistics
  summaryEl.replaceChildren();

  [
    `${changedSections.length} changed sections`,
    `${addedCount} new E2 items`,
    `${removedCount} removed/replaced E3 items`,
    `${imageChanges.added.length} new images`,
    `${imageChanges.removed.length} removed images`,
  ].forEach((label) => {
    const stat = document.createElement("div");

    stat.className = "stat";
    stat.textContent = label;

    summaryEl.appendChild(stat);
  });

  comparisonEl.replaceChildren();

  // Render changed text
  if (!filteredSections.length) {
    if (query) {
      const message = document.createElement("div");
      message.className = "search-no-results";
      message.textContent =
        "No matching text differences found for your search.";

      comparisonEl.appendChild(message);
    } else {
      const message = document.createElement("div");
      message.className = "no-differences";

      const icon = document.createElement("div");
      icon.className = "success-icon";
      icon.textContent = "✓";

      const heading = document.createElement("h3");
      heading.textContent = "No Text Differences Found!";

      const description = document.createElement("p");
      description.textContent =
        "The E2 and E3 pages have matching text content. Check image comparison below for image changes.";

      message.append(icon, heading, description);
      comparisonEl.appendChild(message);
    }
  } else {
    filteredSections.forEach((section) => {
      const card = document.createElement("article");
      card.className = "section-card";

      const title = document.createElement("h3");
      title.className = "section-title";
      title.textContent = section.heading;

      card.appendChild(title);

      const columns = document.createElement("div");
      columns.className = "columns";

      const e2Col = document.createElement("div");
      const e3Col = document.createElement("div");

      e2Col.className = "column";
      e3Col.className = "column";

      const e2Title = document.createElement("h4");
      const e3Title = document.createElement("h4");

      e2Title.textContent = `New in E2 (${section.added.length})`;
      e3Title.textContent = `Removed/replaced from E3 (${section.removed.length})`;

      e2Col.appendChild(e2Title);
      e3Col.appendChild(e3Title);

      // New E2 content - green
      section.added.forEach((text) => {
        const images = findItemImages(text, section.e2ItemDetails);

        e2Col.appendChild(makeTextItem(text, "added", images));
      });

      // Removed E3 content - red
      section.removed.forEach((text) => {
        const images = findItemImages(text, section.e3ItemDetails);

        e3Col.appendChild(makeTextItem(text, "removed", images));
      });

      columns.append(e2Col, e3Col);
      card.appendChild(columns);

      comparisonEl.appendChild(card);
    });
  }

  // Display remaining image changes
  renderImageComparison(query, allSections);
}
