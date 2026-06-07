"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const INDUSTRIES = ["UI设计", "平面设计", "电商", "互联网", "教育", "AI工具"];
const STYLES = ["干货型", "焦虑型", "经验分享", "工具推荐", "观点输出"];
const TONES = ["强冲突", "正常表达", "轻松口语"];

const MODELS = [
  { id: "deepseek", name: "DeepSeek", icon: "🔍", desc: "性价比高，中文能力强" },
  { id: "openai", name: "OpenAI GPT-4o", icon: "🧠", desc: "综合能力最强" },
  { id: "qwen", name: "通义千问", icon: "☁️", desc: "阿里出品，中文友好" },
  { id: "glm", name: "智谱 GLM-4", icon: "🏛️", desc: "国产大模型，稳定可靠" },
  { id: "kimi", name: "Kimi", icon: "🌙", desc: "月之暗面，长文本优秀" },
];

interface OutputData {
  titles: string[];
  post: string;
  openings: string[];
  tags: string[];
  suggestion: { time: string; heat: string; audience: string };
  cached?: boolean;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("");
  const [tone, setTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutputData | null>(null);
  const [error, setError] = useState("");
  const [copyText, setCopyText] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiModal, setShowApiModal] = useState(false);
  const [model, setModel] = useState("deepseek");
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("xhs_api_key");
    if (saved) setApiKey(saved);
    const savedModel = localStorage.getItem("xhs_model");
    if (savedModel) setModel(savedModel);
    // 首次访问或没有配置 Key 时，自动弹出配置弹窗
    if (!saved) {
      const timer = setTimeout(() => setShowApiModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveApiKey = useCallback((key: string) => {
    setApiKey(key);
    localStorage.setItem("xhs_api_key", key);
    setShowApiModal(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError("请输入主题"); topicRef.current?.focus(); return; }
    if (!apiKey) { setError("请先配置 API Key 后再生成文案"); setShowApiModal(true); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), industry: industry.trim() || undefined, style: style.trim() || undefined, tone: tone.trim() || undefined, apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(data);
      try {
        const history = JSON.parse(localStorage.getItem("xhs_history") || "[]");
        history.unshift({ topic: topic.trim(), industry, style, tone, result: data, time: new Date().toISOString() });
        localStorage.setItem("xhs_history", JSON.stringify(history.slice(0, 20)));
      } catch { /* ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally { setLoading(false); }
  }, [topic, industry, style, tone, apiKey, model]);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea"); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopyText(label); setTimeout(() => setCopyText(""), 2000);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  }, [handleGenerate]);

  return (
    <div className="min-h-screen bg-[#f9f8f6] bg-pixel-grid">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b-2 border-[#1a1a2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XhsLogo />
            <div>
              <h1 className="text-base font-extrabold text-[#1a1a2e] leading-none tracking-tight">
                小红书<span className="text-xhs-red">文案助手</span>
              </h1>
              <span className="text-[10px] text-gray-400">AI · 智能创作引擎</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-300" style={{ fontFamily: "'Courier New', monospace" }}>
              {MODELS.find(m => m.id === model)?.icon} {MODELS.find(m => m.id === model)?.name}
            </span>
            <button
              onClick={() => setShowApiModal(true)}
              className={`flex items-center gap-1.5 text-[10px] px-2 py-1 border-2 font-medium transition-colors ${
                apiKey
                  ? "border-green-300 text-green-600 bg-green-50"
                  : "border-orange-300 text-orange-600 bg-orange-50"
              }`}
              title="配置 API Key"
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: apiKey ? "#16a34a" : "#ea580c" }} />
              {apiKey ? "已配置 Key" : "未配置 Key"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* 左侧输入区 */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            <div className="lg:sticky lg:top-20">
              {/* 标题 */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1a2e] text-white text-xs font-bold tracking-wider mb-3 rounded-sm">
                  <span className="w-1.5 h-1.5 bg-xhs-red inline-block" /> 创作中心
                </div>
                <h2 className="text-xl font-black text-[#1a1a2e] leading-tight">
                  输入主题，<span className="text-xhs-red">AI</span> 秒出爆款
                </h2>
                <p className="text-sm text-gray-500 mt-1.5">
                  支持自定义行业、风格、语气，精准匹配你的需求
                </p>
              </div>

              {/* 输入卡片 */}
              <div className="bg-white border-2 border-[#1a1a2e] shadow-[4px_4px_0_0_#1a1a2e] p-5 space-y-5">
                {/* 主题 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#1a1a2e] mb-2.5" style={{ fontFamily: "'Courier New', monospace" }}>
                    <PixelIcon shape="diamond" /> 主题 <span className="text-xhs-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={topicRef}
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="例如：AI设计工具、副业赚钱、高考..."
                      className="w-full px-4 py-3 bg-[#fafaf8] border-2 border-[#1a1a2e] text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:border-xhs-red focus:shadow-[2px_2px_0_0_#ff2442] transition-all"
                      maxLength={50}
                    />
                    <div className="absolute right-3 bottom-1.5 text-[10px] text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>
                      {topic.length}/50
                    </div>
                  </div>
                </div>

                <TagInput label="行业" presets={INDUSTRIES} value={industry} onChange={setIndustry} placeholder="如：美妆、家居、健身..." />

                <TagInput label="风格" presets={STYLES} value={style} onChange={setStyle} placeholder="如：治愈系、教程风..." />

                <TagInput label="语气" presets={TONES} value={tone} onChange={setTone} placeholder="如：温暖、犀利、幽默..." />

                {/* 模型选择 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#1a1a2e] mb-2.5" style={{ fontFamily: "'Courier New', monospace" }}>
                    <PixelIcon shape="square" /> AI 模型
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(m.id); localStorage.setItem("xhs_model", m.id); }}
                        className={`px-3 py-2 text-left transition-all border-2 ${
                          model === m.id
                            ? "bg-xhs-red text-white border-xhs-red shadow-[2px_2px_0_0_#d41e3a]"
                            : "bg-white text-gray-600 border-[#1a1a2e] hover:border-xhs-red hover:text-xhs-red"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs">{m.icon}</span>
                          <span className="text-[11px] font-bold leading-tight">{m.name}</span>
                        </div>
                        <div className={`text-[9px] leading-tight ${model === m.id ? "text-white/70" : "text-gray-400"}`}>{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 生成按钮 */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="pixel-btn w-full h-12 bg-xhs-red text-white font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#d41e3a] hover:bg-[#ff3b56] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {loading ? (
                    <><PixelSpinner /> 生成中...</>
                  ) : (
                    <>一键生成文案</>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>
                  <PixelIcon shape="dot" /> 每日5次 · 缓存1h
                </div>

                <div className="text-center text-[10px] text-gray-300/50 select-none" style={{ fontFamily: "'Courier New', monospace" }}>
                  AI 驱动 · 每日5次
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border-2 border-red-300 text-red-600 px-4 py-3 text-sm font-medium flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">[!]</span> {error}
                </div>
              )}
            </div>
          </div>

          {/* 右侧预览区 */}
          <div className="lg:col-span-7 xl:col-span-8 mt-6 lg:mt-0">
            {loading ? <PreviewSkeleton /> : result ? <PreviewResult result={result} copyText={copyText} onCopy={handleCopy} /> : <EmptyPreview hasApiKey={!!apiKey} onConfigure={() => setShowApiModal(true)} />}
          </div>
        </div>
      </main>

      {/* 底部状态栏 */}
      <footer className="border-t-2 border-[#1a1a2e] bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between text-[10px] text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>
          <span>小红书文案助手 v1.0</span>
          <span className="text-gray-500 cursor-pointer hover:text-xhs-red transition-colors" onClick={() => { navigator.clipboard.writeText("Warm_light786"); setCopyText("VX"); setTimeout(() => setCopyText(""), 2000); }} title="点击复制微信号">JPENG · VX：Warm_light786</span>
          <span>基于 AI 驱动</span>
        </div>
      </footer>

      {/* 右下角版权 */}
      <div className="fixed bottom-3 right-4 z-40 text-[10px] text-gray-400 select-none" style={{ fontFamily: "'Courier New', monospace" }}>
        <span className="cursor-pointer hover:text-xhs-red transition-colors" onClick={() => { navigator.clipboard.writeText("Warm_light786"); setCopyText("VX"); setTimeout(() => setCopyText(""), 2000); }} title="点击复制微信号">
          JPENG · VX：Warm_light786
        </span>
      </div>

      {/* 左下角关于作者 */}
      <div className="fixed bottom-3 left-4 z-40">
        <button
          onClick={() => setShowContact(!showContact)}
          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-[#1a1a2e] shadow-[2px_2px_0_0_#1a1a2e] hover:bg-gray-50 transition-colors text-gray-500 hover:text-[#1a1a2e]"
          title="关于作者"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="5" r="3" />
            <path d="M2.5 14c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
          </svg>
        </button>
        {showContact && (
          <div className="absolute bottom-10 left-0 bg-white border-2 border-[#1a1a2e] shadow-[4px_4px_0_0_#1a1a2e] p-3 w-48 text-xs">
            <div className="text-[#1a1a2e] font-bold mb-1.5">关于作者</div>
            <div className="text-gray-500 space-y-1">
              <div>作者：JPENG</div>
              <div className="select-all text-xhs-red font-medium cursor-pointer hover:underline" onClick={() => { navigator.clipboard.writeText("Warm_light786"); setCopyText("VX"); setTimeout(() => setCopyText(""), 2000); }} title="点击复制">VX：Warm_light786</div>
            </div>
          </div>
        )}
      </div>

      {/* API Key 配置弹窗 */}
      {showApiModal && <ApiKeyModal currentKey={apiKey} onSave={saveApiKey} onClose={() => setShowApiModal(false)} />}

      {/* 复制 Toast */}
      {copyText && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] text-white text-sm px-4 py-2 border-2 border-white flex items-center gap-2" style={{ fontFamily: "'Courier New', monospace" }}>
          <span className="text-green-400">[OK]</span> {copyText} 已复制
        </div>
      )}
    </div>
  );
}

// ====== 小红书 Logo ======
function XhsLogo() {
  return (
    <svg className="w-8 h-8 shrink-0" viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" rx="8" fill="#ff2442" stroke="#d41e3a" strokeWidth="2" />
      {/* 书页 */}
      <path d="M14 11h5v18h-5a2 2 0 01-2-2V13a2 2 0 012-2z" fill="white" opacity="0.95" />
      <path d="M26 11h-5v18h5a2 2 0 002-2V13a2 2 0 00-2-2z" fill="white" opacity="0.85" />
      <line x1="19" y1="11" x2="19" y2="29" stroke="white" strokeWidth="0.8" opacity="0.6" />
      {/* 文字笔画 */}
      <path d="M16.5 16h2.5M16.5 19h2.5M16.5 22h2.5" stroke="white" strokeWidth="0.6" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

// ====== API Key 配置弹窗 ======
function ApiKeyModal({ currentKey, onSave, onClose }: { currentKey: string; onSave: (key: string) => void; onClose: () => void }) {
  const [inputValue, setInputValue] = useState(currentKey);
  const [selectedModel, setSelectedModel] = useState("deepseek");
  const [validating, setValidating] = useState(false);
  const [validateMsg, setValidateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const saved = localStorage.getItem("xhs_model");
    if (saved) setSelectedModel(saved);
  }, []);

  const handleValidate = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length < 5) {
      setValidateMsg({ ok: false, text: "API Key 格式不正确，请检查后重试" });
      return;
    }
    setValidating(true);
    setValidateMsg(null);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed, model: selectedModel }),
      });
      const data = await res.json();
      if (data.valid) {
        setValidateMsg({ ok: true, text: data.message || "Key 验证通过" });
        onSave(trimmed);
      } else {
        setValidateMsg({ ok: false, text: data.error || "Key 验证失败" });
      }
    } catch {
      setValidateMsg({ ok: false, text: "网络错误，无法验证 Key" });
    } finally {
      setValidating(false);
    }
  };

  const modelInfo = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  const guides: Record<string, { url: string; label: string; step: string }> = {
    deepseek: { url: "https://platform.deepseek.com/api_keys", label: "platform.deepseek.com", step: "点击「创建 API Key」→ 复制" },
    openai: { url: "https://platform.openai.com/api-keys", label: "platform.openai.com", step: "点击「Create new secret key」→ 复制" },
    qwen: { url: "https://dashscope.console.aliyun.com/apiKey", label: "dashscope.console.aliyun.com", step: "创建 API Key → 复制" },
    glm: { url: "https://open.bigmodel.cn/usercenter/apikeys", label: "open.bigmodel.cn", step: "创建 API Key → 复制" },
    kimi: { url: "https://platform.moonshot.cn/console/api-keys", label: "platform.moonshot.cn", step: "创建 API Key → 复制" },
  };
  const guide = guides[selectedModel] || guides.deepseek;

  const hasExistingKey = !!currentKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={hasExistingKey ? onClose : undefined}>
      <div className="bg-white border-2 border-[#1a1a2e] shadow-[8px_8px_0_0_#1a1a2e] w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#1a1a2e] bg-[#fafaf8]">
          <h3 className="text-sm font-bold text-[#1a1a2e]" style={{ fontFamily: "'Courier New', monospace" }}>
            {hasExistingKey ? "管理 API Key" : "配置 API Key"}
          </h3>
          {hasExistingKey && (
            <button onClick={onClose} className="text-gray-400 hover:text-[#1a1a2e] text-lg leading-none">&times;</button>
          )}
        </div>
        <div className="p-5 space-y-4">
          {/* 模型选择 */}
          <div>
            <div className="text-xs font-bold text-[#1a1a2e] mb-2">选择模型</div>
            <div className="grid grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-2 py-2 text-center text-[10px] border-2 transition-all font-bold ${
                    selectedModel === m.id
                      ? "bg-xhs-red text-white border-xhs-red"
                      : "bg-white text-gray-500 border-gray-200 hover:border-xhs-red"
                  }`}
                >
                  <div className="text-sm mb-0.5">{m.icon}</div>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            当前模型：<span className="font-bold text-[#1a1a2e]">{modelInfo.name}</span>。Key 仅保存在你的浏览器本地，本站不会存储。
          </p>

          {/* 获取 Key 指引 */}
          <div className="bg-blue-50 border-2 border-blue-200 p-3 text-xs text-blue-700 leading-relaxed">
            <div className="font-bold mb-1">如何获取 {modelInfo.name} 的 Key？</div>
            1. 访问 <a href={guide.url} target="_blank" className="underline text-blue-600 font-medium">{guide.label}</a><br />
            2. 注册/登录后，{guide.step}<br />
            3. 粘贴到下方输入框，点击「验证并保存」
          </div>

          {/* 购买 API 引导 */}
          <div className="bg-amber-50 border-2 border-amber-300 p-3 text-xs text-amber-800 leading-relaxed">
            <div className="font-bold mb-1">不想自己注册？</div>
            联系作者购买现成 API Key，即买即用，无需注册各平台。<br />
            <span
              className="text-amber-900 font-bold cursor-pointer hover:underline"
              onClick={() => { navigator.clipboard.writeText("Warm_light786"); }}
              title="点击复制微信号"
            >
              复制微信号：Warm_light786
            </span>
          </div>

          <input
            ref={inputRef}
            type="password"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setValidateMsg(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 bg-[#fafaf8] border-2 border-[#1a1a2e] text-sm text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:border-xhs-red focus:shadow-[2px_2px_0_0_#ff2442] transition-all font-mono"
          />

          {/* 验证结果 */}
          {validateMsg && (
            <div className={`border-2 p-3 text-xs font-medium ${
              validateMsg.ok
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-red-50 border-red-300 text-red-600"
            }`}>
              {validateMsg.ok ? "✓ " : "✗ "}{validateMsg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              disabled={validating}
              className="pixel-btn flex-1 h-10 bg-xhs-red text-white font-bold text-xs tracking-wider shadow-[4px_4px_0_0_#d41e3a] hover:bg-[#ff3b56] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              {validating ? "验证中..." : "验证并保存"}
            </button>
            {currentKey && (
              <button
                onClick={() => { onSave(""); setInputValue(""); setValidateMsg(null); }}
                className="px-3 h-10 border-2 border-gray-300 text-gray-500 text-xs hover:border-red-300 hover:text-red-500 transition-colors"
              >
                清除
              </button>
            )}
          </div>

          {!hasExistingKey && (
            <p className="text-[10px] text-gray-400 text-center">
              必须配置有效的 API Key 后才能使用本工具
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== 像素图标（小装饰块） ======
function PixelIcon({ shape }: { shape: "diamond" | "dot" | "square" }) {
  return (
    <span className="inline-block shrink-0" style={{ width: 6, height: 6 }}>
      {shape === "diamond" && (
        <svg viewBox="0 0 6 6" className="w-full h-full"><rect width="6" height="6" fill="#ff2442" /></svg>
      )}
      {shape === "dot" && (
        <svg viewBox="0 0 6 6" className="w-full h-full"><rect x="2" y="2" width="2" height="2" fill="#ff2442" /></svg>
      )}
      {shape === "square" && (
        <svg viewBox="0 0 6 6" className="w-full h-full"><rect x="1" y="1" width="4" height="4" fill="#1a1a2e" /></svg>
      )}
    </span>
  );
}

// ====== 像素加载动画 ======
function PixelSpinner() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 bg-white inline-block animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

// ====== 空状态 ======
function EmptyPreview({ hasApiKey, onConfigure }: { hasApiKey: boolean; onConfigure: () => void }) {
  return (
    <div className="h-full min-h-[400px] flex flex-col items-center justify-center py-12 lg:py-16">
      {/* 小红书 Logo 大图标 */}
      <div className="mb-8 animate-in">
        <svg className="w-28 h-28 drop-shadow-lg" viewBox="0 0 40 40" fill="none">
          <rect x="1" y="1" width="38" height="38" rx="8" fill="#ff2442" stroke="#d41e3a" strokeWidth="2" />
          <path d="M14 11h5v18h-5a2 2 0 01-2-2V13a2 2 0 012-2z" fill="white" opacity="0.95" />
          <path d="M26 11h-5v18h5a2 2 0 002-2V13a2 2 0 00-2-2z" fill="white" opacity="0.85" />
          <line x1="19" y1="11" x2="19" y2="29" stroke="white" strokeWidth="0.8" opacity="0.6" />
          <path d="M16.5 16h2.5M16.5 19h2.5M16.5 22h2.5" stroke="white" strokeWidth="0.6" opacity="0.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* 主标题 */}
      <h2 className="text-3xl font-black text-[#1a1a2e] mb-2 animate-in delay-1">
        小红书<span className="text-xhs-red">文案助手</span>
      </h2>
      <p className="text-base text-gray-500 mb-6 animate-in delay-2">
        AI 智能创作，一键生成爆款笔记
      </p>

      {/* API Key 引导 */}
      {!hasApiKey && (
        <div className="mb-8 animate-in delay-2 max-w-sm w-full px-4">
          <div className="bg-orange-50 border-2 border-orange-300 p-4 text-center">
            <div className="text-orange-700 text-sm font-bold mb-2">开始使用前需要配置 API Key</div>
            <p className="text-orange-600 text-xs mb-3 leading-relaxed">
              每位用户使用自己的 API Key，Key 仅保存在你的浏览器本地，安全可靠。
            </p>
            <button
              onClick={onConfigure}
              className="pixel-btn w-full h-10 bg-xhs-red text-white font-bold text-xs tracking-wider shadow-[4px_4px_0_0_#d41e3a] hover:bg-[#ff3b56]"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              立即配置 API Key
            </button>
          </div>
        </div>
      )}

      {/* 操作提示卡片 */}
      <div className="grid grid-cols-3 gap-4 max-w-md w-full animate-in delay-3">
        {[
          { step: "01", icon: "✏️", text: "输入主题", desc: "告诉我你想写什么" },
          { step: "02", icon: "⚡", text: "选风格", desc: "干货/经验/焦虑" },
          { step: "03", icon: "🎯", text: "一键生成", desc: "AI 秒出爆款文案" },
        ].map((item) => (
          <div key={item.step} className="flex flex-col items-center text-center p-3 bg-white border-2 border-[#1a1a2e] hover:border-xhs-red transition-colors">
            <span className="text-2xl mb-1.5">{item.icon}</span>
            <span className="text-xs font-bold text-[#1a1a2e] mb-0.5">{item.text}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====== 骨架屏 ======
function PreviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-[#1a1a2e] shadow-[4px_4px_0_0_#1a1a2e] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded skeleton" />
          <div className="w-24 h-3 rounded skeleton" />
        </div>
        <div className="w-3/4 h-5 rounded skeleton" />
        <div className="space-y-2.5">
          {[1,2,3,4,5].map(i => <div key={i} className={`h-3 rounded skeleton ${i === 5 ? "w-4/6" : "w-full"}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <div key={i} className="aspect-square rounded skeleton" />)}
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="w-14 h-5 rounded skeleton" />)}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2" style={{ fontFamily: "'Courier New', monospace" }}>
        <PixelSpinner /> AI 正在创作...
      </div>
    </div>
  );
}

