import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI小红书文案生成器",
  description: "输入主题，一键生成小红书爆款文案",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-xhs-bg min-h-screen antialiased">{children}</body>
    </html>
  );
}