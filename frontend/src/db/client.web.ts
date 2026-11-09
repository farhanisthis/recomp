// Web preview only: same SQL schema running in sql.js (WASM, loaded from CDN),
// persisted to localStorage. The Android app uses client.ts (expo-sqlite).
import type { DB, Param } from "./types";

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";
const KEY = "recomp_db_v1";
let sdb: any = null;
let saveTimer: any = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}
function flush() {
  clearTimeout(saveTimer);
  if (!sdb) return;
  {
    try {
      const bytes: Uint8Array = sdb.export();
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      localStorage.setItem(KEY, btoa(bin));
    } catch (e) {
      console.warn("web db persist failed", e);
    }
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).initSqlJs) return resolve();
    const s = document.createElement("script");
    s.src = CDN + "sql-wasm.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load sql.js"));
    document.head.appendChild(s);
  });
}

function rows(sql: string, p: Param[]) {
  const st = sdb.prepare(sql);
  st.bind(p);
  const out: any[] = [];
  while (st.step()) out.push(st.getAsObject());
  st.free();
  return out;
}

let inTx = false;
export const db: DB = {
  async all(sql, p = []) {
    return rows(sql, p);
  },
  async get(sql, p = []) {
    return rows(sql, p)[0] ?? null;
  },
  async run(sql, p = []) {
    sdb.run(sql, p);
    const id = rows("SELECT last_insert_rowid() AS id", [])[0].id;
    const changes = sdb.getRowsModified();
    if (!inTx) persist();
    return { id, changes };
  },
  async exec(sql) {
    sdb.exec(sql);
    if (!inTx) persist();
  },
  async tx(fn) {
    sdb.exec("BEGIN");
    inTx = true;
    try {
      const out = await fn();
      sdb.exec("COMMIT");
      return out;
    } catch (e) {
      sdb.exec("ROLLBACK");
      throw e;
    } finally {
      inTx = false;
      persist();
    }
  },
};

export async function openDb() {
  if (sdb) return;
  await loadScript();
  const SQL = await (window as any).initSqlJs({ locateFile: (f: string) => CDN + f });
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const bin = atob(saved);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    sdb = new SQL.Database(bytes);
  } else sdb = new SQL.Database();
  sdb.exec("PRAGMA foreign_keys = ON;");
  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
}

export const dbEngine = "sql.js (web preview)";
