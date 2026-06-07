import { NextRequest, NextResponse } from "next/server";

const MAX_DAILY_GENERATIONS = 5;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: Record<string, any>; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;
const dailyCount = new Map<string, { count: number; date: string }>();

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

function getDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkDailyLimit(userId: string): boolean {
  const today = getDateKey();
  const record = dailyCount.get(userId);
  if (!record || record.date !== today) {
    dailyCount.set(userId, { count: 0, date: today });
    return true;
  }
  return record.count < MAX_DAILY_GENERATIONS;
}

function incrementDailyCount(userId: string): void {
  const today = getDateKey();
  const record = dailyCount.get(userId);
  if (record && record.date === today) {
    record.count++;
  } else {
    dailyCount.set(userId, { count: 1, date: today });
  }
}

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

    const userId = request.headers.get("x-forwarded-for") || "anonymous";

    if (!checkDailyLimit(userId)) {
      return NextResponse.json(
        { error: `每日最多生成${MAX_DAILY_GENERATIONS}次，请明天再来` },
        { status: 429 }
      );
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
    incrementDailyCount(userId);

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

  if (!apiKey) {
    return generateMockResponse(userPrompt);
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
    throw new Error(`${provider.name} API 错误: ${response.status} ${errText}`);
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

function generateMockResponse(userPrompt: string): string {
  const topic = userPrompt.replace("主题：", "").split("\n")[0] || "AI工具";

  const industryMatch = userPrompt.match(/行业：(.+)/);
  const styleMatch = userPrompt.match(/内容风格：(.+)/);
  const toneMatch = userPrompt.match(/情绪语气：(.+)/);
  const industry = industryMatch?.[1]?.trim() || "";
  const style = styleMatch?.[1]?.trim() || "";
  const tone = toneMatch?.[1]?.trim() || "";

  const styleConfig = getStyleConfig(style);
  const toneText = getToneText(tone);

  const titleTemplates = [
    `关于「${topic}」，这5个真相你一定要知道`,
    `${topic}全攻略｜从入门到精通，看这一篇就够了`,
    `${topic}避坑指南，新手最容易犯的3个错误`,
    `研究了100篇${topic}笔记，我总结了这些干货`,
    `${topic}的正确打开方式，90%的人都搞错了`,
    `新手必看｜${topic}到底该从哪里开始？`,
    `关于${topic}，我想说点大实话`,
    `${topic}经验分享｜踩过的坑都在这了`,
    `被问爆了的${topic}问题，今天统一回答`,
    `如果你也在关注${topic}，这篇一定要收藏`,
  ];

  const mockData = {
    titles: titleTemplates,
    post: `${styleConfig.emoji} 最近收到好多私信问${topic}相关的问题，今天统一整理一下，希望能帮到大家。

${industry ? `作为一个${industry}从业者，这个话题我确实有很多想说的。\n\n` : ""}先说说为什么${topic}这么受关注👇

1️⃣ 信息差太大了
很多人对${topic}的了解停留在表面，网上信息又杂又乱，真真假假分不清。我当初也是踩了好多坑才慢慢摸索出来的。

2️⃣ 大家都想走捷径
说句${toneText}话：${topic}没有捷径，但有方法。好的方法能让你事半功倍，坏的方法只会让你原地打转。

3️⃣ 缺少系统性的梳理
${topic}相关的零散内容很多，但真正帮你从头到尾理清楚的很少。今天这篇就是来填这个坑的💡

${styleConfig.emoji} 我的几点建议：

第一，不要盲目跟风。先想清楚你为什么需要${topic}，你的目标是什么。想清楚再出发，比什么都重要。

第二，建立自己的判断体系。网上的声音很多，有的对有的错，关键是你要有分辨能力。多看多对比，慢慢就会有自己的判断。

第三，找到靠谱的信息源。${topic}这个领域，信息质量参差不齐。建议关注几个真正做内容的博主，而不是只看标题党。

第四，实践出真知。看再多不如做一次。${topic}是需要实际体验才能真正理解的，光看不动手永远学不会。

📝 最后总结一下：
${topic}这件事，急不得也慢不得。保持好奇心，保持耐心，你一定能找到属于自己的节奏。

${styleConfig.emoji} 你们对${topic}还有什么疑问？评论区告诉我，我尽量回复~觉得有用的话，别忘了点赞收藏，让更多人看到！`,
    openings: [
      `😰 说实话，${topic}这个话题我真的想说很久了。网上很多关于${topic}的内容要么太水，要么太玄乎，今天我想从一个普通人的角度聊聊真实感受。`,
      `💡 作为一个在${topic}上花了大量时间的人，我想分享一些可能跟主流观点不一样的想法。不一定对，但绝对真实。`,
      `🤔 你有没有想过，关于${topic}的那些"常识"，可能都是错的？今天我想从另一个角度，重新审视这个话题。`,
    ],
    tags: [
      topic,
      `${topic}分享`,
      `${topic}干货`,
      `${topic}经验`,
      "小红书分享",
      "实用干货",
      industry || "个人成长",
      "知识分享",
      "避坑指南",
      "真心建议",
    ],
    suggestion: {
      time: "工作日晚8点-10点，周末下午3点-5点",
      heat: "中",
      audience: industry ? `${industry}从业者及对${topic}感兴趣的人群` : `对${topic}感兴趣的各类人群`,
    },
  };

  return JSON.stringify({ ...mockData, _mock: true });
}

function getStyleConfig(style: string): { emoji: string; label: string } {
  if (style.includes("干货")) return { emoji: "📚", label: "干货" };
  if (style.includes("焦虑")) return { emoji: "😰", label: "焦虑" };
  if (style.includes("经验")) return { emoji: "💡", label: "经验" };
  if (style.includes("工具")) return { emoji: "🛠️", label: "工具" };
  if (style.includes("观点")) return { emoji: "💬", label: "观点" };
  return { emoji: "✨", label: "分享" };
}

function getToneText(tone: string): string {
  if (tone.includes("冲突")) return "句大实";
  if (tone.includes("轻松")) return "句轻松的心里";
  return "句实在";
}