'use strict';
const http = require('node:http');
const { SkillRequestSignatureVerifier, TimestampVerifier } = require('ask-sdk-express-adapter');
const { createSkill, authorize, assertConfiguration } = require('./lambda');

assertConfiguration();
const skill = createSkill();
const signatureVerifier = new SkillRequestSignatureVerifier();
const timestampVerifier = new TimestampVerifier();
const recent = new Map();
let verifying = 0;
const send = (res, status, body) => {res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(body));};
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, {status:'ok'});
  if (req.method !== 'POST' || req.url !== '/alexa') return send(res, 404, {error:'Not found'});
  if (!req.headers['signature-256'] || !req.headers.signaturecertchainurl) return send(res, 400, {error:'Invalid Alexa request'});
  const chunks = [];
  try {
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 65536) {send(res, 413, {error:'Request too large'}); return;}
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    const envelope = JSON.parse(body);
    const timestamp = Date.parse(envelope.request?.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 150000) throw new Error('Invalid timestamp');
    await timestampVerifier.verify(body);
    if (verifying >= 16) throw new Error('Verification capacity exceeded');
    verifying++;
    const verification = signatureVerifier.verify(body, req.headers).finally(() => { verifying--; });
    let timer;
    try {
      await Promise.race([verification, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('Verification timeout')), 4500);})]);
    } finally { clearTimeout(timer); }
    authorize(envelope);
    const requestId = envelope.request?.requestId;
    if (typeof requestId !== 'string' || !requestId || requestId.length > 512) throw new Error('Missing request ID');
    const now = Date.now();
    for (const [id, expires] of recent) if (expires < now) recent.delete(id);
    if (recent.has(requestId) || recent.size >= 10000) throw new Error('Repeated request');
    recent.set(requestId, now + 300000);
    return send(res, 200, await skill.invoke(envelope));
  } catch (error) {
    console.error('alexa_request_rejected'); // Never log request bodies, signatures, IDs, or tokens.
    return send(res, 400, {error:'Invalid Alexa request'});
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 8788), process.env.HOST || '127.0.0.1', () => console.log('Alexa HTTP adapter listening'));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
