
"use strict";

const routes = {
  "/api/auth": require("./api/auth"),
  "/api/brand-status": require("./api/brand-status"),
  "/api/create-mvntpaga": require("./api/create-mvntpaga"),
  "/api/earnings-credit": require("./api/earnings-credit"),
  "/api/earnings": require("./api/earnings"),
  "/api/health": require("./api/health"),
  "/api/recommendations": require("./api/recommendations"),
  "/api/settings": require("./api/settings"),

  "/api/admin/brand-status": require("./api/admin/brand-status"),
  "/api/admin/payments": require("./api/admin/payments"),
  "/api/admin/recommendations": require("./api/admin/recommendations"),
  "/api/admin/settings": require("./api/admin/settings"),

  "/api/payments/proof": require("./api/payments/proof"),
  "/api/payments/status": require("./api/payments/status"),
  "/api/payments/submit": require("./api/payments/submit"),

 "/api/v2/movantra-webhook": require("./api/v2/movantra-webhook").default
};

async function handleAPI(request, handler) {
  const url = new URL(request.url);

  let body = {};

  if (request.method !== "GET" && request.method !== "HEAD") {
    const raw = await request.text();

    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
  }

  const req = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    query: Object.fromEntries(url.searchParams.entries()),
    params: {}
  };

  let statusCode = 200;
  const headers = new Headers();
  let responseBody = null;
  let finished = false;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },

    setHeader(name, value) {
      headers.set(name, String(value));
      return this;
    },

    getHeader(name) {
      return headers.get(name);
    },

    json(data) {
      headers.set("Content-Type", "application/json; charset=utf-8");
      responseBody = JSON.stringify(data);
      finished = true;
      return this;
    },

    send(data) {
      responseBody = data;
      finished = true;
      return this;
    },

    end(data) {
      if (data !== undefined) responseBody = data;
      finished = true;
      return this;
    }
  };

  await handler(req, res);

  if (!finished) {
    responseBody = "";
  }

  return new Response(responseBody, {
    status: statusCode,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const handler = routes[url.pathname.replace(/\/$/, "")];

      if (!handler) {
        return Response.json(
          {
            ok: false,
            message: "API endpoint not found."
          },
          { status: 404 }
        );
      }

      try {
        return await handleAPI(request, handler);
      } catch (error) {
        console.error("Cloudflare API error:", error);

        return Response.json(
          {
            ok: false,
            message: "Server error. Please try again."
          },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