// ====== 结果预览 ======
function PreviewResult({ result, copyText, onCopy }: { result: OutputData; copyText: string; onCopy: (t: string, l: string) => void }) {
  return (
    <div className="space-y-4">
      {result.cached && (
        <div className="bg-green-50 border-2 border-green-300 text-green-700 px-4 py-2 text-xs text-center font-medium" style={{ fontFamily: "'Courier New', monospace" }}>
          [CACHE] 使用缓存结果（1小时内）
        </div>
      )}

      {/* 小红书笔记卡片 */}
      <div className="bg-white border-2 border-[#1a1a2e] shadow-[4px_4px_0_0_#1a1a2e] overflow-hidden animate-in">
        <div className="px-4 py-3 border-b-2 border-[#1a1a2e] bg-[#fafaf8] flex items-center gap-3">
          <svg className="w-7 h-7 shrink-0" viewBox="0 0 40 40" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" fill="#ff2442" stroke="#d41e3a" strokeWidth="2" />
            <path d="M14 11h5v18h-5a2 2 0 01-2-2V13a2 2 0 012-2z" fill="white" opacity="0.95" />
            <path d="M26 11h-5v18h5a2 2 0 002-2V13a2 2 0 00-2-2z" fill="white" opacity="0.85" />
            <line x1="19" y1="11" x2="19" y2="29" stroke="white" strokeWidth="0.8" opacity="0.6" />
          </svg>
          <div>
            <div className="text-xs font-bold text-[#1a1a2e]">小红书笔记预览</div>
            <div className="text-[10px] text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>刚刚</div>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => onCopy(buildFullPost(result), "全文")}
            className="px-3 py-1 border-2 border-xhs-red text-xhs-red text-xs font-bold bg-white hover:bg-red-50 transition-colors"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {copyText === "全文" ? "[已复制]" : "[复制]"}
          </button>
        </div>

        <div className="p-5 space-y-4">
          <h2 className="text-lg font-extrabold text-[#1a1a2e] leading-snug">{result.titles[0]}</h2>
          <div className="text-sm text-[#1a1a2e] leading-[1.8] whitespace-pre-wrap">{result.post}</div>

          {/* 图片占位 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: "🖼️", label: "封面", bg: "#fef2f2" },
              { emoji: "📸", label: "图2", bg: "#f0f9ff" },
              { emoji: "🎨", label: "图3", bg: "#faf5ff" },
            ].map((img, i) => (
              <div key={i} className="aspect-square border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-xhs-red transition-colors cursor-default" style={{ backgroundColor: img.bg }}>
                <span className="text-2xl">{img.emoji}</span>
                <span className="text-[9px] text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>{img.label}</span>
              </div>
            ))}
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5">
            {result.tags.map((tag, i) => (
              <span key={i} className="text-xs text-blue-600 hover:text-xhs-red cursor-pointer transition-colors font-medium">#{tag}</span>
            ))}
          </div>

          {/* 互动栏 */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-[#1a1a2e]">
            <div className="flex items-center gap-4 text-xs text-gray-500" style={{ fontFamily: "'Courier New', monospace" }}>
              <span className="hover:text-red-400 cursor-pointer transition-colors flex items-center gap-1">
                <HeartIcon /> 128
              </span>
              <span className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-1">
                <CommentIcon /> 36
              </span>
              <span className="hover:text-yellow-500 cursor-pointer transition-colors flex items-center gap-1">
                <StarIcon /> 256
              </span>
            </div>
            <span className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors flex items-center gap-1" style={{ fontFamily: "'Courier New', monospace" }}>
              <ShareIcon /> 分享
            </span>
          </div>
        </div>
      </div>

      {/* 全部标题 */}
      <PixelSection title="全部标题" subtitle={`共${result.titles.length}个标题`} delay="delay-1" copyLabel="全部标题" copyText={copyText} onCopy={() => onCopy(result.titles.join("\n"), "全部标题")}>
        <div className="space-y-0.5">
          {result.titles.map((t, i) => (
            <div
              key={i}
              className={`group flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-all hover:bg-red-50/50 border-l-2 ${i === 0 ? "border-xhs-red bg-red-50/20" : "border-transparent hover:border-xhs-red/30"}`}
              onClick={() => onCopy(t, `标题${i + 1}`)}
              title="点击复制"
            >
              <span className={`text-[10px] font-bold mt-0.5 shrink-0 w-5 text-center`} style={{ fontFamily: "'Courier New', monospace", color: i === 0 ? "#ff2442" : "#999" }}>
                {i === 0 ? "★" : `0${i + 1}`}
              </span>
              <span className={`text-sm leading-relaxed group-hover:text-xhs-red transition-colors ${i === 0 ? "text-[#1a1a2e] font-semibold" : "text-gray-600"}`}>{t}</span>
              <span className="text-[10px] text-gray-300 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'Courier New', monospace" }}>[+]</span>
            </div>
          ))}
        </div>
      </PixelSection>

      {/* 三种开头 */}
      <PixelSection title="三种开头" subtitle="3种风格" delay="delay-2" copyLabel="全部开头" copyText={copyText} onCopy={() => onCopy(result.openings.join("\n\n"), "全部开头")}>
        <div className="space-y-3">
          {result.openings.map((opening, i) => (
            <div
              key={i}
              className="group p-3.5 cursor-pointer transition-all border-2 border-transparent hover:border-xhs-red/30 hover:shadow-[2px_2px_0_0_rgba(255,36,66,0.1)]"
              style={{ backgroundColor: ["#fef2f2", "#f0f9ff", "#faf5ff"][i] }}
              onClick={() => onCopy(opening, `开头${i + 1}`)}
              title="点击复制"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold" style={{ color: ["#d41e3a", "#3b82f6", "#8b5cf6"][i], fontFamily: "'Courier New', monospace" }}>
                  {["[焦虑]", "[经验]", "[反差]"][i]}
                </span>
                <span className="text-[10px] text-gray-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'Courier New', monospace" }}>[点击复制]</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{opening}</p>
            </div>
          ))}
        </div>
      </PixelSection>

      {/* 发布建议 */}
      <PixelSection title="发布建议" subtitle="发布策略" delay="delay-3" copyLabel="" copyText="" onCopy={() => {}}>
        <div className="space-y-0">
          <PixelRow icon="🕐" label="推荐时间" value={result.suggestion.time} />
          <PixelRow icon="🔥" label="热度预测" value={result.suggestion.heat} valueColor={result.suggestion.heat === "高" ? "text-red-500" : result.suggestion.heat === "中" ? "text-orange-500" : "text-gray-400"} />
          <PixelRow icon="👥" label="目标人群" value={result.suggestion.audience} last />
        </div>
      </PixelSection>
    </div>
  );
}

