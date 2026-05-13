export async function onRequest(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");

  const validCodes = ["123456", "ABC123"];

  if (validCodes.includes(code)) {
    return new Response("OK");
  }

  return new Response("FAIL", { status: 401 });
}
