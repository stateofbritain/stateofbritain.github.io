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
