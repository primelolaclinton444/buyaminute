import { NextResponse } from "next/server";

export type ErrorDetails = Record<string, unknown> | string | null;

export function jsonError(
  message: string,
  status = 400,
  code?: string,
  details?: ErrorDetails
) {
  return NextResponse.json(
    {
      error: {
        message,
        code,
        details,
      },
    },
    { status }
  );
}
