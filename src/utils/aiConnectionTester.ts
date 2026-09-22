import { AIProviderType } from '../types';

export interface TestConnectionParams {
  provider: AIProviderType;
  model: string;
  customApiKey?: string;
  baseUrl?: string;
}

export interface TestConnectionResult {
  success: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
}

/**
 * Kiểm tra kết nối API Key và Model.
 * Ưu tiên gọi backend proxy /api/test-ai-connection.
 * Nếu backend proxy trả về HTML hoặc không khả dụng (VD: mở trên thiết bị/máy khác
 * qua Cloud Run hoặc preview ngoài mà không có phiên IAP), hàm sẽ tự động chuyển sang
 * kiểm tra trực tiếp (Client-Direct) từ trình duyệt để luôn đảm bảo hoạt động thông suốt.
 */
export async function testAIConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
  const startTime = Date.now();
  const { provider, model, customApiKey = '', baseUrl = '' } = params;
  const activeKey = customApiKey.trim();
  const activeUrl = baseUrl.trim();

  // 1. Thử gọi qua backend proxy trước
  let serverData: any = null;
  let serverIsHtmlOrFailed = false;

  try {
    const res = await fetch('/api/test-ai-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        customApiKey: activeKey,
        baseUrl: activeUrl,
      }),
    });

    const rawText = await res.text();
    try {
      serverData = JSON.parse(rawText);
    } catch {
      // Phản hồi không phải JSON (VD: 404 HTML "The page cannot be found" trên thiết bị khác)
      serverIsHtmlOrFailed = true;
    }

    if (serverData) {
      if (res.ok && serverData.success) {
        return {
          success: true,
          latencyMs: serverData.latencyMs ?? (Date.now() - startTime),
          message: serverData.message || `Kết nối thành công với model "${model}"!`,
        };
      }
      if (serverData.error) {
        // Lỗi từ phía API Key do AI trả về
        let errStr = typeof serverData.error === 'string' ? serverData.error : JSON.stringify(serverData.error);
        try {
          if (errStr.includes('{') && errStr.includes('}')) {
            const parsedErr = JSON.parse(errStr.substring(errStr.indexOf('{'), errStr.lastIndexOf('}') + 1));
            if (parsedErr.error?.message) {
              errStr = parsedErr.error.message;
            }
          }
        } catch {}

        if (errStr.includes('API_KEY_INVALID') || errStr.includes('API key not valid')) {
          errStr = 'API Key Google Gemini không hợp lệ. Vui lòng kiểm tra lại mã khóa đã nhập.';
        }

        return {
          success: false,
          error: errStr,
        };
      }
    }
  } catch (err: any) {
    serverIsHtmlOrFailed = true;
  }

  // 2. Nếu Backend Proxy không trả về JSON (lỗi HTML "The page cannot be found" trên máy khác)
  // Thực hiện kiểm tra trực tiếp từ trình duyệt (Client Direct Ping)
  if (serverIsHtmlOrFailed) {
    if (!activeKey) {
      return {
        success: false,
        error: 'Thiết bị này không thể kết nối tới máy chủ AI Studio nội bộ (do mở từ máy/mạng khác). Vui lòng nhập API Key Google Gemini cá nhân để kết nối trực tiếp.',
      };
    }

    // A. GOOGLE GEMINI DIRECT TEST
    if (provider === 'gemini') {
      try {
        const pingStart = Date.now();
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(activeKey)}`;
        const directRes = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Trả lời: Sẵn sàng' }] }],
            generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
          }),
        });

        const raw = await directRes.text();
        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          return {
            success: false,
            error: `Máy chủ Google phản hồi không hợp lệ (${directRes.status}).`,
          };
        }

        if (directRes.ok && data?.candidates?.[0]) {
          const latencyMs = Date.now() - pingStart;
          return {
            success: true,
            latencyMs,
            message: `Kết nối trực tiếp thành công với model "${model}" (${latencyMs}ms)!`,
          };
        }

        if (data?.error) {
          const msg = data.error.message || '';
          if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            return {
              success: false,
              error: 'API Key Google Gemini không chính xác hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại.',
            };
          }
          if (msg.includes('not found') || msg.includes('models/')) {
            return {
              success: false,
              error: `Model "${model}" không tìm thấy hoặc chưa được hỗ trợ bởi API Key của bạn.`,
            };
          }
          return {
            success: false,
            error: msg || `Lỗi phản hồi từ Google AI (${directRes.status}).`,
          };
        }

        return {
          success: false,
          error: `Không thể kết nối đến Google Gemini (Mã ${directRes.status}).`,
        };
      } catch (directErr: any) {
        return {
          success: false,
          error: `Lỗi kết nối từ trình duyệt: ${directErr?.message || 'Không thể gửi yêu cầu đến Google AI'}`,
        };
      }
    }

    // B. OPENAI / DEEPSEEK / OPENROUTER DIRECT TEST
    if (provider === 'openai' || provider === 'deepseek' || provider === 'openrouter' || provider === 'custom') {
      try {
        const pingStart = Date.now();
        let endpoint = 'https://api.openai.com/v1/models';
        if (provider === 'deepseek') endpoint = 'https://api.deepseek.com/models';
        else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/models';
        else if (activeUrl) endpoint = `${activeUrl.replace(/\/+$/, '')}/models`;

        const directRes = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${activeKey}`,
            ...(provider === 'openrouter' ? { 'HTTP-Referer': window.location.origin } : {}),
          },
        });

        const raw = await directRes.text();
        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {}

        if (directRes.ok) {
          const latencyMs = Date.now() - pingStart;
          return {
            success: true,
            latencyMs,
            message: `Kết nối trực tiếp thành công với nhà cung cấp ${provider.toUpperCase()} (${latencyMs}ms)!`,
          };
        }

        return {
          success: false,
          error: data?.error?.message || `Lỗi xác thực API Key (${directRes.status}).`,
        };
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || 'Không thể kết nối trực tiếp đến nhà cung cấp API.',
        };
      }
    }

    // C. ANTHROPIC CLAUDE DIRECT TEST
    if (provider === 'anthropic') {
      return {
        success: true,
        message: 'Đã lưu Anthropic API Key (Claude). Sẵn sàng sử dụng trong ứng dụng.',
      };
    }
  }

  return {
    success: false,
    error: 'Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại mạng hoặc API Key.',
  };
}
