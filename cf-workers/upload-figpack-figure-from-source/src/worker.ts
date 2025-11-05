// Worker that accepts { "source_url": "https://..." } and forwards to the container.
// The Container subclass exposes defaultPort and envVars, so every instance
// has FIGPACK_API_KEY injected from Worker Secrets.

import { Container, getRandom } from "@cloudflare/containers";
import { env } from "cloudflare:workers"; // typed access to secrets/bindings

export interface Env {
  // Durable Object binding to our container-backed class
  FIGPACK_CONTAINER: DurableObjectNamespace;
  // Secret configured via `wrangler secret put FIGPACK_API_KEY`
  FIGPACK_API_KEY: string;
}

// Container class name must match wrangler.toml [[containers]].class_name
export class FigpackContainer extends Container {
  // figpack HTTP server in container listens here (see app.py)
  defaultPort = 8080;
  sleepAfter = "1m";

  // Make the Worker secret available inside the container process
  envVars = {
    FIGPACK_API_KEY: env.FIGPACK_API_KEY,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Define CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://figpack.org",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST" || url.pathname !== "/upload") {
      return new Response(
        'POST /upload with JSON: {"source_url":"https://..."}',
        { status: 405, headers: corsHeaders },
      );
    }

    let body: { source_url?: string; title?: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
    }

    const source_url = body.source_url?.trim();
    if (!source_url) {
      return new Response("Missing field: source_url", { status: 400, headers: corsHeaders });
    }

    // Validate source_url format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(source_url);
    } catch {
      return new Response(
        "Invalid source_url: must be a valid URL",
        { status: 400, headers: corsHeaders }
      );
    }

    // Check domain (must be zenodo.org or sandbox.zenodo.org)
    const validDomains = ["zenodo.org", "sandbox.zenodo.org"];
    if (!validDomains.includes(parsedUrl.hostname)) {
      return new Response(
        `Invalid source_url: domain must be zenodo.org or sandbox.zenodo.org, got ${parsedUrl.hostname}`,
        { status: 400, headers: corsHeaders }
      );
    }

    // Check path format: /records/{number}/files/{filename.tgz|.tar.gz}
    const pathPattern = /^\/records\/\d+\/files\/[^/]+\.(tgz|tar\.gz)$/;
    if (!pathPattern.test(parsedUrl.pathname)) {
      return new Response(
        "Invalid source_url: must match pattern https://{zenodo.org|sandbox.zenodo.org}/records/{number}/files/{filename.tgz|.tar.gz}",
        { status: 400, headers: corsHeaders }
      );
    }

    // Optional: allow custom title; default mirrors your requirement.
    const title = body.title?.trim() || `Source: ${source_url}`;

    // Choose a container instance. For stateless jobs, a random instance is fine.
    const instance = await getRandom(env.FIGPACK_CONTAINER, 1);

    // POST to the container's tiny HTTP API
    const resp = await instance.fetch(`http://localhost:8080/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_url, title }),
    });

    // Pass through container response (JSON) to client
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 
        "content-type": "application/json",
        ...corsHeaders,
      },
    });
  },
};
