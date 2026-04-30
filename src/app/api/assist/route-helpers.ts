import { NextResponse } from "next/server";

type AssistRedirectOptions = {
  status?: string;
  count?: number;
  error?: string;
};

export function redirectToAssist(
  request: Request,
  options: AssistRedirectOptions = {},
) {
  const url = new URL("/assist", request.url);

  if (options.status) {
    url.searchParams.set("status", options.status);
  }

  if (options.count !== undefined) {
    url.searchParams.set("count", String(options.count));
  }

  if (options.error) {
    url.searchParams.set("error", options.error);
  }

  return NextResponse.redirect(url, { status: 303 });
}