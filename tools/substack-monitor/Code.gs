/**
 * MOOX AgentMat email forwarder.
 *
 * Required Script Properties (never paste values into this file):
 * - MOOX_SUBSTACK_INGEST_URL
 * - MOOX_SUBSTACK_INGEST_SECRET
 * - MOOX_SUBSTACK_BASELINE_ISO
 */
const MOOX_AGENTMAT_SENDER = "agentmat@substack.com";
const MOOX_PROCESSED_IDS_PROPERTY = "MOOX_SUBSTACK_PROCESSED_MESSAGE_IDS";
const MOOX_IGNORED_SUBJECT = /welcome to agentmat|payment receipt|subscriptions? for you to give away|verification code|new follower on substack|confirm your subscription|unsubscribe/i;
const MOOX_MAX_REQUEST_BYTES = 1750000;
const MOOX_MAX_REMEMBERED_IDS = 250;
const MOOX_EXPECTED_INGEST_URL = "https://mooxintel.com/api/internal/substack-intelligence/ingest";

function mooxRequiredProperty_(name) {
  const value = String(PropertiesService.getScriptProperties().getProperty(name) || "").trim();
  if (!value) throw new Error("Missing Script Property: " + name);
  return value;
}

function mooxSenderAddress_(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const bracketed = normalized.match(/<([^<>\s]+@[^<>\s]+)>/);
  return bracketed && bracketed[1] ? bracketed[1] : normalized;
}

function mooxGmailApiJson_(path, query) {
  const pairs = [];
  Object.keys(query || {}).forEach(function(key) {
    if (query[key] === null || typeof query[key] === "undefined") return;
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(query[key])));
  });
  const url = "https://gmail.googleapis.com/gmail/v1/users/me/" + path + (pairs.length ? "?" + pairs.join("&") : "");
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error("Gmail read-only API failed with HTTP " + status);
  return JSON.parse(response.getContentText() || "{}");
}

function mooxHeader_(payload, name) {
  const expected = String(name || "").toLowerCase();
  const headers = payload && Array.isArray(payload.headers) ? payload.headers : [];
  const match = headers.find(function(header) {
    return String(header && header.name || "").toLowerCase() === expected;
  });
  return match ? String(match.value || "") : "";
}

function mooxDecodeBodyData_(data) {
  if (!data) return "";
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(String(data))).getDataAsString("UTF-8");
}

function mooxCollectBodies_(part, plain, html) {
  if (!part) return;
  const mimeType = String(part.mimeType || "").toLowerCase();
  const decoded = mooxDecodeBodyData_(part.body && part.body.data);
  if (mimeType === "text/plain" && decoded) plain.push(decoded);
  if (mimeType === "text/html" && decoded) html.push(decoded);
  (Array.isArray(part.parts) ? part.parts : []).forEach(function(child) {
    mooxCollectBodies_(child, plain, html);
  });
}

