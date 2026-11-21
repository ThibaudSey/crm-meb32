// Exécute localement un script d'automatisation Airtable contre la vraie base, via l'API REST.
// Usage : node run-script.mjs <script.js> '{"recordId":"rec..."}'
// Reproduit le sous-ensemble de l'API de script utilisé par nos scripts
// (base.getTable, selectRecordsAsync, selectRecordAsync, create/update, getCellValue, getCellValueAsString, input, output).
// Le jeton n'est jamais lu ici : le proxy de la session l'injecte dans les requêtes vers api.airtable.com.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = process.env.AIRTABLE_BASE || 'appdLfACDzwzveC6H';
function api(method, path, body) {
  const args = ['-s', '-X', method, `https://api.airtable.com/v0/${path}`, '-H', 'Content-Type: application/json'];
  if (body) args.push('--data-binary', '@-');
  for (let i = 0; i < 4; i++) {
    const out = execFileSync('curl', args, { input: body ? JSON.stringify(body) : undefined, maxBuffer: 64 << 20 }).toString();
    const d = JSON.parse(out);
    if (d.error && String(d.error.type || d.error).includes('RATE')) { execFileSync('sleep', ['2']); continue; }
    if (d.error) throw new Error(`${method} ${path}: ${JSON.stringify(d.error)}`);
    return d;
  }
}
const schema = api('GET', `meta/bases/${BASE}/tables`).tables;
const byName = Object.fromEntries(schema.map((t) => [t.name, t]));
const byId = Object.fromEntries(schema.map((t) => [t.id, t]));

function toScriptValue(field, v) {
  if (v === undefined || v === null) return null;
  switch (field.type) {
    case 'singleSelect': return { name: v };
    case 'multipleSelects': return v.map((n) => ({ name: n }));
    case 'multipleRecordLinks': return v.map((id) => ({ id }));
    case 'checkbox': return v ? true : null;
    default: return v;
  }
}
function toRestValue(field, v) {
  if (v === null || v === undefined) return null;
  switch (field.type) {
    case 'singleSelect': return typeof v === 'object' ? v.name : v;
    case 'multipleSelects': return v.map((x) => (typeof x === 'object' ? x.name : x));
    case 'multipleRecordLinks': return v.map((x) => (typeof x === 'object' ? x.id : x));
    default: return v;
  }
}
class Rec {
  constructor(table, raw) { this.table = table; this.id = raw.id; this.raw = raw.fields; this.name = String(raw.fields[table.fields[0].name] ?? ''); }
  f(n) { const f = this.table.fields.find((x) => x.name === n || x.id === n); if (!f) throw new Error(`Champ inconnu « ${n} » dans ${this.table.name}`); return f; }
  getCellValue(n) { const f = this.f(n); return toScriptValue(f, this.raw[f.name]); }
  getCellValueAsString(n) {
    const f = this.f(n); const v = this.raw[f.name];
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? x.name || x.filename || x.id : x)).join(', ');
    return String(v);
  }
}
class Table {
  constructor(t) { this.t = t; this.id = t.id; this.name = t.name; this.fields = t.fields; }
  enc(fields) { const o = {}; for (const [k, v] of Object.entries(fields)) { const f = this.fields.find((x) => x.name === k || x.id === k); if (!f) throw new Error(`Champ inconnu « ${k} »`); o[f.name] = toRestValue(f, v); } return o; }
  async selectRecordsAsync() {
    let recs = [], off;
    do { const d = api('GET', `${BASE}/${this.id}?pageSize=100${off ? `&offset=${off}` : ''}`); recs = recs.concat(d.records); off = d.offset; } while (off);
    return { records: recs.map((r) => new Rec(this.t, r)) };
  }
  async selectRecordAsync(id) { try { return new Rec(this.t, api('GET', `${BASE}/${this.id}/${id}`)); } catch { return null; } }
  async createRecordAsync(fields) { return api('POST', `${BASE}/${this.id}`, { records: [{ fields: this.enc(fields) }], typecast: true }).records[0].id; }
  async createRecordsAsync(list) { return api('POST', `${BASE}/${this.id}`, { records: list.map((r) => ({ fields: this.enc(r.fields) })), typecast: true }).records.map((r) => r.id); }
  async updateRecordAsync(id, fields) { api('PATCH', `${BASE}/${this.id}`, { records: [{ id: typeof id === 'object' ? id.id : id, fields: this.enc(fields) }], typecast: true }); }
  async updateRecordsAsync(list) { api('PATCH', `${BASE}/${this.id}`, { records: list.map((r) => ({ id: r.id, fields: this.enc(r.fields) })), typecast: true }); }
}
const base = { getTable: (n) => { const t = byName[n] || byId[n]; if (!t) throw new Error(`Table inconnue « ${n} »`); return new Table(t); } };
const [file, cfgJson] = process.argv.slice(2);
const cfg = JSON.parse(cfgJson || '{}');
let used = false;
const input = { config: () => { if (used) throw new Error('input.config() appelé deux fois'); used = true; return cfg; }, get: (k) => cfg[k] };
const outputs = {};
const output = { set: (k, v) => { outputs[k] = v; } };
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
await new AsyncFunction('base', 'input', 'output', readFileSync(file, 'utf8'))(base, input, output);
console.log(JSON.stringify(outputs, null, 2));
