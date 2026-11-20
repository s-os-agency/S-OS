'use strict';
const crypto = require('crypto');

// One control inbox per existing session. No new worker, task, or provider call.
class LiveControl {
  constructor(contextDB) {
    this.store = contextDB;
    this.sql = contextDB.db;
    this.streams = new Map();
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS control_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, digest TEXT UNIQUE NOT NULL,
        text TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS control_deliveries (
        revision INTEGER NOT NULL, session TEXT NOT NULL, nonce TEXT NOT NULL,
        offered_at TEXT, received_at TEXT, applied_at TEXT, evidence TEXT,
        PRIMARY KEY(revision, session),
        FOREIGN KEY(revision) REFERENCES control_revisions(id),
        FOREIGN KEY(session) REFERENCES sessions(id)
      );
    `);
  }

  session(id, principal) {
    const s = this.store.getSession(id);
    if (!s) throw Object.assign(new Error('session_not_found'), {statusCode:404});
    if (s.principal !== principal) throw Object.assign(new Error('session_owner_required'), {statusCode:403});
    return s;
  }

  publish(input, principal) {
    if (principal !== 'human:owner') throw Object.assign(new Error('owner_required'), {statusCode:403});
    if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 100000 ||
        typeof input.source !== 'string' || !input.source.trim() || input.source.length > 2000)
      throw Object.assign(new Error('text_and_source_required'), {statusCode:400});
    const digest = crypto.createHash('sha256').update(JSON.stringify([input.source,input.text])).digest('hex');
    const revision = this.store.transaction(() => {
      this.sql.prepare('INSERT OR IGNORE INTO control_revisions(digest,text,source,created_at) VALUES(?,?,?,?)')
        .run(digest,input.text,input.source,new Date().toISOString());
      const rev = this.sql.prepare('SELECT * FROM control_revisions WHERE digest=?').get(digest);
      this.sql.prepare(`INSERT OR IGNORE INTO control_deliveries(revision,session,nonce)
        SELECT ?,id,lower(hex(randomblob(24))) FROM sessions`).run(rev.id);
      this.store.appendAudit('control.published',principal,String(rev.id),{digest});
      return rev;
    });
    for (const id of this.streams.keys()) this.flush(id);
    return {revision:revision.id,digest,receipts:this.status(revision.id)};
  }

  attachLatest(id) {
    this.sql.prepare(`INSERT OR IGNORE INTO control_deliveries(revision,session,nonce)
      SELECT id,?,lower(hex(randomblob(24))) FROM control_revisions ORDER BY id DESC LIMIT 1`).run(id);
  }

  pending(id) {
    this.attachLatest(id);
    return this.sql.prepare(`SELECT r.id revision,r.digest,r.text,r.source,d.nonce
      FROM control_deliveries d JOIN control_revisions r ON r.id=d.revision
      WHERE d.session=? AND d.applied_at IS NULL ORDER BY r.id`).all(id);
  }

  flush(id) {
    const res = this.streams.get(id);
    if (!res || res.destroyed || res.writableEnded) return;
    for (const item of this.pending(id)) {
      if (res.writableLength > 262144) { res.destroy(); return; }
      res.write(`event: policy.updated\ndata: ${JSON.stringify(item)}\n\n`);
      this.sql.prepare('UPDATE control_deliveries SET offered_at=? WHERE revision=? AND session=?')
        .run(new Date().toISOString(),item.revision,id);
    }
  }

  stream(req, res, id, principal) {
    this.session(id,principal);
    const old = this.streams.get(id);
    if (old) old.end();
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','x-accel-buffering':'no'});
    res.write(': control stream connected\n\n');
    this.streams.set(id,res);
    this.flush(id);
    // Unacknowledged delivery is retried while the current task keeps running.
    const timer = setInterval(() => {
      try { res.write(': heartbeat\n\n'); this.flush(id); }
      catch { res.destroy(); }
    },15000);
    res.on('close',() => {
      clearInterval(timer);
      if (this.streams.get(id) === res) this.streams.delete(id);
    });
  }

  receipt(id, input, principal) {
    this.session(id,principal);
    if (!Number.isSafeInteger(input.revision) || !['received','applied'].includes(input.stage))
      throw Object.assign(new Error('invalid_receipt'), {statusCode:400});
    const row=this.sql.prepare('SELECT * FROM control_deliveries WHERE revision=? AND session=?').get(input.revision,id);
    if (!row || typeof input.nonce !== 'string' || input.nonce !== row.nonce)
      throw Object.assign(new Error('delivery_nonce_required'), {statusCode:403});
    if (input.stage === 'applied' && (!row.received_at || typeof input.evidence !== 'string' ||
        !input.evidence.trim() || input.evidence.length > 2000))
      throw Object.assign(new Error('received_receipt_and_evidence_required'), {statusCode:400});
    const at=new Date().toISOString();
    this.store.transaction(() => {
      if (input.stage === 'received')
        this.sql.prepare('UPDATE control_deliveries SET received_at=COALESCE(received_at,?) WHERE revision=? AND session=?').run(at,input.revision,id);
      else this.sql.prepare('UPDATE control_deliveries SET applied_at=COALESCE(applied_at,?),evidence=? WHERE revision=? AND session=?').run(at,input.evidence,input.revision,id);
      this.store.appendAudit(`control.${input.stage}`,principal,id,{revision:input.revision,evidence:input.evidence||null});
    });
    return {session:id,revision:input.revision,stage:input.stage,at};
  }

  status(revision) {
    const query=`SELECT d.revision,d.session,s.principal,s.updated_at session_last_seen,
      d.offered_at,d.received_at,d.applied_at,d.evidence FROM control_deliveries d
      JOIN sessions s ON s.id=d.session`;
    return (revision ? this.sql.prepare(query+' WHERE d.revision=?').all(revision) : this.sql.prepare(query).all())
      .map(r=>({...r,connected:this.streams.has(r.session),
        state:r.applied_at?'application_reported':r.received_at?'receiver_acknowledged':r.offered_at?'offered_unacknowledged':'pending',
        behavioralComplianceVerified:false}));
  }
}
module.exports={LiveControl};
