const express = require("express");
const { chromium } = require("playwright");
const { generateAISummary } = require("./services/aiService");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

function validatePublicUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Please enter a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Local URLs are not supported.");
  }

  return url.toString();
}

async function extractPage(browser, rawUrl) {
  const url = validatePublicUrl(rawUrl);

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    if (response && response.status() >= 400) {
      throw new Error(
        `The website returned HTTP ${response.status()} for ${url}`,
      );
    }

    await page.waitForTimeout(2500);

    // Extract all images for image-only comparison.
    const images = await page.evaluate(() => {
      const results = [];

      function getHeading(element) {
        let parent = element;

        while (parent && parent !== document.body) {
          const heading = parent.querySelector?.(
            ":scope > h1, :scope > h2, :scope > h3, :scope > h4",
          );

          if (heading && heading.innerText.trim()) {
            return heading.innerText.trim();
          }

          parent = parent.parentElement;
        }

        return "General content";
      }

      function addImage(url, element, source) {
        if (!url || typeof url !== "string") return;

        url = url.trim();

        if (
          !url ||
          url === "none" ||
          url.startsWith("data:") ||
          url.startsWith("blob:") ||
          url.startsWith("#")
        )
          return;

        try {
          results.push({
            url: new URL(url, document.baseURI).href,
            alt: element.getAttribute?.("alt") || "",
            heading: getHeading(element),
            source,
            element: element.tagName?.toLowerCase() || "css",
          });
        } catch {
          // Ignore invalid URLs.
        }
      }

      function extractCssUrls(value, element, source) {
        if (!value || value === "none") return;

        const regex = /url\((?:"|')?(.*?)(?:"|')?\)/g;
        let match;

        while ((match = regex.exec(value)) !== null) {
          addImage(match[1], element, source);
        }
      }

      document.querySelectorAll("img").forEach((img) => {
        addImage(img.currentSrc, img, "img-currentSrc");
        addImage(img.getAttribute("src"), img, "img-src");
        addImage(img.getAttribute("data-src"), img, "img-data-src");
        addImage(img.getAttribute("data-original"), img, "img-data-original");

        ["srcset", "data-srcset"].forEach((attribute) => {
          const srcset = img.getAttribute(attribute);

          if (srcset) {
            srcset.split(",").forEach((item) => {
              addImage(item.trim().split(/\s+/)[0], img, `img-${attribute}`);
            });
          }
        });
      });

      document.querySelectorAll("picture source").forEach((source) => {
        const srcset = source.getAttribute("srcset");

        if (srcset) {
          srcset.split(",").forEach((item) => {
            addImage(item.trim().split(/\s+/)[0], source, "picture-srcset");
          });
        }
      });

      document.querySelectorAll("svg image").forEach((img) => {
        addImage(
          img.getAttribute("href") || img.getAttribute("xlink:href"),
          img,
          "svg-image",
        );
      });

      document.querySelectorAll("video[poster]").forEach((video) => {
        addImage(video.getAttribute("poster"), video, "video-poster");
      });

      document.querySelectorAll("*").forEach((element) => {
        [
          ["background", getComputedStyle(element).backgroundImage],
          ["before", getComputedStyle(element, "::before").backgroundImage],
          ["after", getComputedStyle(element, "::after").backgroundImage],
        ].forEach(([type, value]) => {
          extractCssUrls(value, element, `css-${type}`);
        });
      });

      const unique = new Map();

      results.forEach((image) => {
        const key = `${image.url}|${image.heading}|${image.source}`;

        if (!unique.has(key)) {
          unique.set(key, image);
        }
      });

      return [...unique.values()];
    });

    // Extract text and images together, preserving card relationships.
    const sections = await page.evaluate(() => {
      const root =
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector('[role="main"]') ||
        document.body;

      root
        .querySelectorAll(
          "script, style, noscript, svg, nav, footer, header, form",
        )
        .forEach((el) => el.remove());

      const result = [];

      let current = {
        heading: "General content",
        items: [],
        itemDetails: [],
      };

      const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

      function getElementImages(container) {
        if (!container) return [];

        const found = [];

        function add(url, element, source) {
          if (!url || typeof url !== "string") return;

          try {
            const absoluteUrl = new URL(url.trim(), document.baseURI).href;

            if (
              absoluteUrl.startsWith("data:") ||
              absoluteUrl.startsWith("blob:")
            )
              return;

            found.push({
              url: absoluteUrl,
              alt: element.getAttribute?.("alt") || "",
              source,
              element: element.tagName?.toLowerCase() || "css",
            });
          } catch {
            // Ignore invalid URLs.
          }
        }

        container.querySelectorAll("img").forEach((img) => {
          add(img.currentSrc, img, "img-currentSrc");
          add(img.getAttribute("src"), img, "img-src");
          add(img.getAttribute("data-src"), img, "img-data-src");
          add(img.getAttribute("data-original"), img, "img-data-original");
        });

        container.querySelectorAll("picture source").forEach((source) => {
          const srcset = source.getAttribute("srcset");

          if (srcset) {
            srcset.split(",").forEach((item) => {
              add(item.trim().split(/\s+/)[0], source, "picture-srcset");
            });
          }
        });

        // Also capture CSS background images inside the card.
        const elements = [container, ...container.querySelectorAll("*")];

        elements.forEach((element) => {
          const background = getComputedStyle(element).backgroundImage;

          if (!background || background === "none") return;

          const regex = /url\((?:"|')?(.*?)(?:"|')?\)/g;
          let match;

          while ((match = regex.exec(background)) !== null) {
            add(match[1], element, "css-background");
          }
        });

        const unique = new Map();

        found.forEach((img) => {
          if (!unique.has(img.url)) {
            unique.set(img.url, img);
          }
        });

        return [...unique.values()];
      }

      function findCardImages(element) {
        let parent = element.parentElement;

        // Search upwards for the nearest container with an image.
        // The first suitable container is preferred to avoid
        // accidentally collecting images from neighbouring cards.
        for (let depth = 0; parent && depth < 8; depth++) {
          const text = clean(parent.innerText);
          const cardImages = getElementImages(parent);

          if (cardImages.length > 0 && text.length > 0 && text.length <= 1500) {
            return cardImages;
          }

          parent = parent.parentElement;
        }

        return [];
      }

      function flush() {
        if (current.items.length) {
          result.push(current);
        }
      }

      const nodes = root.querySelectorAll(
        "h1,h2,h3,h4,h5,h6,p,li,tr,blockquote",
      );

      nodes.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const text = clean(el.innerText || el.textContent);

        if (!text) return;

        if (/^h[1-6]$/.test(tag)) {
          flush();

          current = {
            heading: text,
            items: [],
            itemDetails: [],
          };

          return;
        }

        if (
          tag === "li" &&
          el.parentElement &&
          el.parentElement.closest("li")
        ) {
          return;
        }

        let itemText = text;

        if (tag === "tr") {
          const cells = [...el.querySelectorAll("th,td")]
            .map((cell) => clean(cell.innerText))
            .filter(Boolean);

          if (!cells.length) return;

          itemText = cells.join(" | ");
        }

        const associatedImages = findCardImages(el);

        current.items.push(itemText);

        current.itemDetails.push({
          text: itemText,
          images: associatedImages,
        });
      });

      flush();

      if (!result.length) {
        const text = clean(root.innerText);

        if (text) {
          return [
            {
              heading: "Page content",
              items: text.split(/(?<=[.!?])\s+/).filter(Boolean),
              itemDetails: [],
            },
          ];
        }
      }

      return result;
    });

    return {
      url,
      title: await page.title(),
      sections,
      images,
    };
  } catch (error) {
    if (error.message.includes("Timeout")) {
      throw new Error(
        `Timed out while opening ${url}. The website may be blocking automated browsers.`,
      );
    }

    throw error;
  } finally {
    await page.close();
  }
}

app.post("/api/compare", async (req, res) => {
  let browser;

  try {
    const { e2Url, e3Url } = req.body || {};

    if (!e2Url || !e3Url) {
      return res.status(400).json({
        error: "Enter both E2 and E3 URLs.",
      });
    }

    browser = await chromium.launch({ headless: true });

    const [e2, e3] = await Promise.all([
      extractPage(browser, e2Url),
      extractPage(browser, e3Url),
    ]);

    res.json({
      e2: e2.sections,
      e3: e3.sections,

      e2Images: e2.images,
      e3Images: e3.images,

      pageTitles: {
        e2: e2.title,
        e3: e3.title,
      },
    });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to load one or both pages.",
      help: "If the website requires VPN, login, or blocks automated browsers, it may need an authenticated browser session or a permitted content export.",
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.post("/api/ai-summary", async (req, res) => {
  try {
    const { added, removed } = req.body || {};

    if (!Array.isArray(added) || !Array.isArray(removed)) {
      return res.status(400).json({
        error: "Invalid comparison data.",
      });
    }

    const summary = await generateAISummary({
      added,
      removed,
    });

    res.json({ summary });
  } catch (error) {
    console.error("AI summary error:", error);

    res.status(500).json({
      error: error.message || "Unable to generate AI summary.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Comparator running at http://localhost:${PORT}`);
});
