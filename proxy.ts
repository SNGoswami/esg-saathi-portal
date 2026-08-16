import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  void request.nextUrl;
  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/admin", "/login"],
};
