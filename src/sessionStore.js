const session = require('express-session');
const { run, get } = require('./db');

const DEFAULT_TTL = 1000 * 60 * 60 * 8;

class SqliteSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || DEFAULT_TTL;
    this.cleanupTimer = setInterval(() => this.clearExpired(), options.cleanupInterval || 1000 * 60 * 30);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  expiresAt(sess) {
    const expires = sess?.cookie?.expires;
    return expires ? new Date(expires).getTime() : Date.now() + this.ttl;
  }

  get(sid, callback) {
    get('SELECT sess, expires FROM sessions WHERE sid = ?', [sid])
      .then((row) => {
        if (!row) return callback(null, null);
        if (row.expires && row.expires < Date.now()) {
          return run('DELETE FROM sessions WHERE sid = ?', [sid]).then(
            () => callback(null, null),
            () => callback(null, null)
          );
        }
        try {
          return callback(null, JSON.parse(row.sess));
        } catch {
          return callback(null, null);
        }
      })
      .catch(callback);
  }

  set(sid, sess, callback = () => {}) {
    run(
      `INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`,
      [sid, JSON.stringify(sess), this.expiresAt(sess)]
    ).then(() => callback(null), callback);
  }

  touch(sid, sess, callback = () => {}) {
    run('UPDATE sessions SET expires = ? WHERE sid = ?', [this.expiresAt(sess), sid])
      .then(() => callback(null), callback);
  }

  destroy(sid, callback = () => {}) {
    run('DELETE FROM sessions WHERE sid = ?', [sid]).then(() => callback(null), callback);
  }

  clearExpired() {
    return run('DELETE FROM sessions WHERE expires IS NOT NULL AND expires < ?', [Date.now()]).catch(() => {});
  }
}

module.exports = { SqliteSessionStore };
