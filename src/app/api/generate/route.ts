import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: Record<string, any>; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

// ====== 模型提供商配置 ======
interface ProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  authHeader: (apiKey: string) => Record<string, string>;
  buildBody: (systemPrompt: string, userPrompt: string, model: string) => Record<string, unknown>;
  parseResponse: (data: Record<string, unknown>) => string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
    parseResponse: (data) => {
      const choices = data.choices as Array<{ message: { content: string } }>;
      return choices?.[0]?.message?.content || "";
    },
  },
  openai: {
    name: "OpenAI GPT-4o",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
    parseResponse: (data) => {
      const choices = data.choices as Array<{ message: { content: string } }>;
      return choices?.[0]?.message?.content || "";
    },
  },
  qwen: {
    name: "通义千问",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-turbo",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
    parseResponse: (data) => {
      const choices = data.choices as Array<{ message: { content: string } }>;
      return choices?.[0]?.message?.content || "";
    },
  },
  glm: {
    name: "智谱 GLM-4",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
    parseResponse: (data) => {
      const choices = data.choices as Array<{ message: { content: string } }>;
      return choices?.[0]?.message?.content || "";
    },
  },
  kimi: {
    name: "Kimi (月之暗面)",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    model: "moonshot-v1-8k",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
    parseResponse: (data) => {
      const choices = data.choices as Array<{ message: { content: string } }>;
      return choices?.[0]?.message?.content || "";
    },
  },
};

function getCacheKey(input: GenerateRequest): string {
  return `${input.model}_${input.topic}_${input.industry}_${input.style}_${input.tone}`;
}

interface GenerateRequest {
  topic: string;
  industry?: string;
  style?: string;
  tone?: string;
  apiKey?: string;
  model?: string;
}

const SYSTEM_PROMPT = `你是一名小红书爆款内容创作专家，深谙小红书平台的流量密码和用户喜好。

你的任务是根据用户输入，生成一套完整的小红书笔记内容，包括：
- 10个爆款标题（10~20字，充满点击欲望，善用emoji）
- 1篇完整正文（300~600字，小红书风格，分段清晰，有emoji点缀）
- 3种不同风格的开头（焦虑型、经验型、反差型）
- 10个精准标签
- 发布建议

【小红书笔记核心要求】
1. 标题必须有冲击力，用数字、悬念、反常识、emoji来吸引点击
2. 正文格式：
   - 开头：用emoji + 一句话抓住注意力（痛点/好奇心/共鸣）
   - 中段：分点阐述，每段用emoji开头，像聊天一样自然
   - 结尾：总结金句 + 引导互动（评论/点赞/收藏）
3. 语气要像朋友聊天，口语化、有温度、有情绪
4. 适当使用emoji但不过度（每段1-2个即可）
5. 内容要真实可信，有具体细节，避免空洞说教
6. 如果用户指定了行业/风格/语气，必须严格贴合

【标题示例风格】
- 数字型："3个方法，让我从设计小白逆袭大厂"
- 悬念型："用了这个工具后，我同事以为我开挂了"
- 经验型："做了3年设计，今天才敢说的大实话"
- 攻略型："XX全攻略｜从入门到精通看这篇就够了"

【重要约束】
- 标题必须与主题高度相关，不能生搬硬套模板
- 严禁使用"我劝你别XX"、"我劝你别乱用"等不通用的句式
- 每个标题都要能独立成立，不能依赖上下文理解

【正文结构示例】
😭 说真的，最近被XX整焦虑了...
（痛点引入）

✨ 后来我发现了这3个方法：
1️⃣ 第一个方法...
2️⃣ 第二个方法...
3️⃣ 第三个方法...

💡 坚持了一个月，效果真的惊到我了！
（成果展示）

📝 总结一下：
（金句总结）

你们有类似的经历吗？评论区聊聊~记得点赞收藏！

必须严格返回JSON格式（不要markdown代码块包裹）：
{
  "titles": ["标题1", "标题2", ...],
  "post": "完整正文（含emoji）",
  "openings": ["焦虑型开头", "经验型开头", "反差型开头"],
  "tags": ["标签1", "标签2", ...],
  "suggestion": {
    "time": "推荐发布时间段",
    "heat": "低/中/高",
    "audience": "目标人群描述"
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { topic, model = "deepseek" } = body;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: "请输入主题" }, { status: 400 });
    }

    const provider = PROVIDERS[model];
    if (!provider) {
      return NextResponse.json({ error: `不支持的模型：${model}` }, { status: 400 });
    }

    const cacheKey = getCacheKey(body);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    const userPrompt = buildUserPrompt(body);
    const aiResponse = await callProvider(provider, userPrompt, body.apiKey);
    const parsed = parseAIResponse(aiResponse);

    cache.set(cacheKey, { data: parsed, timestamp: Date.now() });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}

function buildUserPrompt(input: GenerateRequest): string {
  const parts: string[] = [`主题：${input.topic}`];
  if (input.industry) parts.push(`行业：${input.industry}`);
  if (input.style) parts.push(`内容风格：${input.style}`);
  if (input.tone) parts.push(`情绪语气：${input.tone}`);
  parts.push("\n请根据以上信息，生成符合小红书调性的完整笔记内容。");
  return parts.join("\n");
}

async function callProvider(provider: ProviderConfig, userPrompt: string, userApiKey?: string): Promise<string> {
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey.trim().length < 5) {
    throw new Error("请先配置有效的 API Key，点击右上角「未配置 Key」按钮进行配置。如需购买 Key，请联系作者。");
  }

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(apiKey),
    },
    body: JSON.stringify(provider.buildBody(SYSTEM_PROMPT, userPrompt, provider.model)),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `${provider.name} API 返回错误 (${response.status})`;
    try {
      const parsed = JSON.parse(errText);
      const detail = parsed.error?.message || parsed.error?.code || "";
      if (detail) errMsg += `：${detail}`;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return provider.parseResponse(data as Record<string, unknown>);
}

function parseAIResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return validateOutput(parsed);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateOutput(parsed);
    }
    throw new Error("无法解析AI返回内容，请尝试切换模型");
  }
}

function validateOutput(data: Record<string, unknown>) {
  const suggestion = (data.suggestion as Record<string, unknown>) || {};
  return {
    titles: Array.isArray(data.titles) ? data.titles.slice(0, 10) : [],
    post: typeof data.post === "string" ? data.post : "",
    openings: Array.isArray(data.openings) ? data.openings.slice(0, 3) : [],
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 10) : [],
    suggestion: {
      time: typeof suggestion.time === "string" ? suggestion.time : "晚8点-10点",
      heat: typeof suggestion.heat === "string" ? suggestion.heat : "中",
      audience: typeof suggestion.audience === "string" ? suggestion.audience : "通用人群",
    },
  };
}