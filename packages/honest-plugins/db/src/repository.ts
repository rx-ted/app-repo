import { type Table, eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { QueryOptions, PaginationResult } from './types';

export class BaseRepository<TTable extends Table> {
  protected db: any;
  protected table: TTable;

  constructor(db: any, table: TTable) {
    this.db = db;
    this.table = table;
  }

  async findById(id: string): Promise<any | null> {
    const [result] = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return result ?? null;
  }

  async findMany(options?: QueryOptions): Promise<any[]> {
    let query = this.db.select().from(this.table);
    if (options?.where) {
      const conditions = Object.entries(options.where).map(([key, value]) =>
        eq((this.table as any)[key], value),
      );
      query = query.where(and(...conditions));
    }
    if (options?.orderBy) {
      for (const [key, dir] of Object.entries(options.orderBy)) {
        query = query.orderBy(
          dir === 'desc'
            ? sql`${(this.table as any)[key]} desc`
            : sql`${(this.table as any)[key]} asc`,
        );
      }
    }
    if (options?.pagination) {
      const { page, pageSize } = options.pagination;
      query = query.limit(pageSize).offset((page - 1) * pageSize);
    }
    return query;
  }

  async findWithPagination(options?: QueryOptions): Promise<PaginationResult<any>> {
    const page = options?.pagination?.page ?? 1;
    const pageSize = options?.pagination?.pageSize ?? 10;
    const data = await this.findMany(options);
    const total = await this.count(options?.where);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(data: any): Promise<any> {
    const raw: any = await this.db.insert(this.table).values(data);
    const r = Array.isArray(raw) ? raw[0] : raw;
    return {
      insertId: Number(r.insertId ?? r.lastInsertRowid ?? r.meta?.last_row_id),
      affectedRows: Number(r.affectedRows ?? r.rowsAffected ?? r.meta?.changes ?? 0),
    };
  }

  async update(id: string, data: any): Promise<any | null> {
    const raw: any = await this.db
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id));
    const r = Array.isArray(raw) ? raw[0] : raw;
    return r ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(this.table).where(eq((this.table as any).id, id));
    return result.affectedRows > 0;
  }

  async count(where?: Record<string, any>): Promise<number> {
    let query = this.db.select({ count: sql<number>`count(*)` }).from(this.table);
    if (where) {
      const conditions = Object.entries(where).map(([key, value]) =>
        eq((this.table as any)[key], value),
      );
      query = query.where(and(...conditions));
    }
    const [result] = await query;
    return Number(result?.count ?? 0);
  }
}
