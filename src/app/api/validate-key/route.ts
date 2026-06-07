import { NextRequest, NextResponse } from "next/server";

const PROVIDERS: Record<string, { name: string; endpoint: string; model: string }> = {
  deepseek: { name: "DeepSeek", endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
  openai: { name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o" },
  qwen: { name: "通义千问", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-turbo" },
  glm: { name: "智谱 GLM-4", endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4" },
  kimi: { name: "Kimi", endpoint: "https://api.moonshot.cn/v1/chat/completions", model: "moonshot-v1-8k" },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, model = "deepseek" } = body;

    if (!apiKey || apiKey.trim().length < 5) {
      return NextResponse.json({ valid: false, error: "API Key 格式不正确，请检查" }, { status: 400 });
    }

    const provider = PROVIDERS[model];
    if (!provider) {
      return NextResponse.json({ valid: false, error: `不支持的模型：${model}` }, { status: 400 });
    }

    // 发送一个最小请求来验证 Key 是否有效
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      let errMsg = "";
      try {
        const parsed = JSON.parse(errData);
        errMsg = parsed.error?.message || parsed.error?.code || "";
      } catch { /* ignore */ }

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ valid: false, error: `Key 无效或未授权：${errMsg || "请确认 Key 是否正确"}` });
      }
      if (response.status === 429) {
        return NextResponse.json({ valid: true, error: "Key 有效但请求过于频繁，请稍后再试" });
      }
      return NextResponse.json({ valid: false, error: `${provider.name} API 返回错误 (${response.status})：${errMsg || "请检查 Key 和账户余额"}` });
    }

    return NextResponse.json({ valid: true, message: `${provider.name} Key 验证通过` });
  } catch (err) {
    console.error("Validate key error:", err);
    return NextResponse.json({ valid: false, error: "网络错误，无法验证 Key，请检查网络连接" }, { status: 500 });
  }
}