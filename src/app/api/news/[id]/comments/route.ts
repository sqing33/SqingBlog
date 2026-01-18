import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec, mysqlQuery } from "@/lib/db/mysql";
import { toMySqlDateTime } from "@/lib/date";
import { SnowflakeId } from "@/lib/id/snowflake";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";
import { resolveUploadImageUrl } from "@/lib/uploads";

export const runtime = "nodejs";

type CommentRow = {
  id: string;
  content: string;
  create_time: string;
  publisher_id: string;
  nickname: string;
  avatarUrl: string | null;
  pid: string | null;
  pname: string | null;
  like: number;
  category: string;
  bn_id: string;
};

type CommentNode = CommentRow & { children: CommentNode[] };

function buildTree(all: CommentRow[]): CommentNode[] {
  // NOTE: The UI only needs 2 levels:
  // - root comments (pid = null)
  // - all replies flattened under the root comment ("楼中楼")
  const byId = new Map<string, CommentRow>();
  for (const row of all) byId.set(String(row.id), row);

  const normalize = (row: CommentRow): CommentNode => ({
    ...row,
    id: String(row.id),
    publisher_id: String(row.publisher_id),
    bn_id: String(row.bn_id),
    content: rewriteLegacyAssetHosts(row.content),
    avatarUrl: resolveUploadImageUrl(row.avatarUrl, "avatars"),
    children: [],
  });

  const roots = new Map<string, CommentNode>();
  for (const row of all) {
    if (!row.pid) roots.set(String(row.id), normalize(row));
  }

  const rootMemo = new Map<string, string>();
  const findRootId = (id: string): string => {
    const cached = rootMemo.get(id);
    if (cached) return cached;

    const row = byId.get(id);
    if (!row) {
      rootMemo.set(id, id);
      return id;
    }
    if (!row.pid) {
      rootMemo.set(id, id);
      return id;
    }

    const parentId = String(row.pid);
    if (!byId.has(parentId) || parentId === id) {
      // Orphan/cycle: fall back to treating itself as root.
      rootMemo.set(id, id);
      return id;
    }

    const rootId = findRootId(parentId);
    rootMemo.set(id, rootId);
    return rootId;
  };

  for (const row of all) {
    if (!row.pid) continue;
    const id = String(row.id);
    const rootId = findRootId(id);
    let root = roots.get(rootId);
    if (!root) {
      const rootRow = byId.get(rootId);
      root = normalize(
        rootRow && !rootRow.pid ? rootRow : ({ ...row, pid: null, pname: null } as CommentRow)
      );
      roots.set(rootId, root);
    }
    root.children.push(normalize(row));
  }

  const rootList = Array.from(roots.values()).sort((a, b) =>
    String(a.create_time).localeCompare(String(b.create_time))
  );
  for (const root of rootList) {
    root.children.sort((a, b) => String(a.create_time).localeCompare(String(b.create_time)));
  }
  return rootList;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  try {
    const rows = await mysqlQuery<CommentRow>(
      "SELECT c.*, u.avatarUrl AS avatarUrl FROM comment c LEFT JOIN users u ON c.publisher_id = u.id WHERE c.bn_id = ? AND c.category = 'news' ORDER BY c.create_time ASC",
      [id]
    );

    const totalRows = await mysqlQuery<{ total: number }>(
      "SELECT COUNT(*) AS total FROM comment WHERE bn_id = ? AND category = 'news'",
      [id]
    );

    return ok({ comments: buildTree(rows), total: totalRows?.[0]?.total ?? rows.length });
  } catch {
    return fail("查询评论失败", { status: 500, code: "DB_ERROR" });
  }
}

const createSchema = z.object({
  content: z.string().min(1),
  pid: z.string().optional().nullable(),
  pname: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bnId } = await params;
  if (!bnId) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return fail("评论内容不完整或格式错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  try {
    const users = await mysqlQuery<{ nickname: string }>(
      "SELECT nickname FROM users WHERE id = ? LIMIT 1",
      [session.sub]
    );
    const nickname = users?.[0]?.nickname ?? "匿名";

    const idGen = new SnowflakeId({ WorkerId: 1 });
    const commentId = idGen.nextString();
    const createTime = toMySqlDateTime();

    const { content, pid, pname } = parsed.data;

    await mysqlExec(
      "INSERT INTO comment (id, content, create_time, publisher_id, nickname, pid, pname, `like`, category, bn_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        commentId,
        rewriteLegacyAssetHosts(content),
        createTime,
        session.sub,
        nickname,
        pid ?? null,
        pname ?? null,
        0,
        "news",
        bnId,
      ]
    );

    return ok({ id: commentId }, { status: 201, message: "评论成功" });
  } catch {
    return fail("评论失败", { status: 500, code: "DB_ERROR" });
  }
}
