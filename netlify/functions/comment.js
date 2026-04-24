import { CORS_HEADERS, requestAiComment } from "../../lib/aiComment.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const body = await req.json();
    const config = {
      apiKey: Netlify.env.get("AI_API_KEY"),
      apiBaseUrl: Netlify.env.get("AI_BASE_URL") || "https://api.deepseek.com",
      model: Netlify.env.get("AI_MODEL") || "deepseek-v4-flash",
    };
    const payload = await requestAiComment(body, config);
    return jsonResponse(payload);
  } catch (error) {
    return jsonResponse({ error: error.message }, error.statusCode || 500);
  }
};
