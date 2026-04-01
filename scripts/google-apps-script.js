/**
 * Google Apps Script — State of Britain contribution handler
 *
 * Setup:
 * 1. Create a new Google Sheet (this will store all submissions)
 * 2. Extensions → Apps Script
 * 3. Delete the default code and paste this entire file
 * 4. Click Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Authorise when prompted (grant access to Gmail, Drive, Sheets)
 * 6. Copy the deployment URL into src/pillars/Contribute.jsx (SCRIPT_URL constant)
 *
 * What it does:
 * - Receives form submissions as JSON POST
 * - Appends a row to the "Contributions" sheet
 * - Emails jackaspinall1@gmail.com with the submission
 * - Saves uploaded files to a "StateOfBritain Contributions" folder in Google Drive
 * - Handles deletion requests (emailed with a distinct subject line)
 */

var SHEET_NAME = "Contributions";
var EMAIL = "jackaspinall1@gmail.com";
var DRIVE_FOLDER_NAME = "StateOfBritain Contributions";

// ── Ask the Data config ────────────────────────────────────────────
var SITE_BASE = "https://stateofbritain.uk";
var ENRICHMENT_SUMMARY_URL = SITE_BASE + "/data/enrichment-summary.json";
var GEMINI_MODEL = "gemini-2.5-flash";
var MAX_REQUESTS_PER_HOUR = 20;
var MAX_REQUESTS_PER_DAY = 50;

