export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // CORS Headers for preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: Missing API Key" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Call Anthropic API with streaming
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        stream: true,
        messages: [
          { role: "user", content: prompt }
        ]
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API Error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to generate AI response" }), { 
        status: anthropicResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Pass through the SSE stream
    return new Response(anthropicResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
