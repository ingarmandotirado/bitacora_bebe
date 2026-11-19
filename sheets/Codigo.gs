/**
 * Bitácora de José Gabriel — conexión entre la app y la hoja de cálculo, y avisos al teléfono (ntfy).
 * No hay que modificar nada: pegar, guardar, ejecutar "instalar" una vez e implementar como "App web".
 * Usa la hoja "Bitácora José Gabriel"; si esta cuenta no tiene acceso a ella, crea una nueva.
 * La dirección de la App web funciona como llave: compártela solo entre ustedes dos.
 */
const SHEET_ID = '1ZSZl8hwvxUwjBrYXV6QTYho7bdtwcERholN26TeKV9Y';
const APP_URL = 'https://ingarmandotirado.github.io/bitacora_bebe/';
const EV = 'Eventos', DT = 'Datos';
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
let BOOK_ = null;

/* ================= App web ================= */
function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'json' }); }
  return handle_(req);
}

function handle_(req) {
  if (req.op === 'ping') return out_({ ok: true, ver: ver_() });
  const props = PropertiesService.getScriptProperties();
  if (req.op === 'test') { const d = send_('✅ Prueba de avisos', 'Así te llegarán los avisos de la bitácora.', 3); return out_({ ok: true, sent: d.ok, code: d.code, detail: d.detail, mail: !!d.mail }); }
  if (req.op === 'config') {
    if (typeof req.ntfyToken === 'string') { const t = req.ntfyToken.trim(); if (/^tk_[A-Za-z0-9]{10,}$/.test(t)) props.setProperty('ntfyToken', t); else if (!t) props.deleteProperty('ntfyToken'); else return out_({ ok: false, error: 'token' }); }
    return out_({ ok: true, token: !!props.getProperty('ntfyToken') });
  }
  if (props.getProperty('trig') !== '1') { try { ensureTrigger_(); } catch (err) { } }
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    if (req.op === 'push') applyOps_(req.ops || []);
    return out_(Object.assign({ ok: true, sheet: book_().getUrl(), ntfy: topic_(), avisos: props.getProperty('trig') === '1', token: !!props.getProperty('ntfyToken') }, pull_(Number(req.since) || 0)));
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Ejecútala una vez desde el editor: pide permisos, activa la revisión cada 5 min y manda un aviso de prueba. */
function instalar() {
  ensureTrigger_();
  book_();
  const d = send_('✅ Avisos activados', 'La bitácora ya puede mandarte avisos de tomas, extracción, sueño y alertas.', 3);
  Logger.log('Canal de ntfy: ' + topic_() + ' | Respuesta de ntfy: ' + d.code + ' ' + d.detail + (d.mail ? ' | Se envió por correo como respaldo' : ''));
}

function ensureTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'revisar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisar').timeBased().everyMinutes(5).create();
  PropertiesService.getScriptProperties().setProperty('trig', '1');
}

