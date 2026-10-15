/**
 * Minimal in-memory Supabase client for `realtime-voice` handler tests (test-only).
 * Supports the query shapes the handlers use: select / insert / update / upsert / delete with
 * eq / in / order / limit, single / maybeSingle, head counts, and rpc.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Row = Record<string, unknown>;
type Filter = { op: "eq" | "in"; column: string; value: unknown };
type DbError = { code: string; message: string };

const TABLE_DEFAULTS: Record<string, Row> = {
  realtimeVoiceSession: {
    openaiCallId: null,
    transcriptionModel: null,
    status: "connecting",
    endReason: null,
    usageStatus: "pending",
    responsesSeen: 0,
    responsesReported: 0,
    transcriptionsSeen: 0,
    transcriptionsReported: 0,
    connectedAt: null,
    lastHeartbeatAt: null,
    endedAt: null,
    durationSeconds: null,
    planTierAtStart: "free",
  },
  chatConversation: { sessionType: "text", finalizedAt: null, hadCrisisEscalation: false },
};

export class FakeDb {
  tables: Record<string, Row[]> = {};
  rpcHandlers: Record<string, (args: Record<string, unknown> | undefined) => { data: unknown; error: DbError | null }> = {};
  /** `table:op` → error returned once. */
  failures = new Map<string, DbError>();
  rpcCalls: Array<{ fn: string; args?: Record<string, unknown> }> = [];
  private seq = 0;

  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  seed(table: string, row: Row): Row {
    const full = { id: this.nextId(), createdAt: this.nextTime(), ...(TABLE_DEFAULTS[table] ?? {}), ...row };
    this.rows(table).push(full);
    return full;
  }

  nextId(): string {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, "0")}`;
  }

  nextTime(): string {
    return new Date(Date.UTC(2026, 9, 15, 0, 0, this.seq)).toISOString();
  }

  takeFailure(table: string, op: string): DbError | null {
    const key = `${table}:${op}`;
    const error = this.failures.get(key) ?? null;
    if (error) this.failures.delete(key);
    return error;
  }

  client(): SupabaseClient {
    return {
      from: (table: string) => new FakeQuery(this, table),
      rpc: async (fn: string, args?: Record<string, unknown>) => {
        this.rpcCalls.push({ fn, args });
        const handler = this.rpcHandlers[fn];
        return handler ? handler(args) : { data: null, error: { code: "PGRST202", message: `no rpc ${fn}` } };
      },
    } as unknown as SupabaseClient;
  }
}

class FakeQuery implements PromiseLike<{ data: unknown; error: DbError | null; count?: number | null }> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private filters: Filter[] = [];
  private returning = false;
  private head = false;
  private countRequested = false;
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    if (this.op === "select") {
      this.head = options?.head === true;
      this.countRequested = Boolean(options?.count);
    } else {
      this.returning = true;
    }
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.upsertOptions = options;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  in(column: string, value: unknown[]) {
    this.filters.push({ op: "in", column, value });
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) =>
      filter.op === "eq" ? row[filter.column] === filter.value : (filter.value as unknown[]).includes(row[filter.column]),
    );
  }

  private execute(): { data: unknown; error: DbError | null; count?: number | null } {
    const failure = this.db.takeFailure(this.table, this.op);
    if (failure) return { data: null, error: failure };
    const rows = this.db.rows(this.table);
    let result: Row[] = [];

    switch (this.op) {
      case "select": {
        result = rows.filter((row) => this.matches(row));
        if (this.orderBy) {
          const { column, ascending } = this.orderBy;
          result = [...result].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (ascending ? 1 : -1));
        }
        if (this.limitN !== null) result = result.slice(0, this.limitN);
        if (this.head) return { data: null, error: null, count: result.length };
        break;
      }
      case "insert":
        result = this.payload.map((row) => this.db.seed(this.table, row));
        break;
      case "upsert": {
        const keys = (this.upsertOptions.onConflict ?? "id").split(",").map((key) => key.trim());
        for (const row of this.payload) {
          const conflict = rows.find((existing) => keys.every((key) => row[key] != null && existing[key] === row[key]));
          if (conflict) {
            if (!this.upsertOptions.ignoreDuplicates) Object.assign(conflict, row);
            continue;
          }
          result.push(this.db.seed(this.table, row));
        }
        break;
      }
      case "update":
        result = rows.filter((row) => this.matches(row));
        for (const row of result) Object.assign(row, this.patch);
        break;
      case "delete": {
        const keep = rows.filter((row) => !this.matches(row));
        result = rows.filter((row) => this.matches(row));
        this.db.tables[this.table] = keep;
        break;
      }
    }

    const copies = result.map((row) => ({ ...row }));
    if (this.singleMode) {
      if (copies.length === 0) {
        return this.singleMode === "maybe"
          ? { data: null, error: null }
          : { data: null, error: { code: "PGRST116", message: "no rows" } };
      }
      return { data: copies[0], error: null };
    }
    if (this.op === "select") return { data: copies, error: null, count: this.countRequested ? copies.length : null };
    return { data: this.returning ? copies : null, error: null };
  }

  then<T1 = { data: unknown; error: DbError | null }, T2 = never>(
    onfulfilled?: ((value: { data: unknown; error: DbError | null; count?: number | null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}
