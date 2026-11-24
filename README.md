# DiffLens – AI-Powered E2 vs E3 Website Comparator

**See what changed. Understand why. Compare smarter.**

DiffLens is a Node.js-based website comparison tool that compares two versions of a webpage (E2 and E3). It identifies text and image differences, displays newly added and removed content, and uses a locally running AI model through Ollama to generate summaries of the detected changes.

The application uses Playwright with Chromium to extract webpage content, making it suitable for websites that rely on JavaScript rendering.

---

## Features

### 1. Website Content Comparison

- Compare two public webpage URLs: E2 (new version) and E3 (old version).
- Extract headings, paragraphs, list items, and table content.
- Identify newly added and removed content.
- Display new E2 content in green.
- Display removed E3 content in red.
- Show completely changed content as separate additions and removals.

### 2. Image Comparison

- Detect newly added images in E2.
- Identify images removed from E3.
- Display associated images alongside their respective changed text content.
- Display other image changes separately.
- Avoid duplicate image entries where possible.

### 3. AI-Powered Change Summary

- Generate an AI-based report of detected website changes.
- Uses Ollama to run the Llama 3.2 model locally.
- No external AI API key is required.
- Generates reports with:
  - Overall Summary
  - New Content in E2
  - Removed Content from E3
  - Important Observations
- Uses the detected additions and removals as input to the AI model.

### 4. Search Functionality

- Search comparison results by heading or content.
- Filter detected differences.
- Display a separate message when no search results are found.

### 5. User Interface

- Simple and responsive interface.
- Comparison completion notification.
- Prominent message when no text differences are detected.
- Separate visual indicators for additions and removals.
- AI summary panel.

---

## Technology Stack

| Technology | Purpose                 |
| ---------- | ----------------------- |
| Node.js    | Backend runtime         |
| Express.js | Web server and API      |
| Playwright | Browser automation      |
| Chromium   | Webpage rendering       |
| HTML       | Application structure   |
| CSS        | Application styling     |
| JavaScript | Frontend functionality  |
| Ollama     | Local AI model runtime  |
| Llama 3.2  | AI change summarization |

---

## Project Structure

```text
DiffLens/
│
├── server.js
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
│
├── services/
│   └── aiService.js
│
└── public/
    ├── index.html
    ├── app.js
    └── styles.css
```

---

# Installation and Setup

## Prerequisites

Install the following before running the application:

- Node.js and npm
- Visual Studio Code
- Git (optional, for version control)
- Ollama (for AI summary functionality)

## Step 1: Clone the Repository

```bash
git clone https://github.com/melvinjobmukkada/DiffLens.git
```

Navigate into the project:

```bash
cd DiffLens
```

Alternatively, open the downloaded project folder directly in VS Code.

## Step 2: Install Node.js Dependencies

Open the VS Code terminal and execute:

```bash
npm install
```

This installs the dependencies specified in `package.json`.

## Step 3: Install Playwright Chromium

Run:

```bash
npx playwright install chromium
```

This downloads the Chromium browser required by Playwright.

---

# Ollama Setup (AI Summary)

DiffLens uses Ollama to run an AI model locally on your computer.

## Step 1: Download Ollama

Download and install Ollama for Windows:

https://ollama.com/download

Complete the installation.

## Step 2: Download Llama 3.2

Open PowerShell or the VS Code terminal and execute:

```bash
ollama pull llama3.2
```

This downloads the Llama 3.2 model.

## Step 3: Verify Installation

Check the installed models:

```bash
ollama list
```

You should see:

```text
NAME
llama3.2:latest
```

## Step 4: Test the Model

Run:

```bash
ollama run llama3.2
```

Enter a test prompt:

```text
Summarize these website changes:
E2 added a new article.
E3 removed an old article.
```

The model should generate a response.

To exit the interactive session, enter:

```text
/bye
```

## Step 5: Verify Ollama API

Ollama normally exposes its local API at:

```text
http://localhost:11434
```

Test it from PowerShell:

```powershell
$body = @{
    model = "llama3.2"
    prompt = "Write a short summary."
    stream = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:11434/api/generate" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

A successful response confirms that the local AI service is available.

## AI Configuration

The AI service is implemented in:

```text
services/aiService.js
```

Default configuration:

```javascript
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
```

Optional environment variables can be used to change the Ollama endpoint or model.

---

# Running DiffLens

Once Node.js dependencies, Playwright Chromium, and Ollama are installed:

## Step 1: Start Ollama

Ensure the Ollama application is running.

Verify the model is available:

```bash
ollama list
```

## Step 2: Start the DiffLens Application

From the project directory:

```bash
npm start
```

The application should start at:

```text
http://localhost:3000
```

## Step 3: Open the Application

Open your browser and navigate to:

http://localhost:3000

Enter the two webpage URLs:

- **E2 URL:** New website version.
- **E3 URL:** Old website version.

Click **Compare Contents**.

## Step 4: Generate AI Summary

After the comparison completes:

1. Navigate to the AI Change Summary panel.
2. Click Generate AI Summary.
3. Wait for Ollama to process the detected differences.
4. Review the generated report.

---

# Application Workflow

```text
          E2 URL             E3 URL
             |                  |
             v                  v
          Playwright Browser Automation
                     |
                     v
             Extract Page Content
                     |
          +----------+----------+
          |                     |
          v                     v
      Text Comparison      Image Comparison
          |                     |
          v                     v
      Added / Removed       Image Changes
          |                     |
          +----------+----------+
                     |
                     v
              Display Results
                     |
                     v
              AI Summary Request
                     |
                     v
                Ollama API
                     |
                     v
                 Llama 3.2
                     |
                     v
              AI Change Report
```

---

# Important Notes and Limitations

- The application uses headless Chromium through Playwright.
- Both webpages must be accessible to the automated browser.
- The application does not bypass website access controls.
- Websites requiring corporate VPN, authentication, cookies, or other access permissions may require an authorized browser session or an alternative content export.
- Text comparison is based on normalized text and section headings. Reworded content may appear as a removal and a separate addition.
- Image comparison uses image URLs to identify additions and removals. Changes to image contents under an unchanged URL may not be detected.
- AI summaries depend on the content supplied to the local model. Always verify important observations against the comparison results.
- AI generation performance depends on available system memory, CPU/GPU resources, and the model context window.
- Ollama must be running for AI summary generation. Basic website comparison does not require AI generation.

---

# Troubleshooting

### 1. Ollama returned HTTP 500

Possible causes:

- Insufficient available memory.
- Model context limitations.
- Large comparison input.
- Ollama runtime errors.

Try:

```bash
ollama list
ollama run llama3.2
ollama ps
```

Ensure Ollama is running and the model can generate a response independently.

### 2. Chromium or Playwright error

Run:

```bash
npx playwright install chromium
```

### 3. Port 3000 already in use

Check whether another Node.js application is already using port 3000. Stop the existing process before restarting DiffLens.

### 4. AI summary is unavailable

Verify the local Ollama API:

```text
http://localhost:11434
```

Also check the VS Code terminal for backend error details.

---

## Future Enhancements

Potential improvements include:

- Export comparison results as PDF or Excel.
- Download AI-generated comparison reports.
- More advanced content matching.
- Improved handling of dynamically loaded content.
- Comparison history.
- Detailed visual comparison of webpage layouts.

---

## Author

**Melvin Job**

Project: DiffLens – AI-Powered E2 vs E3 Website Comparator

Repository: https://github.com/melvinjobmukkada/DiffLens

**See what changed. Understand why. Compare smarter.**