function mooxHtmlToText_(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mooxMessageText_(payload) {
  const plain = [];
  const html = [];
  mooxCollectBodies_(payload, plain, html);
  const text = plain.join("\n\n").trim() || mooxHtmlToText_(html.join("\n\n"));
  return text.slice(0, 150000);
}

function mooxResearchMessages_() {
  const baseline = new Date(mooxRequiredProperty_("MOOX_SUBSTACK_BASELINE_ISO"));
  if (isNaN(baseline.getTime())) throw new Error("Invalid MOOX_SUBSTACK_BASELINE_ISO");
  const processed = new Set(mooxProcessedIds_());
  const listed = mooxGmailApiJson_("messages", {
    q: "from:agentmat@substack.com newer_than:30d",
    maxResults: 20,
  });
  const messages = [];
  (Array.isArray(listed.messages) ? listed.messages : []).forEach(function(reference) {
    const messageId = String(reference && reference.id || "");
    if (!messageId || processed.has(messageId)) return;
    const message = mooxGmailApiJson_("messages/" + encodeURIComponent(messageId), { format: "full" });
    const payload = message.payload || {};
    const sender = mooxSenderAddress_(mooxHeader_(payload, "From"));
    const subject = mooxHeader_(payload, "Subject").trim();
    const receivedAt = new Date(Number(message.internalDate || 0));
    const bodyText = mooxMessageText_(payload);
    if (sender !== MOOX_AGENTMAT_SENDER) return;
    if (!subject || !bodyText || isNaN(receivedAt.getTime())) return;
    if (receivedAt.getTime() <= baseline.getTime()) return;
    if (MOOX_IGNORED_SUBJECT.test(subject)) return;
    messages.push({
      messageId: messageId,
      threadId: String(message.threadId || ""),
      from: sender,
      subject: subject,
      date: receivedAt.toISOString(),
      bodyText: bodyText,
      sourceUrl: "https://agentmat.substack.com/",
    });
  });
  return messages.slice(0, 20);
}

function mooxProcessedIds_() {
  const raw = PropertiesService.getScriptProperties().getProperty(MOOX_PROCESSED_IDS_PROPERTY) || "[]";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).slice(-MOOX_MAX_REMEMBERED_IDS) : [];
  } catch (error) {
    throw new Error("Invalid processed-message state");
  }
}

function mooxRememberProcessedIds_(ids) {
  const ordered = mooxProcessedIds_();
  const seen = new Set(ordered);
  ids.map(String).forEach(function(id) {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  });
  PropertiesService.getScriptProperties().setProperty(
    MOOX_PROCESSED_IDS_PROPERTY,
    JSON.stringify(ordered.slice(-MOOX_MAX_REMEMBERED_IDS))
  );
}

function mooxRequestBatches_(messages) {
  const batches = [];
  let current = [];
  messages.forEach(function(message) {
    const candidate = current.concat([message]);
    const payload = JSON.stringify({ checkedAt: new Date().toISOString(), emails: candidate });
    const bytes = Utilities.newBlob(payload).getBytes().length;
    if (current.length && bytes > MOOX_MAX_REQUEST_BYTES) {
      batches.push(current);
      current = [message];
    } else {
      current = candidate;
    }
  });
  if (current.length) batches.push(current);
  return batches;
}

function scanAgentMat() {
  const messages = mooxResearchMessages_();
  if (!messages.length) return { ok: true, found: 0, processed: 0 };
  const url = mooxRequiredProperty_("MOOX_SUBSTACK_INGEST_URL");
  if (url !== MOOX_EXPECTED_INGEST_URL) throw new Error("Unexpected MOOX_SUBSTACK_INGEST_URL");
  const secret = mooxRequiredProperty_("MOOX_SUBSTACK_INGEST_SECRET");
  let processedCount = 0;
  mooxRequestBatches_(messages).forEach(function(batch) {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + secret },
      muteHttpExceptions: true,
      payload: JSON.stringify({ checkedAt: new Date().toISOString(), emails: batch }),
    });
    const status = response.getResponseCode();
    if (status < 200 || status >= 300) throw new Error("MOOX ingest rejected request with HTTP " + status);
    const result = JSON.parse(response.getContentText());
    const ids = result && result.ok === true && result.report && Array.isArray(result.report.processedMessageIds)
      ? result.report.processedMessageIds
      : null;
    if (!ids) throw new Error("MOOX ingest did not confirm processed message ids");
    const sentIds = new Set(batch.map(function(message) { return String(message.messageId); }));
    const confirmed = ids.map(String).filter(function(id) { return sentIds.has(id); });
    mooxRememberProcessedIds_(confirmed);
    processedCount += confirmed.length;
  });
  return { ok: true, found: messages.length, processed: processedCount };
}

function installAgentMatTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "scanAgentMat") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("scanAgentMat").timeBased().everyMinutes(30).create();
  return { ok: true, schedule: "every 30 minutes" };
}