// ── Export Ask Log (GET) ────────────────────────────────────────────
// Returns logged questions as JSON. Requires EXPORT_KEY script property.
// Usage: GET ?key=<EXPORT_KEY>&depth=no_match  (depth filter is optional)
function doGet(e) {
  var key = (e && e.parameter && e.parameter.key) || "";
  var exportKey = PropertiesService.getScriptProperties().getProperty("EXPORT_KEY");
  if (!exportKey || key !== exportKey) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("Ask Log");
  if (!logSheet) {
    return ContentService.createTextOutput(JSON.stringify({ questions: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = logSheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j].toString().toLowerCase().replace(/\s+/g, "_")] = data[i][j];
    }
    rows.push(row);
  }

  var depthFilter = (e && e.parameter && e.parameter.depth) || "";
  if (depthFilter) {
    rows = rows.filter(function(r) { return r.depth === depthFilter; });
  }

  return ContentService.createTextOutput(JSON.stringify({ questions: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp", "Type", "Name", "Email", "Recognition", "Message", "File Link"
      ]);
    }

    // ── Ask the Data ────────────────────────────────────────
    if (data.type === "ask") {
      return handleAsk(data.question || "");
    }

    // ── Deletion request ────────────────────────────────────
    if (data.type === "deletion") {
      sheet.appendRow([
        new Date().toISOString(),
        "DELETION REQUEST",
        "",
        data.email || "",
        "",
        "Please delete all data for this email address",
        ""
      ]);

      MailApp.sendEmail(
        EMAIL,
        "Stateofbritain - Deletion Request",
        "Data deletion request received.\n\nEmail: " + (data.email || "(not provided)") +
        "\n\nPlease search for and remove all submissions from this address."
      );

      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Regular contribution ────────────────────────────────
    var fileLink = "";
    if (data.fileName && data.fileData) {
      var folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
      var decoded = Utilities.base64Decode(data.fileData);
      var blob = Utilities.newBlob(decoded, data.fileType || "application/octet-stream", data.fileName);
      var file = folder.createFile(blob);
      fileLink = file.getUrl();
    }

    sheet.appendRow([
      new Date().toISOString(),
      "Contribution",
      data.name || "",
      data.email || "",
      data.recognition || "anonymous",
      data.message || "",
      fileLink
    ]);

    var body = "New contribution received:\n\n";
    body += "Name: " + (data.name || "(not provided)") + "\n";
    body += "Email: " + (data.email || "(not provided)") + "\n";
    body += "Recognition: " + (data.recognition || "anonymous") + "\n\n";
    body += "Message:\n" + (data.message || "") + "\n";
    if (fileLink) body += "\nFile: " + fileLink + "\n";

    MailApp.sendEmail(EMAIL, "Stateofbritain", body);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Log the error for debugging in Apps Script dashboard
    console.error(err);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

// ── Ask the Data ─────────────────────────────────────────────────

function handleAsk(question) {
  // Kill switch: set ASK_ENABLED to "false" in Script Properties to disable
  var enabled = PropertiesService.getScriptProperties().getProperty("ASK_ENABLED");
  if (enabled === "false") {
    return jsonResponse({ error: "Ask the Data is temporarily unavailable." });
  }

  question = (question || "").trim();
  if (!question) {
    return jsonResponse({ error: "No question provided" });
  }

  // Rate limiting via CacheService
  var cache = CacheService.getScriptCache();

  // Daily cap (resets every 24h)
  var dailyKey = "ask_daily";
  var dailyCount = parseInt(cache.get(dailyKey) || "0", 10);
  if (dailyCount >= MAX_REQUESTS_PER_DAY) {
    return jsonResponse({
      error: "Daily question limit reached. This feature resets each day."
    });
  }

  // Hourly rate limit
  var rateLimitKey = "ask_count";
  var count = parseInt(cache.get(rateLimitKey) || "0", 10);
  if (count >= MAX_REQUESTS_PER_HOUR) {
    return jsonResponse({
      error: "This feature has limited capacity. Please try again shortly."
    });
  }
  cache.put(rateLimitKey, String(count + 1), 3600);
  cache.put(dailyKey, String(dailyCount + 1), 86400);

  // Check answer cache
  var questionKey = "ask_" + Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    question.toLowerCase()
  ).map(function(b) { return (b + 256) % 256; }).join("");
  var cached = cache.get(questionKey);
  if (cached) {
    return jsonResponse({ answer: cached, cached: true });
  }

  // Fetch catalog (cached in Apps Script for 6 hours)
  var catalogKey = "enrichment_catalog";
  var catalog = cache.get(catalogKey);
  if (!catalog) {
    catalog = UrlFetchApp.fetch(ENRICHMENT_SUMMARY_URL).getContentText();
    cache.put(catalogKey, catalog, 21600);
  }

  // Pass 1: Route + attempt quick answer from catalog summaries
  var routingPrompt = "You are a data lookup tool for a UK statistics site called State of Britain.\n\n"
    + "Given the dataset catalog below (which includes summary statistics), do TWO things:\n\n"
    + "1. Identify which 1-3 datasets are most relevant.\n"
    + "2. Classify the question:\n"
    + "   - \"quick\": you can answer confidently from the catalog summaries alone\n"
    + "   - \"latest\": needs the latest data point but not full history\n"
    + "   - \"trend\": needs full time series data\n\n"
    + "If \"quick\", also include your answer (neutral, factual, cite time period and geography).\n\n"
    + "Return ONLY JSON:\n"
    + "  Quick: {\"datasets\": [\"family\"], \"depth\": \"quick\", \"answer\": \"The UK TFR was 1.41 in 2024...\"}\n"
    + "  Needs data: {\"datasets\": [\"nhs-waiting\"], \"depth\": \"latest\"}\n"
    + "  No match: {\"datasets\": [], \"depth\": \"quick\", \"answer\": \"I don't have data on that topic.\"}\n\n"
    + "CATALOG:\n" + catalog + "\n\n"
    + "QUESTION: " + question;

  var routingResult = callGemini(routingPrompt);

  // Parse routing response
  var datasetIds = [];
  var depth = "trend";
  var quickAnswer = null;
  try {
    var jsonMatch = routingResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      datasetIds = parsed.datasets || [];
      depth = parsed.depth || "trend";
      quickAnswer = parsed.answer || null;
    }
  } catch (e) {
    datasetIds = [];
  }

  // Quick answer — single Gemini call, no data fetch needed
  if (depth === "quick" && quickAnswer) {
    var answer = quickAnswer;
    var datasetNames = datasetIds;
    try { cache.put(questionKey, answer, 21600); } catch (e) {}
    logQuestion(question, depth, datasetNames, false, answer);
    return jsonResponse({ answer: answer, datasets: datasetNames });
  }

  if (datasetIds.length === 0) {
    var noDataAnswer = "I don't have data on that topic. State of Britain covers UK public services, economy, and society "
      + "with datasets on healthcare, education, housing, defence, spending, taxation, and more. Try asking about one of these areas.";
    cache.put(questionKey, noDataAnswer, 21600);
    logQuestion(question, "no_match", [], false, noDataAnswer);
    return jsonResponse({ answer: noDataAnswer, datasets: [] });
  }

  // Pass 2: Answer — fetch datasets and generate response
  var dataTexts = [];
  var datasetNames = [];
  for (var i = 0; i < datasetIds.length && i < 3; i++) {
    try {
      var url = SITE_BASE + "/api/data/" + datasetIds[i] + ".json";
      var dataText = UrlFetchApp.fetch(url).getContentText();

      // For "latest" questions, trim to snapshot + last data points only
      if (depth === "latest") {
        dataText = trimToLatest(dataText);
      }

      dataTexts.push(dataText);
      datasetNames.push(datasetIds[i]);
    } catch (e) {
      // Skip datasets that fail to fetch
    }
  }

  if (dataTexts.length === 0) {
    logQuestion(question, "fetch_fail", datasetIds, false, "fetch_fail");
    return jsonResponse({ answer: "Sorry, I was unable to retrieve the relevant data. Please try again.", datasets: [] });
  }

  var answerPrompt = EDITORIAL_SYSTEM_PROMPT
    + "\n\nDATA:\n" + dataTexts.join("\n\n---\n\n")
    + "\n\nQUESTION: " + question;

  var answer = callGemini(answerPrompt);

  // Cache for 6 hours
  try {
    cache.put(questionKey, answer, 21600);
  } catch (e) {
    // Cache value too large, skip caching
  }

  logQuestion(question, depth, datasetNames, false, answer);
  return jsonResponse({ answer: answer, datasets: datasetNames });
}

