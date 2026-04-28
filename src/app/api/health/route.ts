export async function GET() {
  return Response.json({
    status: "ok",
    service: process.env.NEXT_PUBLIC_APP_NAME ?? "Context-to-Action System",
    timestamp: new Date().toISOString()
  });
}
