const Alexa = require('ask-sdk-core');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const OWNER = process.env.GITHUB_OWNER || 's-os-agency';
const REPO = process.env.GITHUB_REPO || 'S-OS';
const pending = new Map();
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const intent = (h, name) => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' && Alexa.getIntentName(h.requestEnvelope) === name;
const key = h => `${h.requestEnvelope.context?.System?.user?.userId}:${h.requestEnvelope.session?.sessionId}`;

function assertConfiguration() {
  for (const name of ['ALEXA_SKILL_ID', 'ALEXA_ALLOWED_USER_IDS', 'GITHUB_TOKEN']) {
    if (!process.env[name]?.trim()) throw new Error(`${name} must be configured`);
  }
  if (OWNER !== 's-os-agency' || REPO !== 'S-OS') throw new Error('This integration is restricted to s-os-agency/S-OS');
  if (process.env.ALEXA_ENABLE_ISSUE_WRITES === 'true' && !path.isAbsolute(process.env.ALEXA_REPLAY_DIR || '')) throw new Error('Writes require an absolute persistent ALEXA_REPLAY_DIR');
}
function claimWriteRequest(envelope) {
  if (process.env.ALEXA_ENABLE_ISSUE_WRITES !== 'true') return;
  const id = envelope.request?.requestId;
  const timestamp = Date.parse(envelope.request?.timestamp);
  if (!id || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 150000) throw new Error('Invalid request');
  const dir = process.env.ALEXA_REPLAY_DIR;
  fs.mkdirSync(dir, {recursive:true, mode:0o700});
  // Retain claims beyond the full accepted timestamp window, including clock skew.
  for (const file of fs.readdirSync(dir)) {
    if (/^[0-9a-f]{64}$/.test(file)) {
      const location = path.join(dir, file);
      try { if (Date.now() - fs.statSync(location).mtimeMs > 600000) fs.unlinkSync(location); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  const location = path.join(dir, createHash('sha256').update(String(id)).digest('hex'));
  // Atomic, persistent, shared by all instances; claim before any side effect.
  const fd = fs.openSync(location, 'wx', 0o600);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const directory = fs.openSync(dir, 'r');
  try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}
function authorize(envelope) {
  assertConfiguration();
  const system = envelope.context?.System;
  const users = process.env.ALEXA_ALLOWED_USER_IDS.split(',').map(s => s.trim()).filter(Boolean);
  if (system?.application?.applicationId !== process.env.ALEXA_SKILL_ID || !users.includes(system?.user?.userId)) {
    throw new Error('Unauthorized Alexa identity');
  }
}
async function github(path, options = {}) {
  const response = await fetch('https://api.github.com' + path, {
    ...options,
    signal: AbortSignal.timeout(4500),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'S-OS-Alexa-Home-GitHub'
    }
  });
  if (!response.ok) throw new Error('GitHub API error ' + response.status);
  return response.status === 204 ? {} : response.json();
}
const Launch = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
  handle: h => h.responseBuilder.speak('S Home GitHub is ready.').reprompt('Ask for repository status or the latest workflow.').getResponse()
};
const CreateIssue = {
  canHandle: h => intent(h, 'CreateIssueIntent'),
  handle(h) {
    const title = h.requestEnvelope.request.intent.slots?.title?.value?.trim();
    if (!title || title.length > 256) return h.responseBuilder.speak('Please provide an issue title of up to 256 characters.').getResponse();
    if (process.env.ALEXA_ENABLE_ISSUE_WRITES !== 'true') return h.responseBuilder.speak(`Draft only. The issue title is ${escape(title)}. GitHub writes are disabled.`).getResponse();
    if (!h.requestEnvelope.session?.sessionId) throw new Error('Session required');
    const now = Date.now();
    for (const [id, item] of pending) if (item.expires < now) pending.delete(id);
    if (pending.size >= 1000) throw new Error('Too many pending confirmations');
    pending.set(key(h), {title, expires: now + 60000});
    return h.responseBuilder.speak(`Create an issue in S OS titled ${escape(title)}? Say yes to confirm, or no to cancel.`).reprompt('Say yes to create the issue, or no to cancel.').getResponse();
  }
};
const ConfirmIssue = {
  canHandle: h => intent(h, 'AMAZON.YesIntent'),
  async handle(h) {
    const item = pending.get(key(h));
    pending.delete(key(h)); // Consume before the network call: never automatically retry a write.
    if (!item || item.expires < Date.now() || process.env.ALEXA_ENABLE_ISSUE_WRITES !== 'true') return h.responseBuilder.speak('There is no pending issue to confirm.').getResponse();
    try {
      const issue = await github(`/repos/${OWNER}/${REPO}/issues`, {method:'POST', body:JSON.stringify({title:item.title})});
      return h.responseBuilder.speak(`Created issue ${Number(issue.number)} in S OS.`).getResponse();
    } catch (error) {
      console.error('alexa_issue_outcome_unconfirmed');
      return h.responseBuilder.speak('I could not confirm the result. Check GitHub before asking again to avoid a duplicate issue.').getResponse();
    }
  }
};
const RepoStatus = {
  canHandle: h => intent(h, 'RepoStatusIntent'),
  async handle(h) {
    const repo = await github(`/repos/${OWNER}/${REPO}`);
    return h.responseBuilder.speak(`S OS is available. Default branch is ${escape(repo.default_branch)}.`).getResponse();
  }
};
const LatestBuild = {
  canHandle: h => intent(h, 'LatestBuildIntent'),
  async handle(h) {
    const data = await github(`/repos/${OWNER}/${REPO}/actions/runs?per_page=1`);
    const run = data.workflow_runs?.[0];
    return h.responseBuilder.speak(run ? `Latest workflow is ${escape(run.status)}. Result is ${escape(run.conclusion || 'pending')}.` : 'No workflow runs found.').getResponse();
  }
};
const Help = {canHandle:h=>intent(h,'AMAZON.HelpIntent') || intent(h,'AMAZON.FallbackIntent'),handle:h=>h.responseBuilder.speak('Ask me to check the repository, read the latest workflow, or draft an issue.').getResponse()};
const Stop = {canHandle:h=>['AMAZON.StopIntent','AMAZON.CancelIntent','AMAZON.NoIntent'].some(n=>intent(h,n)),handle(h){pending.delete(key(h));return h.responseBuilder.speak('Cancelled. Goodbye.').withShouldEndSession(true).getResponse();}};
const End = {canHandle:h=>Alexa.getRequestType(h.requestEnvelope)==='SessionEndedRequest',handle(h){pending.delete(key(h));return h.responseBuilder.getResponse();}};
const Errors = {canHandle:()=>true,handle(h){console.error('alexa_command_failed');return h.responseBuilder.speak('The GitHub command could not be completed.').getResponse();}};
function builder() {
  return Alexa.SkillBuilders.custom()
    .addRequestInterceptors({process(h){authorize(h.requestEnvelope);claimWriteRequest(h.requestEnvelope);}})
    .addRequestHandlers(Launch,CreateIssue,ConfirmIssue,RepoStatus,LatestBuild,Help,Stop,End)
    .addErrorHandlers(Errors);
}
exports.assertConfiguration = assertConfiguration;
exports.authorize = authorize;
exports.createSkill = () => builder().create();
exports.handler = builder().lambda();