var EDITORIAL_SYSTEM_PROMPT = "You are a data lookup tool for State of Britain, a site presenting official UK government statistics.\n\n"
  + "RULES:\n"
  + "- Answer the question using ONLY the data provided below. Never invent or assume numbers.\n"
  + "- Cite the specific time period and geography for every number you mention.\n"
  + "- If the data does not cover the question, say so explicitly.\n"
  + "- Be neutral and factual. Never editorialise: avoid words like crisis, soaring, collapsed, plummeted, broken, dramatic.\n"
  + "- Present trade-offs symmetrically, showing both sides.\n"
  + "- If data is estimated or methodology changed, note the caveat.\n"
  + "- For simple factual questions, keep answers to 2-4 sentences.\n"
  + "- For analytical questions (correlations, comparisons, trends), provide the full analysis with specific numbers.\n"
  + "- You can and should perform calculations (rates of change, correlations, ratios) when the question asks for analysis.\n"
  + "- Use plain language suitable for a general audience.\n"
  + "- Format numbers with commas for thousands (e.g. 1,234,567).\n"
  + "- When referencing percentage changes, state both the start and end values.\n"
  + "- Return plain text only. No markdown, no bullet points, no headers, no bold/italic.";

function callGemini(prompt) {
  var key = PropertiesService.getScriptProperties().getProperty("GEMINI_KEY");
  if (!key) throw new Error("GEMINI_KEY not set in Script Properties");

  var url = "https://generativelanguage.googleapis.com/v1beta/models/"
    + GEMINI_MODEL + ":generateContent?key=" + key;

  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 }
  };

  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var json = JSON.parse(response.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text;
}

function logQuestion(question, depth, datasets, cached, answer) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName("Ask Log");
    if (!logSheet) {
      logSheet = ss.insertSheet("Ask Log");
      logSheet.appendRow(["Timestamp", "Question", "Depth", "Datasets", "Cached", "Answer"]);
    }
    logSheet.appendRow([
      new Date().toISOString(),
      question,
      depth,
      (datasets || []).join(", "),
      cached ? "yes" : "no",
      answer || ""
    ]);
  } catch (e) {
    // Non-critical
  }
}

function trimToLatest(dataText) {
  try {
    var dataset = JSON.parse(dataText);
    var slim = {
      id: dataset.id,
      pillar: dataset.pillar,
      topic: dataset.topic,
      sources: dataset.sources,
      snapshot: dataset.snapshot || {}
    };
    // Include only the last 2 data points from each series
    if (dataset.series) {
      slim.series = {};
      for (var key in dataset.series) {
        var s = dataset.series[key];
        slim.series[key] = {
          label: s.label,
          unit: s.unit,
          data: (s.data || []).slice(-2)
        };
      }
    }
    return JSON.stringify(slim);
  } catch (e) {
    return dataText; // fallback to full data if parsing fails
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
