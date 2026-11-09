export type Param = string | number | null;
export interface DB {
  all<T = any>(sql: string, p?: Param[]): Promise<T[]>;
  get<T = any>(sql: string, p?: Param[]): Promise<T | null>;
  run(sql: string, p?: Param[]): Promise<{ id: number; changes: number }>;
  exec(sql: string): Promise<void>;
  tx<T>(fn: () => Promise<T>): Promise<T>;
}
