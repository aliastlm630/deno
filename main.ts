// main.ts
// @ts-ignore
import { encodeBase64, decodeBase64 } from "@std/encoding";

const DENO_URL = "https://deno.aliastlm630.deno.net"; // Change this to your actual domain

// @ts-ignore
Deno.serve(async (request: Request): Promise<Response> => {
  try {
    // Anti-loop protection
    if (request.headers.get("x-relay-hop") === "1") {
      return json({ e: "loop detected" }, 508);
    }

    const req = await request.json();

    if (!req.u) {
      return json({ e: "missing url" }, 400);
    }

    const targetUrl = new URL(req.u);

    const BLOCKED_HOSTS = [DENO_URL];

    if (BLOCKED_HOSTS.some(h => targetUrl.hostname.endsWith(h))) {
      return json({ e: "self-fetch blocked" }, 400);
    }

    // Build headers
    const headers = new Headers();
    if (req.h && typeof req.h === "object") {
      for (const [k, v] of Object.entries(req.h)) {
        headers.set(k, String(v));
      }
    }

    headers.set("x-relay-hop", "1");

    const fetchOptions: RequestInit = {
      method: (req.m || "GET").toUpperCase(),
      headers,
      redirect: req.r === false ? "manual" : "follow",
    };

    // Handle base64 body
    if (req.b) {
      fetchOptions.body = decodeBase64(req.b);
    }

    const resp = await fetch(targetUrl.toString(), fetchOptions);

    // Convert response body to base64 safely
    const buffer = await resp.arrayBuffer();
    const base64 = encodeBase64(new Uint8Array(buffer));

    // Convert headers to plain object
    const responseHeaders: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return json({
      s: resp.status,
      h: responseHeaders,
      b: base64
    });

  } catch (err) {
    console.error(err);
    return json({ e: String(err) }, 500);
  }
});

function json(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}