// ====== 像素分区卡片 ======
function PixelSection({ title, subtitle, children, delay, copyLabel, copyText, onCopy }: {
  title: string; subtitle?: string; children: React.ReactNode; delay: string;
  copyLabel: string; copyText: string; onCopy: () => void;
}) {
  return (
    <div className={`bg-white border-2 border-[#1a1a2e] shadow-[4px_4px_0_0_#1a1a2e] overflow-hidden animate-in ${delay}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#1a1a2e] bg-[#fafaf8]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#1a1a2e]" style={{ fontFamily: "'Courier New', monospace" }}>{title}</h3>
          {subtitle && (
            <span className="text-[9px] text-gray-400 border border-gray-300 px-1.5 py-0.5" style={{ fontFamily: "'Courier New', monospace" }}>{subtitle}</span>
          )}
        </div>
        {copyLabel && (
          <button onClick={onCopy} className="text-[10px] font-bold text-xhs-red hover:bg-red-50 px-2 py-1 border border-transparent hover:border-xhs-red transition-all" style={{ fontFamily: "'Courier New', monospace" }}>
            {copyText === copyLabel ? "[已复制]" : "[复制全部]"}
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ====== 像素建议行 ======
function PixelRow({ icon, label, value, valueColor, last }: {
  icon: string; label: string; value: string; valueColor?: string; last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 ${!last ? "border-b border-dashed border-gray-200" : ""}`}>
      <span className="text-sm text-gray-600 flex items-center gap-2">
        <span>{icon}</span>
        <span style={{ fontFamily: "'Courier New', monospace" }} className="text-xs">{label}</span>
      </span>
      <span className={`text-sm font-bold ${valueColor || "text-[#1a1a2e]"}`} style={{ fontFamily: "'Courier New', monospace" }}>{value}</span>
    </div>
  );
}

