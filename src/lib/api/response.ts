import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  details?: unknown;
};

export function ok<T>(data?: T, init?: { message?: string; status?: number }) {
  return NextResponse.json(
    { ok: true, message: init?.message, data },
    { status: init?.status ?? 200 }
  );
}

export function fail(
  message: string,
  init?: { status?: number; code?: string; details?: unknown }
) {
  const error: ApiError = {
    code: init?.code ?? "BAD_REQUEST",
    details: init?.details,
  };

  return NextResponse.json(
    { ok: false, message, error },
    { status: init?.status ?? 400 }
  );
}

