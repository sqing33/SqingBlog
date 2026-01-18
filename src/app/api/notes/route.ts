import { NextRequest } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { toMySqlDateTime } from "@/lib/date";
import { mysqlGetConnection, mysqlQuery } from "@/lib/db/mysql";
import { SnowflakeId } from "@/lib/id/snowflake";

export const runtime = "nodejs";

const NOTES_GRID_COLS = 48;
const NOTE_DEFAULT_GRID_W = 16;
const NOTE_DEFAULT_GRID_H = 16;

type StickyNoteRow = {
  id: string;
  user_id: string;
  tag: string;
  content: string;
  grid_x: number | string;
  grid_y: number | string;
  grid_w: number | string;
  grid_h: number | string;
  layout_locked?: number | string | null;
  create_time: string;
  update_time: string;
};

type StickyNoteTagRow = {
  note_id: string;
  tag: string;
  create_time: string;
};

type StickyNoteGridRow = RowDataPacket & {
  grid_x: number | string;
  grid_y: number | string;
  grid_w: number | string;
  grid_h: number | string;
};

function normalizeTags(input: unknown): string[] | null {
  const raw = Array.isArray(input) ? input : [];
  const trimmed = raw
    .map((t) => String(t ?? "").trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const t of trimmed) {
    if (!unique.includes(t)) unique.push(t);
  }
  if (!unique.length) return null;
  if (unique.length > 3) return null;
  if (unique.some((t) => t.length > 64)) return null;
  return unique;
}

