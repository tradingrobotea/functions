export default {
  async fetch(request) {

    const url = new URL(request.url);

    if (url.pathname === "/api/auth") {

      const code = url.searchParams.get("code");

      const validCodes = ["123456"];

      if (validCodes.includes(code)) {
        return new Response("OK");
      }

      return new Response("FAIL", { status: 401 });
    }

    return new Response("Not Found", { status: 404 });
  }
};
