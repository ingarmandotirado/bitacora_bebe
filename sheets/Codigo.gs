/**
 * Bitácora de José Gabriel — conexión entre la app y esta hoja de cálculo.
 * No hay que modificar nada: solo pegar, guardar e implementar como "App web".
 * La dirección de la App web funciona como llave: compártela solo entre ustedes dos.
 */
const EV = 'Eventos', DT = 'Datos';

function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'json' }); }
  return handle_(req);
}

function handle_(req) {
  if (req.op === 'ping') return out_({ ok: true, ver: ver_() });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    if (req.op === 'push') applyOps_(req.ops || []);
    return out_(Object.assign({ ok: true }, pull_(Number(req.since) || 0)));
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sh_(name) { return SpreadsheetApp.getActive().getSheetByName(name); }
function ver_() { return Number(PropertiesService.getScriptProperties().getProperty('ver') || 0); }
function parse_(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
function isObj_(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function merge_(t, p) {
  Object.keys(p).forEach(function (k) {
    const v = p[k];
    if (isObj_(v) && isObj_(t[k])) merge_(t[k], v); else t[k] = v;
  });
  return t;
}

/** Guarda los cambios que manda la app: eventos (una fila por evento) y datos generales. */
function applyOps_(ops) {
  if (!ops.length) return;
  const now = Math.max(Date.now(), ver_() + 1);
  const ev = sh_(EV), dt = sh_(DT);
  const n = Math.max(0, ev.getLastRow() - 1);
  const idx = {};
  if (n) ev.getRange(2, 6, n, 1).getValues().forEach(function (r, i) { idx[String(r[0])] = i + 2; });
  const dn = Math.max(0, dt.getLastRow() - 1);
  const kidx = {};
  if (dn) dt.getRange(2, 1, dn, 2).getValues().forEach(function (r, i) { kidx[String(r[0])] = { row: i + 2, json: String(r[1]) }; });
  const add = [], addIdx = {};
  ops.forEach(function (op) {
    if (op.kind === 'ev' && op.id) {
      const e = op.ev || null;
      const row = [op.fecha || '', op.hora || '', op.tipo || '', op.det || '', op.by || '', String(op.id), e ? JSON.stringify(e) : '', now, e ? '' : 'borrado'];
      if (idx[op.id] && !e) ev.getRange(idx[op.id], 7, 1, 3).setValues([['', now, 'borrado']]); // conserva qué era
      else if (idx[op.id]) { const r = ev.getRange(idx[op.id], 1, 1, 9); r.setNumberFormat('@'); r.setValues([row]); }
      else if (addIdx[op.id] !== undefined) add[addIdx[op.id]] = row;
      else { addIdx[op.id] = add.length; add.push(row); }
    } else if (op.kind === 'meta' && op.name) {
      const cur = kidx[op.name] ? parse_(kidx[op.name].json) : {};
      const json = JSON.stringify(merge_(cur, op.patch || {}));
      if (kidx[op.name]) { dt.getRange(kidx[op.name].row, 2, 1, 2).setValues([[json, now]]); kidx[op.name].json = json; }
      else { dt.appendRow([op.name, json, now]); kidx[op.name] = { row: dt.getLastRow(), json: json }; }
    }
  });
  if (add.length) {
    const r = ev.getRange(ev.getLastRow() + 1, 1, add.length, 9);
    r.setNumberFormat('@');
    r.setValues(add);
  }
  PropertiesService.getScriptProperties().setProperty('ver', String(now));
}

/** Devuelve lo que cambió desde la última vez que el teléfono preguntó. */
function pull_(since) {
  const ver = ver_();
  if (since && since >= ver) return { ver: ver, same: true };
  const ev = sh_(EV), dt = sh_(DT);
  const events = [], meta = {};
  const n = Math.max(0, ev.getLastRow() - 1);
  if (n) ev.getRange(2, 6, n, 3).getValues().forEach(function (r) { if (Number(r[2]) > since) events.push([String(r[0]), String(r[1] || '')]); });
  const dn = Math.max(0, dt.getLastRow() - 1);
  if (dn) dt.getRange(2, 1, dn, 3).getValues().forEach(function (r) { if (Number(r[2]) > since) meta[String(r[0])] = parse_(String(r[1])); });
  return { ver: ver, events: events, meta: meta };
}