export async function GET(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  try {
    let rows: StickyNoteRow[];
    try {
      rows = await mysqlQuery<StickyNoteRow>(
        "SELECT id, user_id, tag, content, grid_x, grid_y, grid_w, grid_h, layout_locked, create_time, update_time FROM sticky_note WHERE user_id = ? ORDER BY create_time DESC",
        [session.sub]
      );
    } catch (error) {
      const message = String((error as { message?: unknown } | null)?.message ?? "");
      const isMissingLockColumn =
        message.includes("Unknown column") && message.includes("layout_locked");
      if (!isMissingLockColumn) throw error;

      rows = await mysqlQuery<StickyNoteRow>(
        "SELECT id, user_id, tag, content, grid_x, grid_y, grid_w, grid_h, create_time, update_time FROM sticky_note WHERE user_id = ? ORDER BY create_time DESC",
        [session.sub]
      );
    }

    const noteIds = rows.map((row) => String(row.id));
    const tagsByNoteId = new Map<string, string[]>();

    if (noteIds.length) {
      const tagRows = await mysqlQuery<StickyNoteTagRow>(
        "SELECT note_id, tag, create_time FROM sticky_note_tag WHERE user_id = ? AND note_id IN (?) ORDER BY create_time ASC",
        [session.sub, noteIds]
      );
      for (const row of tagRows) {
        const noteId = String(row.note_id);
        const tag = String(row.tag || "").trim();
        if (!tag) continue;
        const existing = tagsByNoteId.get(noteId);
        if (existing) existing.push(tag);
        else tagsByNoteId.set(noteId, [tag]);
      }
    }

    const notes = rows.map((row) => {
      const id = String(row.id);
      const primaryTag = String(row.tag || "").trim();
      const tags = tagsByNoteId.get(id) ?? (primaryTag ? [primaryTag] : []);
      const layoutLocked = Boolean(Number(row.layout_locked ?? 0));
      return {
        ...row,
        id,
        user_id: String(row.user_id),
        content: row.content ?? "",
        grid_x: Number(row.grid_x ?? 0),
        grid_y: Number(row.grid_y ?? 0),
        grid_w: Number(row.grid_w ?? NOTE_DEFAULT_GRID_W),
        grid_h: Number(row.grid_h ?? NOTE_DEFAULT_GRID_H),
        layout_locked: layoutLocked,
        tags,
      };
    });

    const allTagsRows = await mysqlQuery<{ tag: string }>(
      "SELECT DISTINCT tag FROM sticky_note_tag WHERE user_id = ? ORDER BY tag ASC",
      [session.sub]
    );
    const tags = allTagsRows
      .map((row) => String(row.tag || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-CN"));

    return ok({ notes, tags });
  } catch {
    return fail("查询便签失败", { status: 500, code: "DB_ERROR" });
  }
}

const createSchema = z.object({
  tag: z.string().min(1).max(64).optional(),
  tags: z.array(z.string().min(1).max(64)).max(3).optional(),
  content: z.string().min(1).max(10000),
  grid: z
    .object({
      w: z.number().int().min(1).max(NOTES_GRID_COLS),
      h: z.number().int().min(1).max(1000000),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return fail("便签内容不正确", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const content = parsed.data.content.trim();
  const tags = normalizeTags(parsed.data.tags ?? (parsed.data.tag ? [parsed.data.tag] : []));
  const gridW = parsed.data.grid?.w ?? NOTE_DEFAULT_GRID_W;
  const gridH = parsed.data.grid?.h ?? NOTE_DEFAULT_GRID_H;
  const safeGridW = Math.max(1, Math.min(NOTES_GRID_COLS, gridW));
  const safeGridH = Math.max(1, gridH);

  if (!tags) {
    return fail("请输入 1~3 个标签", { status: 400, code: "INVALID_INPUT" });
  }
  if (!content) {
    return fail("请输入内容", { status: 400, code: "INVALID_INPUT" });
  }

  const idGen = new SnowflakeId({ WorkerId: 1 });
  const id = idGen.nextString();
  const now = toMySqlDateTime();

  const normalizeGridItem = (row: StickyNoteGridRow) => {
    const rawX = Number(row.grid_x ?? 0);
    const rawY = Number(row.grid_y ?? 0);
    const rawW = Number(row.grid_w ?? 1);
    const rawH = Number(row.grid_h ?? 1);

    const x = Math.max(0, Math.min(NOTES_GRID_COLS - 1, Number.isFinite(rawX) ? rawX : 0));
    const y = Math.max(0, Number.isFinite(rawY) ? rawY : 0);
    const w = Math.max(1, Math.min(NOTES_GRID_COLS - x, Number.isFinite(rawW) ? rawW : 1));
    const h = Math.max(1, Number.isFinite(rawH) ? rawH : 1);

    return { x, y, w, h };
  };

  const collides = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ) => {
    if (a.x + a.w <= b.x) return false;
    if (a.x >= b.x + b.w) return false;
    if (a.y + a.h <= b.y) return false;
    if (a.y >= b.y + b.h) return false;
    return true;
  };

  const findFirstFit = (
    items: Array<{ x: number; y: number; w: number; h: number }>,
    w: number,
    h: number
  ) => {
    const safeW = Math.max(1, Math.min(NOTES_GRID_COLS, w));
    const safeH = Math.max(1, h);

    const maxY = items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    const candidates = new Set<number>([0]);
    for (const item of items) {
      candidates.add(item.y);
      candidates.add(item.y + item.h);
    }
    const sortedCandidates = Array.from(candidates)
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);

    for (const candidateY of sortedCandidates) {
      for (let x = 0; x <= NOTES_GRID_COLS - safeW; x += 1) {
        const probe = { x, y: candidateY, w: safeW, h: safeH };
        const hasCollision = items.some((item) => collides(probe, item));
        if (!hasCollision) return { x, y: candidateY };
      }
    }

    return { x: 0, y: maxY };
  };

  try {
    const conn = await mysqlGetConnection();
    try {
      await conn.beginTransaction();
      const [gridRows] = await conn.query<StickyNoteGridRow[]>(
        "SELECT grid_x, grid_y, grid_w, grid_h FROM sticky_note WHERE user_id = ? FOR UPDATE",
        [session.sub]
      );
      const existing = gridRows.map((row) => normalizeGridItem(row));
      const position = findFirstFit(existing, safeGridW, safeGridH);
      await conn.execute(
        "INSERT INTO sticky_note (id, user_id, tag, content, grid_x, grid_y, grid_w, grid_h, create_time, update_time) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          session.sub,
          tags[0],
          content,
          position.x,
          position.y,
          safeGridW,
          safeGridH,
          now,
          now,
        ]
      );
      for (const tag of tags) {
        await conn.execute(
          "INSERT INTO sticky_note_tag (note_id, user_id, tag, create_time) VALUES (?,?,?,?)",
          [id, session.sub, tag, now]
        );
      }
      await conn.commit();
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}
      throw e;
    } finally {
      conn.release();
    }
    return ok({ id }, { status: 201, message: "创建成功" });
  } catch {
    return fail("创建便签失败", { status: 500, code: "DB_ERROR" });
  }
}