// ====== 标签输入组件 ======
function TagInput({ label, presets, value, onChange, placeholder }: {
  label: string; presets: string[]; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showInput, setShowInput] = useState(false);
  const isCustom = value && !presets.includes(value);

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-bold text-[#1a1a2e] mb-2.5" style={{ fontFamily: "'Courier New', monospace" }}>
        <PixelIcon shape="dot" /> {label} <span className="text-gray-400 text-xs font-normal">(可选)</span>
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {presets.map((item) => (
          <button
            key={item}
            onClick={() => { onChange(value === item ? "" : item); setShowInput(false); }}
            className={`px-3 py-1.5 text-xs font-medium transition-all border-2 ${
              value === item
                ? "bg-xhs-red text-white border-xhs-red shadow-[2px_2px_0_0_#d41e3a]"
                : "bg-white text-gray-600 border-[#1a1a2e] hover:border-xhs-red hover:text-xhs-red"
            }`}
          >
            {item}
          </button>
        ))}
        <button
          onClick={() => {
            setShowInput(!showInput);
            if (showInput) onChange("");
            else setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className={`px-3 py-1.5 text-xs font-medium transition-all border-2 ${
            showInput || isCustom
              ? "bg-[#1a1a2e] text-white border-[#1a1a2e] shadow-[2px_2px_0_0_#555]"
              : "bg-white text-gray-500 border-[#1a1a2e] border-dashed hover:border-solid hover:text-[#1a1a2e]"
          }`}
        >
          {showInput || isCustom ? "✎ 自定义" : "+ 自定义"}
        </button>
      </div>
      {(showInput || isCustom) && (
        <input
          ref={inputRef}
          type="text"
          value={isCustom ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-[#fafaf8] border-2 border-[#1a1a2e] text-sm placeholder:text-gray-400 text-[#1a1a2e] focus:outline-none focus:border-xhs-red focus:shadow-[2px_2px_0_0_#ff2442] transition-all"
          maxLength={20}
          onBlur={() => { if (!value) setShowInput(false); }}
        />
      )}
    </div>
  );
}

// ====== SVG 图标 ======
function HeartIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 14S1.5 9.5 1.5 5.5A3.5 3.5 0 018 3.5a3.5 3.5 0 016.5 2C14.5 9.5 8 14 8 14z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3h12v8H5.5L3 13.5V3z" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5l1.8 4.2 4.5.5-3.3 3 .9 4.3L8 11.5 4.1 13.5l.9-4.3-3.3-3 4.5-.5L8 1.5z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="3.5" cy="8" r="2" /><circle cx="12.5" cy="3" r="2" /><circle cx="12.5" cy="13" r="2" />
      <path d="M5.5 7l5-3M5.5 9l5 3" />
    </svg>
  );
}

function buildFullPost(data: OutputData): string {
  return `${data.titles[0]}\n\n${data.post}\n\n${data.tags.map((t) => `#${t}`).join(" ")}`;
}