/* ================= Hoja ================= */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sh_(name) { return book_().getSheetByName(name); }
function book_() {
  if (BOOK_) return BOOK_;
  const props = PropertiesService.getScriptProperties();
  let b = null;
  try { b = SpreadsheetApp.getActive(); } catch (e) { b = null; }
  if (!b) { try { b = SpreadsheetApp.openById(props.getProperty('sheetId') || SHEET_ID); } catch (e) { b = null; } }
  if (!b) { b = SpreadsheetApp.create('Bitácora José Gabriel'); props.setProperty('sheetId', b.getId()); }
  setup_(b);
  return (BOOK_ = b);
}
function setup_(b) {
  if (!b.getSheetByName(EV)) {
    const first = b.getSheets()[0];
    const s = first && first.getLastRow() === 0 && !b.getSheetByName(DT) ? first.setName(EV) : b.insertSheet(EV);
    s.getRange(1, 1, 1, 9).setValues([['Fecha', 'Hora', 'Tipo', 'Detalle', 'Registró', 'ID', 'Datos (no editar)', 'Actualizado', 'Estado']]).setFontWeight('bold');
    s.setFrozenRows(1); s.hideColumns(6, 4);
  }
  if (!b.getSheetByName(DT)) {
    const s = b.insertSheet(DT);
    s.getRange(1, 1, 1, 3).setValues([['Clave', 'Datos (no editar)', 'Actualizado']]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
}
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
      if (idx[op.id] && !e) ev.getRange(idx[op.id], 7, 1, 3).setValues([['', now, 'borrado']]);
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

/* ================= Avisos (ntfy) ================= */
function topic_() {
  const props = PropertiesService.getScriptProperties();
  let t = props.getProperty('ntfy');
  if (!t) { t = 'bitacora-' + Utilities.getUuid().replace(/-/g, '').slice(0, 20); props.setProperty('ntfy', t); }
  return t;
}
function notify_(title, msg, pri) { return send_(title, msg, pri).ok; }
function send_(title, msg, pri) {
  let r;
  try {
    const opt = {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ topic: topic_(), title: title, message: msg, priority: pri || 3, click: APP_URL })
    };
    const tok = PropertiesService.getScriptProperties().getProperty('ntfyToken');
    if (tok) opt.headers = { Authorization: 'Bearer ' + tok }; // con cuenta de ntfy el límite es por cuenta, no por servidor de Google
    const res = UrlFetchApp.fetch('https://ntfy.sh/', opt);
    const code = res.getResponseCode();
    r = { ok: code < 300, code: code, detail: code < 300 ? '' : res.getContentText().slice(0, 200) };
  } catch (e) { r = { ok: false, code: 0, detail: String(e).slice(0, 200) }; }
  if (!r.ok) r.mail = mail_(title, msg);
  return r;
}
/** Respaldo: si ntfy falla, manda el aviso por correo a los correos de Ajustes (o al dueño de la hoja). */
function mail_(title, msg) {
  try {
    const prefs = metaGet_('prefs');
    let to = (prefs.emails || []).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); });
    if (!to.length) to = [Session.getEffectiveUser().getEmail()];
    if (!to[0] || MailApp.getRemainingDailyQuota() < to.length) return false;
    MailApp.sendEmail({ to: to.join(','), subject: title, name: 'Bitácora', body: msg + '\n\nAbrir la bitácora: ' + APP_URL });
    return true;
  } catch (e) { return false; }
}
function metaGet_(name) {
  const dt = sh_(DT), dn = Math.max(0, dt.getLastRow() - 1);
  if (!dn) return {};
  const row = dt.getRange(2, 1, dn, 2).getValues().filter(function (r) { return String(r[0]) === name; })[0];
  return row ? parse_(String(row[1])) : {};
}
/** Ejecútala desde el editor si los avisos no llegan: muestra en el registro la respuesta exacta de ntfy. */
function diagnostico() {
  const d = send_('🔧 Diagnóstico', 'Prueba enviada desde el editor de Apps Script.', 3);
  Logger.log('Canal: ' + topic_() + ' | Revisión automática activa: ' + (PropertiesService.getScriptProperties().getProperty('trig') === '1') + ' | Respuesta de ntfy: ' + d.code + ' ' + d.detail);
}

