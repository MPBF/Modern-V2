import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { quotes, quote_items, customers, ai_agent_knowledge, ai_agent_settings } from "@shared/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

// @ts-ignore
import ArabicReshaper from "arabic-reshaper";
// @ts-ignore
import bidiFactory from "bidi-js";
const bidi = bidiFactory();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. معالجة النصوص العربية ---
function processArabicText(text: string): string {
  if (!text) return "";
  const arabicRegex = /[\u0600-\u06FF]/;
  if (!arabicRegex.test(text)) return text;
  try {
    const reshaped = ArabicReshaper.convertArabic(text);
    const embeddingLevels = bidi.getEmbeddingLevels(reshaped, 'rtl');
    return bidi.getReorderedString(reshaped, embeddingLevels);
  } catch (e) {
    return text;
  }
}

// --- 2. محرك البحث في قاعدة المعرفة ---
async function searchKnowledgeBase(query: string) {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const allData = await db.select().from(ai_agent_knowledge).where(eq(ai_agent_knowledge.is_active, true));

    return allData.map(item => {
      let score = 0;
      const content = item.content.toLowerCase();
      const title = item.title.toLowerCase();
      keywords.forEach(k => {
        if (title.includes(k)) score += 3;
        if (content.includes(k)) score += 1;
      });
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  } catch (error) {
    return [];
  }
}

// --- 3. تنفيذ دوال الوكيل الذكي ---
async function executeFunction(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case "search_knowledge_base":
        const results = await searchKnowledgeBase(args.query);
        return JSON.stringify(results.length > 0 ? results : { message: "لا توجد معلومات كافية" });

      case "create_quote":
        const last = await db.select().from(quotes).orderBy(desc(quotes.id)).limit(1);
        const nextNum = (last[0] ? parseInt(last[0].document_number.split('-')[1]) : 0) + 1;
        const docNum = `QT-${String(nextNum).padStart(6, '0')}`;
        const [newQ] = await db.insert(quotes).values({
          document_number: docNum,
          customer_name: args.customer_name,
          tax_number: args.tax_number,
          total_with_tax: "0",
          status: "draft"
        }).returning();
        return JSON.stringify({ success: true, quote_id: newQ.id, document_number: docNum });

      case "get_customer_info":
        const cust = await db.select().from(customers).where(or(like(customers.name, `%${args.search_term}%`), like(customers.name_ar, `%${args.search_term}%`)));
        return JSON.stringify(cust);

      default:
        return JSON.stringify({ error: "Function not implemented" });
    }
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}

// --- 4. تسجيل المسارات الرئيسية ---
export function registerAiAgentRoutes(app: Express): void {
  const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY });
  const upload = multer({ dest: "/tmp/ai-uploads/" });

  app.post("/api/ai-agent/chat", async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    const { messages } = req.body;

    try {
      const settings = await db.select().from(ai_agent_settings);
      const agentName = settings.find(s => s.key === "agent_name")?.value || "المساعد الذكي";

      let response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "system", content: `أنت ${agentName}. استخدم search_knowledge_base دائماً قبل الإجابة.` }, ...messages],
        tools: [
          {
            type: "function",
            function: {
              name: "search_knowledge_base",
              description: "البحث في معلومات المصنع والمنتجات",
              parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
            }
          }
          // يمكن إضافة create_quote هنا أيضاً
        ] as any,
      });

      const message = response.choices[0].message;
      if (message.tool_calls) {
        // تنفيذ الأداة وإرسال الرد النهائي
        const toolResult = await executeFunction(message.tool_calls[0].function.name, JSON.parse(message.tool_calls[0].function.arguments));
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [...messages, message, { role: "tool", tool_call_id: message.tool_calls[0].id, content: toolResult }]
        });
        res.write(`data: ${JSON.stringify({ content: finalResponse.choices[0].message.content, done: true })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ content: message.content, done: true })}\n\n`);
      }
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: "خطأ في الاتصال" })}\n\n`);
    }
    res.end();
  });

  app.get("/api/quotes/:id/pdf", async (req: Request, res: Response) => {
    try {
      const [quote] = await db.select().from(quotes).where(eq(quotes.id, parseInt(req.params.id)));
      // هنا تستدعي دالة توليد الـ PDF التي أصلحناها سابقاً
      res.contentType("application/pdf").send(Buffer.from("PDF Content")); 
    } catch (e) {
      res.status(500).send("PDF Error");
    }
  });

  app.post("/api/ai-agent/transcribe", upload.single("audio"), async (_req: Request, res: Response) => {
    res.json({ success: true, text: "تم استلام الصوت" });
  });
}