import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const IDENTIFY_WINDOW_MS = 5 * 60 * 1000;
const IDENTIFY_LIMIT = 10;
const identifyAttempts = new Map<string, { count: number; resetAt: number }>();

type CarSuggestion = {
  brand: string;
  model: string;
  series: string;
  modelYear: string;
  category: string;
  className: string;
  nickname: string;
  confidence: string;
  summary: string;
};

function extractTextResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!("output" in payload) || !Array.isArray(payload.output)) {
    return "";
  }

  const chunks: string[] = [];
  for (const item of payload.output) {
    if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        content &&
        typeof content === "object" &&
        "type" in content &&
        content.type === "output_text" &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseJsonBlock(value: string) {
  const fencedMatch = value.match(/```json\s*([\s\S]+?)```/i);
  const candidate = fencedMatch?.[1] ?? value;
  return JSON.parse(candidate) as Partial<CarSuggestion>;
}

function normalizeSuggestion(value: Partial<CarSuggestion>): CarSuggestion {
  return {
    brand: typeof value.brand === "string" ? value.brand.trim() : "",
    model: typeof value.model === "string" ? value.model.trim() : "",
    series: typeof value.series === "string" ? value.series.trim() : "",
    modelYear: typeof value.modelYear === "string" ? value.modelYear.trim() : "",
    category: typeof value.category === "string" ? value.category.trim() : "",
    className: typeof value.className === "string" ? value.className.trim() : "",
    nickname: typeof value.nickname === "string" ? value.nickname.trim() : "",
    confidence: typeof value.confidence === "string" ? value.confidence.trim() : "",
    summary: typeof value.summary === "string" ? value.summary.trim() : "",
  };
}

function consumeIdentifyQuota(key: string) {
  const now = Date.now();
  const current = identifyAttempts.get(key);

  if (!current || current.resetAt <= now) {
    identifyAttempts.set(key, { count: 1, resetAt: now + IDENTIFY_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= IDENTIFY_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  identifyAttempts.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to identify car photos" }, { status: 401 });
  }

  if (!["admin", "host"].includes(user.role)) {
    return NextResponse.json(
      { ok: false, message: "Only host and admin accounts can identify car photos" },
      { status: 403 },
    );
  }

  const quota = consumeIdentifyQuota(user.id);
  if (!quota.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many identify attempts. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(quota.retryAfterSeconds),
        },
      },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "Set OPENAI_API_KEY to enable photo-based car identification",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File)) {
    return NextResponse.json({ ok: false, message: "A car photo is required" }, { status: 400 });
  }

  if (!photo.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "Upload an image file" }, { status: 400 });
  }

  if (photo.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, message: "Use an image smaller than 5 MB" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const dataUrl = `data:${photo.type};base64,${buffer.toString("base64")}`;
  const model = process.env.OPENAI_CAR_IDENTIFY_MODEL ?? "gpt-5.4";

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      max_output_tokens: 300,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Identify the die-cast toy car shown in this photo. Return JSON only with keys brand, model, series, modelYear, category, className, nickname, confidence, summary. Use empty strings for anything unknown. Keep nickname short and human-friendly. Confidence should be one of high, medium, or low. Summary should be one sentence explaining the identification and any uncertainty.",
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "low",
            },
          ],
        },
      ],
    }),
  });

  const payload = (await openAiResponse.json()) as unknown;
  if (!openAiResponse.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : "OpenAI request failed";
    return NextResponse.json({ ok: false, message }, { status: openAiResponse.status });
  }

  try {
    const responseText = extractTextResponse(payload);
    const suggestion = normalizeSuggestion(parseJsonBlock(responseText));

    if (!suggestion.brand && !suggestion.model) {
      return NextResponse.json(
        {
          ok: false,
          message: "The photo did not provide a confident car match. Try a clearer top or side view.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, suggestion });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "The identification response could not be parsed. Try a clearer photo.",
      },
      { status: 502 },
    );
  }
}
