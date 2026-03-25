import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "4mb" }));

const UPSTREAM_URL = "https://inference.canopywave.io/v1/responses";
const ENV_KEY = process.env.CANOPYWAVE_API_KEY;
const PORT = Number(process.env.PORT || 8787);
const STRIP_THINK = process.env.STRIP_THINK !== "0";

function extractTextFromInput(input) {
  if (typeof input === "string") return input;

  if (Array.isArray(input)) {
    const out = [];
    for (const msg of input) {
      const content = Array.isArray(msg?.content) ? msg.content : [];
      for (const c of content) {
        if ((c?.type === "input_text" || c?.type === "text") && typeof c?.text === "string") {
          out.push(c.text);
        }
      }
      out.push("\n");
    }
    return out.join("").trim();
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function extractOutputText(data) {
  try {
    const parts = data?.output?.flatMap((o) => o?.content || []) || [];
    return parts
      .filter((c) => c?.type === "output_text" && typeof c?.text === "string")
      .map((c) => c.text)
      .join("");
  } catch {
    return "";
  }
}

// 很粗略的估算，主要避免 0（Codex 容易炸）
function estimateTokens(text) {
  const s = typeof text === "string" ? text : "";
  return Math.max(1, Math.ceil(s.length / 4));
}

function sseWrite(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

app.post("/v1/responses", async (req, res) => {
  const body = req.body || {};
  const model = body.model || "moonshotai/kimi-k2.5";
  const wantsStream = !!body.stream;

  const prompt = extractTextFromInput(body.input);

  // 透传 Authorization，没带就用环境变量
  const incomingAuth = req.headers["authorization"];
  const auth = incomingAuth || (ENV_KEY ? `Bearer ${ENV_KEY}` : null);
  if (!auth) {
    return res.status(401).json({
      message: "Missing Authorization (no incoming Authorization header and no CANOPYWAVE_API_KEY env).",
    });
  }

  // ==== 非流式：直接请求上游并返回 ====
  if (!wantsStream) {
    const upstreamPayload = { model, input: prompt };
    if (STRIP_THINK) {
      upstreamPayload.instructions =
        "Do NOT include chain-of-thought, analysis, reasoning, or <think> tags. Output only the final answer.Please answer only the current question. Do not include any previous context, questions, or answers. Only provide the response to the current user query.";
    }

    const upstreamResp = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(upstreamPayload),
    });

    const data = await upstreamResp.json();
    const outputText = data?.output_text || extractOutputText(data) || "";
    const inputTokens = data?.usage?.input_tokens ?? estimateTokens(prompt);
    const outputTokens = data?.usage?.output_tokens ?? estimateTokens(outputText);
    const totalTokens = Math.max(inputTokens + outputTokens, 1);

    data.output_text = outputText;
    data.usage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      // 兼容字段
      prompt_tokens: data?.usage?.prompt_tokens ?? inputTokens,
      completion_tokens: data?.usage?.completion_tokens ?? outputTokens,
    };

    return res.status(upstreamResp.status).json(data);
  }

  // ==== 流式：先立刻发“建消息”的事件，再等上游回来发文本 ====
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  let seq = 1;
  const response_id = `resp_${crypto.randomUUID().replace(/-/g, "")}`;
  const created_at = Math.floor(Date.now() / 1000);

  const output_index = 0;
  const item_id = `msg_${crypto.randomUUID().replace(/-/g, "")}`;
  const content_index = 0;

  // 1) response.created（按文档结构）
  sseWrite(res, {
    type: "response.created",
    sequence_number: seq++,
    response: {
      id: response_id,
      object: "response",
      created_at,
      status: "in_progress",
      completed_at: null,
      error: null,
      incomplete_details: null,
      instructions: null,
      max_output_tokens: null,
      model,
      output: [],
      parallel_tool_calls: true,
      previous_response_id: null,
      reasoning: { effort: null, summary: null },
      store: true,
      temperature: null,
      text: { format: { type: "text" } },
      tool_choice: "auto",
      tools: [],
      top_p: null,
      truncation: "disabled",
      usage: null,
      user: null,
      metadata: {},
    },
  });

  // 2) response.output_item.added（非常关键：Codex 往往靠这个“创建可显示的消息项”）
  sseWrite(res, {
    type: "response.output_item.added",
    sequence_number: seq++,
    output_index,
    item: {
      id: item_id,
      status: "in_progress",
      type: "message",
      role: "assistant",
      content: [],
    },
  });

  // 3) response.content_part.added（把 output_text part 加进来，先空字符串）
  sseWrite(res, {
    type: "response.content_part.added",
    sequence_number: seq++,
    item_id,
    output_index,
    content_index,
    part: {
      type: "output_text",
      text: "",
      annotations: [],
    },
  });

  // （可选）发一个 in_progress 让客户端更安心
  sseWrite(res, {
    type: "response.in_progress",
    sequence_number: seq++,
    response: {
      id: response_id,
      object: "response",
      created_at,
      status: "in_progress",
      completed_at: null,
      error: null,
      incomplete_details: null,
      instructions: null,
      max_output_tokens: null,
      model,
      output: [],
      parallel_tool_calls: true,
      previous_response_id: null,
      reasoning: { effort: null, summary: null },
      store: true,
      temperature: null,
      text: { format: { type: "text" } },
      tool_choice: "auto",
      tools: [],
      top_p: null,
      truncation: "disabled",
      usage: null,
      user: null,
      metadata: {},
    },
  });

  // 4) 请求上游（非流式）拿到完整文本
  let upstreamData = null;
  let upstreamStatus = 200;
  try {
    const upstreamPayload = { model, input: prompt };
    if (STRIP_THINK) {
      upstreamPayload.instructions =
        "Do NOT include chain-of-thought, analysis, reasoning, or <think> tags. Output only the final answer.";
    }

    const upstreamResp = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(upstreamPayload),
    });

    upstreamStatus = upstreamResp.status;
    upstreamData = await upstreamResp.json();
  } catch (e) {
    // 上游挂了：发 response.failed
    sseWrite(res, {
      type: "response.failed",
      sequence_number: seq++,
      response: {
        id: response_id,
        object: "response",
        created_at,
        status: "failed",
        completed_at: null,
        error: { code: "upstream_error", message: String(e) },
        incomplete_details: null,
        model,
        output: [],
        usage: null,
        metadata: {},
      },
    });
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  const outputText = upstreamData?.output_text || extractOutputText(upstreamData) || "";

  // 5) 发文本 delta（按文档：必须带 item_id/output_index/content_index/sequence_number）
  // 这里为了简单一次性把整段发出去（也可以分片）
  if (outputText) {
    sseWrite(res, {
      type: "response.output_text.delta",
      sequence_number: seq++,
      item_id,
      output_index,
      content_index,
      delta: outputText,
    });
  }

  // 6) output_text.done
  sseWrite(res, {
    type: "response.output_text.done",
    sequence_number: seq++,
    item_id,
    output_index,
    content_index,
    text: outputText,
  });

  // 7) content_part.done
  sseWrite(res, {
    type: "response.content_part.done",
    sequence_number: seq++,
    item_id,
    output_index,
    content_index,
    part: {
      type: "output_text",
      text: outputText,
      annotations: [],
    },
  });

  // 8) output_item.done（把最终 content 放进去）
  const finalItem = {
    id: item_id,
    status: "completed",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "output_text",
        text: outputText,
        annotations: [],
      },
    ],
  };

  sseWrite(res, {
    type: "response.output_item.done",
    sequence_number: seq++,
    output_index,
    item: finalItem,
  });

  // 9) response.completed（带 usage.input_tokens 等）
  const inputTokens = upstreamData?.usage?.input_tokens ?? estimateTokens(prompt);
  const outputTokens = upstreamData?.usage?.output_tokens ?? estimateTokens(outputText);
  const totalTokens = Math.max(inputTokens + outputTokens, 1);

  const completedResponse = {
    id: upstreamData?.id || response_id,
    object: "response",
    created_at: upstreamData?.created_at || created_at,
    status: "completed",
    completed_at: Math.floor(Date.now() / 1000),
    error: null,
    incomplete_details: null,
    instructions: upstreamData?.instructions ?? null,
    max_output_tokens: upstreamData?.max_output_tokens ?? null,
    model: upstreamData?.model || model,
    output: [finalItem],
    parallel_tool_calls: true,
    previous_response_id: upstreamData?.previous_response_id ?? null,
    reasoning: upstreamData?.reasoning ?? { effort: null, summary: null },
    store: upstreamData?.store ?? true,
    temperature: upstreamData?.temperature ?? null,
    text: upstreamData?.text ?? { format: { type: "text" } },
    tool_choice: upstreamData?.tool_choice ?? "auto",
    tools: upstreamData?.tools ?? [],
    top_p: upstreamData?.top_p ?? null,
    truncation: upstreamData?.truncation ?? "disabled",
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      // 兼容字段
      prompt_tokens: upstreamData?.usage?.prompt_tokens ?? inputTokens,
      completion_tokens: upstreamData?.usage?.completion_tokens ?? outputTokens,
    },
    user: upstreamData?.user ?? null,
    metadata: upstreamData?.metadata ?? {},
    output_text: outputText,
  };

  sseWrite(res, {
    type: "response.completed",
    sequence_number: seq++,
    response: completedResponse,
  });

  res.write("data: [DONE]\n\n");
  res.end();
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Local adapter listening on http://127.0.0.1:${PORT}`);
  console.log(`Upstream: ${UPSTREAM_URL}`);
});
