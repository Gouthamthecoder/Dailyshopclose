export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);

    if (!incomingUrl.pathname.startsWith("/Dailyshopclose")) {
      return new Response("Not found", { status: 404 });
    }

    const originBase = env.RENDER_ORIGIN.replace(/\/+$/, "");
    const upstreamUrl = new URL(`${originBase}${incomingUrl.pathname}${incomingUrl.search}`);

    const forwardedRequest = new Request(upstreamUrl.toString(), request);
    forwardedRequest.headers.set("host", new URL(originBase).host);
    forwardedRequest.headers.set("x-forwarded-host", incomingUrl.host);
    forwardedRequest.headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

    return fetch(forwardedRequest, {
      redirect: "manual",
    });
  },
};
