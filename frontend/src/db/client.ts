// Native SQLite client (expo-sqlite). Authoritative store for all personal data.
import * as SQLite from "expo-sqlite";
import type { DB, Param } from "./types";

let handle: SQLite.SQLiteDatabase | null = null;
let txChain: Promise<unknown> = Promise.resolve();

function h() {
  if (!handle) throw new Error("Database not open");
  return handle;
}

export const db: DB = {
  async all(sql, p = []) {
    return (await h().getAllAsync(sql, p as Param[])) as any[];
  },
  async get(sql, p = []) {
    return ((await h().getFirstAsync(sql, p as Param[])) as any) ?? null;
  },
  async run(sql, p = []) {
    const r = await h().runAsync(sql, p as Param[]);
    return { id: r.lastInsertRowId, changes: r.changes };
  },
  async exec(sql) {
    await h().execAsync(sql);
  },
  async tx(fn) {
    const next = txChain.then(async () => {
      await h().execAsync("BEGIN");
      try {
        const out = await fn();
        await h().execAsync("COMMIT");
        return out;
      } catch (e) {
        await h().execAsync("ROLLBACK");
        throw e;
      }
    });
    txChain = next.catch(() => undefined);
    return next;
  },
};

export async function openDb() {
  if (handle) return;
  handle = await SQLite.openDatabaseAsync("recomp.db");
  await handle.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
}

export const dbEngine = "expo-sqlite (on-device)";
