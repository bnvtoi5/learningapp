import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Mascot Chat API Endpoint (Multi-Provider: Gemini, OpenAI, Claude, DeepSeek, OpenRouter)
  app.post("/api/mascot-chat", async (req, res) => {
    try {
      const { 
        message, 
        history = [], 
        systemInstruction, 
        customApiKey, 
        quotedMessage,
        mascotId,
        provider = "gemini",
        model,
        baseUrl,
        attachment
      } = req.body;

      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Nội dung tin nhắn không được để trống." });
      }

      // Build current user message with quoted message context if present
      let currentPrompt = message.trim();
      if (quotedMessage && quotedMessage.text) {
        const quotedAuthor = quotedMessage.sender === "user" ? "Người dùng" : "Bạn (Linh vật)";
        currentPrompt = `[TRÍCH DẪN ĐANG ĐƯỢC TRẢ LỜI TỪ (${quotedAuthor}): "${quotedMessage.text}"]\n\nPhản hồi / câu hỏi trực tiếp của người dùng:\n${currentPrompt}`;
      }

      const defaultSystemPrompt = systemInstruction || "Bạn là một trợ lý học tập thông minh, sắc sảo, tự nhiên và thân thiện.";

      // 1. Xử lý Google Gemini Provider
      if (provider === "gemini") {
        const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
          ? customApiKey.trim()
          : (process.env.GEMINI_API_KEY || "");

        if (!apiKey) {
          return res.status(400).json({ 
            error: "Vui lòng bấm 'Mô hình' (hoặc 'Thiết lập API & Mô hình') và nhập API Key Google Gemini của bạn để trò chuyện." 
          });
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });

        const contents: Array<{ role: "user" | "model"; parts: any[] }> = [];
        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-8);
          for (const item of recentHistory) {
            if (item && (item.sender === "user" || item.sender === "mascot") && item.text) {
              contents.push({
                role: item.sender === "user" ? "user" : "model",
                parts: [{ text: String(item.text) }],
              });
            }
          }
        }

        const userParts: any[] = [{ text: currentPrompt }];
        if (attachment && attachment.dataUrl) {
          if (attachment.type === "image") {
            const match = String(attachment.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              userParts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          } else if (attachment.textContent) {
            userParts.push({
              text: `\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`,
            });
          }
        }

        contents.push({
          role: "user",
          parts: userParts,
        });

        let replyText = "";
        let successfulModel = "";
        const requestedModel = model?.trim() || "gemini-3.8-flash";
        const clientFallbacks = Array.isArray(req.body.fallbackModels) ? req.body.fallbackModels.filter(Boolean) : [];

        // Thứ tự ưu tiên đa tầng phong phú:
        // 1. Model chính người dùng yêu cầu (VD: gemini-3.8-flash)
        // 2. Danh sách mô hình đề xuất fallback từ client
        // 3. gemini-3.1-flash-lite (Mô hình siêu nhẹ, độ trễ cực thấp, chống nghẽn 503)
        // 4. gemini-flash-latest (Bản Flash chuẩn ổn định toàn cầu)
        // 5. gemini-3.1-pro-preview (Bản tư duy chuyên sâu)
        // 6. gemini-3.8-flash
        const fallbackCandidates = [
          requestedModel,
          ...clientFallbacks,
          "gemini-3.1-flash-lite",
          "gemini-flash-latest",
          "gemini-3.1-pro-preview",
          "gemini-3.8-flash",
        ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

        let lastErrorMsg = "";

        for (const candidateModel of fallbackCandidates) {
          try {
            // Giới hạn timeout 6.5 giây cho mỗi ứng viên để tránh tình trạng Google bị đơ gây lag chờ đợi
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Timeout on ${candidateModel}`)), 6500);
            });

            const callPromise = ai.models.generateContent({
              model: candidateModel,
              contents,
              config: {
                systemInstruction: defaultSystemPrompt,
                temperature: 0.7,
                maxOutputTokens: 1500,
              },
            });

            const response = await Promise.race([callPromise, timeoutPromise]);
            const text = response?.text || "";
            if (text.trim()) {
              replyText = text.trim();
              successfulModel = candidateModel;
              console.log(`[AI Thành Công] Đã trả lời bằng model: ${candidateModel}`);
              break;
            }
          } catch (err: any) {
            lastErrorMsg = String(err?.message || "");
            console.warn(`[Auto-Fallback] Model ${candidateModel} gặp sự cố, tự động chuyển sang model tiếp theo:`, lastErrorMsg);
            // Nếu lỗi là API KEY không hợp lệ, không cần thử tiếp các model khác vì key đã sai
            if (lastErrorMsg.includes("API_KEY_INVALID") || lastErrorMsg.includes("API key not valid")) {
              return res.status(400).json({
                error: "API Key Gemini không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong phần Thiết lập API & Mô hình.",
              });
            }
            // Ngược lại (503 UNAVAILABLE, 404, Timeout...) tự động chuyển ngay sang candidate tiếp theo
          }
        }

        if (!replyText.trim()) {
          let errorMsg = lastErrorMsg;
          if (errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("Timeout")) {
            errorMsg = "Máy chủ AI hiện đang chịu tải cao tạm thời. Bạn vui lòng thử lại sau vài giây hoặc đổi sang mô hình khác nhé.";
          }
          return res.status(500).json({ error: errorMsg || "Không nhận được phản hồi từ AI." });
        }

        return res.json({ reply: replyText, actualModel: successfulModel });
      }

      // 2. Xử lý Anthropic Claude Provider
      if (provider === "anthropic") {
        const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
          ? customApiKey.trim()
          : process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
          return res.status(400).json({ 
            error: "Chưa có Anthropic Claude API Key. Vui lòng bấm vào nút chọn mô hình và nhập khóa API của bạn (bắt đầu bằng sk-ant-...)." 
          });
        }

        const claudeMessages: Array<{ role: "user" | "assistant"; content: any }> = [];
        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-10);
          for (const item of recentHistory) {
            if (item && (item.sender === "user" || item.sender === "mascot") && item.text) {
              claudeMessages.push({
                role: item.sender === "user" ? "user" : "assistant",
                content: String(item.text),
              });
            }
          }
        }

        let claudeUserContent: any = currentPrompt;
        if (attachment && attachment.dataUrl) {
          if (attachment.type === "image") {
            const match = String(attachment.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              claudeUserContent = [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: match[1],
                    data: match[2],
                  },
                },
                {
                  type: "text",
                  text: currentPrompt,
                },
              ];
            }
          } else if (attachment.textContent) {
            claudeUserContent = `${currentPrompt}\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`;
          }
        }
        claudeMessages.push({ role: "user", content: claudeUserContent });

        const claudeModel = model?.trim() || "claude-opus-4-8";

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: claudeModel,
            system: defaultSystemPrompt,
            messages: claudeMessages,
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });

        const data: any = await resp.json();
        if (!resp.ok || data.error) {
          const errText = data.error?.message || "Lỗi kết nối máy chủ Claude";
          return res.status(resp.status || 500).json({ error: `Anthropic Claude: ${errText}` });
        }

        const replyText = data?.content?.[0]?.text || "Không nhận được phản hồi từ Claude";
        return res.json({ reply: replyText });
      }

      // 3. Xử lý OpenAI / DeepSeek / OpenRouter / Custom (Chuẩn OpenAI Chat Completions)
      const isDeepSeek = provider === "deepseek";
      const isOpenRouter = provider === "openrouter";
      
      let defaultUrl = "https://api.openai.com/v1";
      let envKey = process.env.OPENAI_API_KEY;

      if (isDeepSeek) {
        defaultUrl = "https://api.deepseek.com/v1";
        envKey = process.env.DEEPSEEK_API_KEY;
      } else if (isOpenRouter) {
        defaultUrl = "https://openrouter.ai/api/v1";
        envKey = process.env.OPENROUTER_API_KEY;
      }

      const resolvedBaseUrl = (baseUrl && typeof baseUrl === "string" && baseUrl.trim().length > 0)
        ? baseUrl.trim().replace(/\/+$/, "")
        : defaultUrl;

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : envKey;

      if (!apiKey) {
        const providerName = isDeepSeek ? "DeepSeek" : isOpenRouter ? "OpenRouter" : "OpenAI";
        return res.status(400).json({ 
          error: `Chưa có API Key cho ${providerName}. Vui lòng bấm vào nút chọn mô hình và nhập API Key cá nhân của bạn.` 
        });
      }

      const openAiMessages: Array<{ role: "system" | "user" | "assistant"; content: any }> = [
        { role: "system", content: defaultSystemPrompt }
      ];

      if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-10);
        for (const item of recentHistory) {
          if (item && (item.sender === "user" || item.sender === "mascot") && item.text) {
            openAiMessages.push({
              role: item.sender === "user" ? "user" : "assistant",
              content: String(item.text),
            });
          }
        }
      }

      let openAiUserContent: any = currentPrompt;
      if (attachment && attachment.dataUrl) {
        if (attachment.type === "image") {
          openAiUserContent = [
            { type: "text", text: currentPrompt },
            { type: "image_url", image_url: { url: attachment.dataUrl } },
          ];
        } else if (attachment.textContent) {
          openAiUserContent = `${currentPrompt}\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`;
        }
      }
      openAiMessages.push({ role: "user", content: openAiUserContent });

      let defaultTargetModel = "gpt-5.6-sol";
      if (isDeepSeek) defaultTargetModel = "deepseek-flash";
      else if (isOpenRouter) defaultTargetModel = "openai/gpt-5.6-sol";

      const targetModel = model?.trim() || defaultTargetModel;

      const resp = await fetch(`${resolvedBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: openAiMessages,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      const data: any = await resp.json();
      if (!resp.ok || data.error) {
        const errText = data.error?.message || (typeof data.error === "string" ? data.error : "Lỗi kết nối API");
        return res.status(resp.status || 500).json({ error: `API (${targetModel}): ${errText}` });
      }

      const replyText = data?.choices?.[0]?.message?.content || "Không có phản hồi từ máy chủ AI";
      return res.json({ reply: replyText });

    } catch (error: any) {
      console.error("Lỗi Mascot Chat:", error);
      let errorMessage = error?.message || "Đã xảy ra sự cố khi trao đổi với trợ lý AI.";
      return res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