function tz_() { return Session.getScriptTimeZone(); }
function hour_(ms) { return Number(Utilities.formatDate(new Date(ms), tz_(), 'H')); }
function hhmm_(ms) { return Utilities.formatDate(new Date(ms), tz_(), 'HH:mm'); }
function dayKey_(ms) { return Utilities.formatDate(new Date(ms), tz_(), 'yyyy-MM-dd'); }
function isNight_(ms) { const h = hour_(ms); return h >= 22 || h < 6; }
function dur_(m) { m = Math.max(0, Math.round(m)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + r + ' min' : ''); }
function norm_(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

/** Lee lo reciente de la hoja: eventos (del más nuevo al más viejo) y datos generales. */
function state_() {
  const ev = sh_(EV), dt = sh_(DT);
  const n = Math.max(0, ev.getLastRow() - 1), take = Math.min(n, 600);
  const events = [];
  if (take) ev.getRange(n - take + 2, 6, take, 2).getValues().forEach(function (r) {
    if (!r[1]) return; const e = parse_(String(r[1])); if (e && e.type && e.t) { e.id = String(r[0]); events.push(e); }
  });
  events.sort(function (a, b) { return b.t - a.t; });
  const meta = {};
  const dn = Math.max(0, dt.getLastRow() - 1);
  if (dn) dt.getRange(2, 1, dn, 2).getValues().forEach(function (r) { meta[String(r[0])] = parse_(String(r[1])); });
  return { events: events, meta: meta };
}

/* --- Reglas (las mismas que usa la app) --- */
function gaWeeks_(ga) { const n = Number(ga) || 40, w = Math.floor(n), f = Math.round((n - w) * 10); return (f >= 1 && f <= 6 && Math.abs(n - w - f / 10) < 1e-6) ? w + f / 7 : n; }
function ages_(meta, now) {
  const p = meta.profile || {};
  if (!p.birth) return null;
  const b = Utilities.parseDate(p.birth + ' ' + (p.birthTime || '00:00'), tz_(), 'yyyy-MM-dd HH:mm').getTime();
  const d = (now - b) / DAY, ga = gaWeeks_(p.ga), cd = ga < 37 ? d - (40 - ga) * 7 : d;
  return { d: d, cd: cd, cm: Math.max(0, cd) / 30.4375, dol: Math.floor(d) + 1 };
}
function feedPlan_(meta, now) {
  const prefs = meta.prefs || {};
  if (Number(prefs.feedMax) > 0) return { day: Number(prefs.feedMax), night: Number(prefs.feedMax), wake: true };
  const a = ages_(meta, now);
  if (!a) return { day: 180, night: 180, wake: true };
  const bw = Number((meta.profile || {}).bw) || 0, g = meta.growth || {};
  let lastDate = '', lastW = 0;
  const born = (meta.profile || {}).birth || '';
  Object.keys(g).forEach(function (k) { const r = g[k]; if (r && r.peso && r.date && r.date > born && r.date >= lastDate) { lastDate = r.date; lastW = Number(r.peso); } }); // solo pesos posteriores al nacimiento
  const regained = bw > 0 && lastW >= bw;
  if (a.d < 14 || a.cd < 14 || !regained) return { day: 180, night: 180, wake: true };
  if (a.cd < 61) return { day: 180, night: 240, wake: true };
  if (a.cd < 122) return { day: 210, night: 0, wake: false };
  return { day: 240, night: 0, wake: false };
}
function endOf_(e) { return e.end || (e.t + (e.type === 'bottle' ? 10 : (Number(e.min) || 0)) * MIN); }
function lastSession_(events) {
  const feeds = events.filter(function (e) { return e.type === 'breast' || e.type === 'bottle'; });
  if (!feeds.length) return null;
  let start = feeds[0].t, end = endOf_(feeds[0]), id = feeds[0].id;
  for (let i = 1; i < feeds.length; i++) {
    if (start - endOf_(feeds[i]) < 45 * MIN) { start = feeds[i].t; id = feeds[i].id; end = Math.max(end, endOf_(feeds[i])); } else break;
  }
  return { start: start, end: end, id: id };
}
function pumpPlan_(events, meta, ses) {
  const mode = (meta.prefs || {}).pumpMode || 'establecer';
  if (mode === 'off') return null;
  const lastPump = events.filter(function (e) { return e.type === 'pump'; })[0];
  const lastBreast = events.filter(function (e) { return e.type === 'breast'; })[0];
  const removal = Math.max(lastPump ? lastPump.t : 0, lastBreast ? endOf_(lastBreast) : 0);
  const pumpedAfter = ses && lastPump && lastPump.t >= ses.end - 2 * MIN;
  const c = [];
  if (ses && !pumpedAfter) {
    if (mode === 'establecer') c.push({ at: ses.end + 20 * MIN, key: 'pa-' + ses.id, why: '20 min después de la toma' });
    if (mode === 'reserva' && hour_(ses.start) >= 6 && hour_(ses.start) < 11) c.push({ at: ses.end + 45 * MIN, key: 'pr-' + ses.id, why: 'extracción de reserva de la mañana' });
  }
  if (removal) {
    const night = isNight_(removal + 3 * HOUR), gap = mode === 'establecer' ? (night ? 240 : 180) : (night ? 300 : 240);
    c.push({ at: removal + gap * MIN, key: 'ps-' + removal, why: dur_(gap) + ' sin extraer ni amamantar' });
  }
  c.sort(function (x, y) { return x.at - y.at; });
  return c.map(function (x) { return Object.assign({ mode: mode }, x); });
}
function wakeWindow_(cm) {
  if (cm < 1) return [35, 60]; if (cm < 3) return [60, 90]; if (cm < 5) return [75, 120]; if (cm < 7) return [120, 180];
  if (cm < 10) return [150, 210]; if (cm < 13) return [180, 240]; if (cm < 19) return [240, 360]; return [300, 360];
}
const STOOL_ALERT_ = { blanco: 'blanca, gris o color arcilla', palido: 'amarillo muy pálido', rojo: 'con sangre o roja', negro: 'negra después del día 5' };

/** Se ejecuta sola cada 5 minutos: revisa la bitácora y manda los avisos que toquen (cada uno una sola vez). */
function revisar() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ntfy')) return;
  const now = Date.now();
  const st = state_(), events = st.events, meta = st.meta;
  const prefs = meta.prefs || {}, active = meta.active || {};
  const on = Object.assign({ feed: true, pump: true, sleep: true, supp: true, clinical: true }, prefs.notif || {});
  const sent = parse_(props.getProperty('sent'));
  const out = [];
  function fire(key, title, msg, pri) { if (sent[key]) return; sent[key] = now; out.push([title, msg, pri]); }
  function inWin(at, mins) { return now >= at && now < at + mins * MIN; }
  const a = ages_(meta, now);
  const ses = lastSession_(events);

  // Tomas
  if (on.feed && ses && !active.breast) {
    const fp = feedPlan_(meta, now);
    const lim = isNight_(ses.start + fp.day * MIN) ? fp.night : fp.day;
    if (lim > 0) {
      const due = ses.start + lim * MIN;
      if (now >= due - 15 * MIN && now < due) fire('fpre-' + ses.id, '🍼 Se acerca la toma', 'En ' + Math.max(1, Math.round((due - now) / MIN)) + ' min se cumplen ' + dur_(lim) + ' desde que empezó la última toma (' + hhmm_(ses.start) + ').', 3);
      if (inWin(due, 25)) fire('fdue-' + ses.id, '🍼 Hora de comer', 'Van ' + dur_(lim) + ' desde la última toma (' + hhmm_(ses.start) + ').' + (active.sleep && fp.wake ? ' Despiértalo para comer.' : ''), 4);
      if (inWin(due + 30 * MIN, 30)) fire('flate-' + ses.id, '⚠️ Toma atrasada', 'Ya pasaron ' + dur_((now - ses.start) / MIN) + ' desde la última toma. Si ya comió, regístralo en la app.', 4);
    }
  }
  // Extracción
  if (on.pump) {
    (pumpPlan_(events, meta, ses) || []).forEach(function (pp) {
      if (!inWin(pp.at, 40) || active.breast) return;
      const tip = pp.mode === 'establecer' ? 'Sacaleches doble 10–15 min o hasta sentir el seno blando.' : 'Solo hasta sentir alivio (3–5 min), para no aumentar la producción.';
      fire(pp.key, '🫙 Momento de extraer', 'Ahora: ' + pp.why + '. ' + tip, 3);
    });
  }
  // Ventana de sueño (de 7:00 a 21:00)
  if (on.sleep && a && !active.sleep) {
    const ls = events.filter(function (e) { return e.type === 'sleep' && e.end; })[0];
    const ww = wakeWindow_(a.cm), h = hour_(now);
    if (ls && h >= 7 && h < 21 && inWin(ls.end + (ww[1] - 10) * MIN, 30)) fire('ww-' + ls.id, '😴 Ventana de sueño', 'Lleva ' + dur_((now - ls.end) / MIN) + ' despierto (a esta edad, ' + ww[0] + '–' + ww[1] + ' min). Busca señales: bostezos, mirada perdida, se talla los ojos.', 3);
  }
  // Suplementos diarios
  if (on.supp) {
    const supps = prefs.supps || ['Vitamina D'], hr = Number(prefs.suppHour) || 10, h = hour_(now), today = dayKey_(now);
    supps.forEach(function (name) {
      const given = events.some(function (e) { return e.type === 'med' && norm_(e.name) === norm_(name) && dayKey_(e.t) === today; });
      if (given) return;
      if (h === hr) fire('sup-' + today + '-' + norm_(name), '💊 ' + name + ' pendiente', 'Hoy todavía no se registra ' + name + '.', 3);
      if (h === 19) fire('sup2-' + today + '-' + norm_(name), '💊 Recordatorio: ' + name, 'Sigue sin registrarse hoy.', 3);
    });
  }
  // Alertas de salud
  if (on.clinical) {
    events.filter(function (e) { return now - (e.at || e.t) < 40 * MIN; }).forEach(function (e) {
      if (e.type === 'temp' && Number(e.c) >= 38) fire('tmp-' + e.id, '🚨 Fiebre: ' + Number(e.c).toFixed(1) + ' °C', a && a.cm < 3 ? 'En menores de 3 meses: acude a urgencias o llama al pediatra ahora.' : 'Ofrece líquidos; llama al pediatra si pasa de 39 °C, dura más de 48 h o está decaído.', 5);
      if (e.type === 'temp' && Number(e.c) < 36) fire('tmpl-' + e.id, '🌡️ Temperatura baja: ' + Number(e.c).toFixed(1) + ' °C', 'Abrígalo, piel con piel, y vuelve a medir en 15 min. Si sigue bajo 36 °C, llama al pediatra.', 4);
      if (e.type === 'diaper' && e.poo && STOOL_ALERT_[e.color]) fire('poo-' + e.id, '🚨 Revisa el color de la popó', 'Se registró popó ' + STOOL_ALERT_[e.color] + '. Muéstrale el pañal o una foto al pediatra hoy.', 5);
    });
    if (a && hour_(now) === 18) {
      const today = dayKey_(now);
      const wet = events.filter(function (e) { return e.type === 'diaper' && e.pee && dayKey_(e.t) === today; }).length;
      const target = a.dol <= 5 ? Math.max(1, a.dol) : 6;
      if (wet < Math.ceil(target * 0.6)) fire('wet-' + today, '💧 Pocos pañales mojados', 'Hoy van ' + wet + ' de ' + target + '+ esperados. Si no es por falta de registro, avisa al pediatra.', 4);
    }
    if (active.breast && now - active.breast.t > 70 * MIN) fire('bt-' + active.breast.t, '⏱️ ¿Temporizador de pecho olvidado?', 'Lleva más de 1 h corriendo. Termínalo o corrígelo en la app.', 3);
  }

  Object.keys(sent).forEach(function (k) { if (now - sent[k] > 3 * DAY) delete sent[k]; });
  props.setProperty('sent', JSON.stringify(sent));
  out.slice(0, 4).forEach(function (n) { notify_(n[0], n[1], n[2]); });
}
