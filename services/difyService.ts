import { API_BASE_URL, DIFY_APPS } from '../config';

interface DifyWorkflowResponse {
  log_id: string;
  task_id: string;
  data: {
    id: string;
    workflow_id: string;
    status: string; // 'succeeded' | 'failed'
    outputs: any; // The actual result is here
    error: any;
    elapsed_time: number;
    total_tokens: number;
    created_at: number;
    finished_at: number;
  };
}

/**
 * 运行 Dify 工作流 (通用版)
 * Endpoint: /workflows/run
 * 适用于: 风险预测, 方案定制, 数据管理等 Workflow 类型应用
 */
export const runDifyWorkflow = async (
  app: string,
  inputs: Record<string, any> = {},
  userId: string = 'user-123'
): Promise<any> => {
  try {
    const url = `${API_BASE_URL}/workflows/run`;
    console.log(`[Dify] Calling Workflow: ${url} app=${app}`);
    
    // Workflow 通常支持 blocking 模式
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app,
        inputs: inputs,
        response_mode: 'blocking',
        user: userId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Dify] Workflow API Error (${response.status}):`, errText);
      throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const json: DifyWorkflowResponse = await response.json();
    
    if (json.data.status !== 'succeeded') {
      console.error('[Dify] Workflow Logical Error:', json.data.error);
      throw new Error(`Workflow Failed: ${JSON.stringify(json.data.error)}`);
    }

    return json.data.outputs;

  } catch (error) {
    console.error('[Dify] Workflow Call Failed:', error);
    throw error;
  }
};

/**
 * 发送 Dify 聊天消息 (Chat Bot / Agent)
 * 修复说明：
 * Agent 类型的应用强制要求 streaming 模式，不支持 blocking。
 * 此函数现在发送 streaming 请求，并读取完整流数据后拼接返回。
 * Endpoint: /chat-messages
 */
export const sendDifyMessage = async (
  app: string,
  query: string,
  inputs: Record<string, any> = {},
  userId: string = 'user-123',
  conversationId: string = ''
): Promise<{ text: string; conversationId: string }> => {
  try {
    const url = `${API_BASE_URL}/chat-messages`;
    console.log(`[Dify] Calling Chat (Streaming Mode): ${url} app=${app}`);

    const body: any = {
      app,
      inputs,
      query,
      // ！！！关键修改！！！：强制改为 'streaming' 以修复 400 Agent error
      response_mode: 'streaming', 
      user: userId,
    };
    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Dify] Chat API Error (${response.status}):`, errText);
      throw new Error(`Server Error (${response.status}): ${errText}`);
    }

    // 处理流式响应 (Server-Sent Events)
    if (!response.body) {
      throw new Error("No response body received");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullAnswer = "";
    let finalConversationId = conversationId;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 解码当前 chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Dify 的流数据格式是 data: {...}\n\n
      // 我们需要按行分割并解析
      const lines = buffer.split("\n");
      // 保留最后一个可能不完整的片段在 buffer 中，其他的进行处理
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;
        
        const jsonStr = trimmedLine.slice(6); // 去掉 "data: "
        
        if (jsonStr === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonStr);
          
          // 拼接答案 
          // 普通 Chat 返回 event: "message"
          // Agent 有时返回 event: "agent_message" 或 "message"
          if (data.event === "message" || data.event === "agent_message") {
            fullAnswer += data.answer;
          }
          
          // 更新 conversation_id
          if (data.conversation_id) {
            finalConversationId = data.conversation_id;
          }
        } catch (e) {
          console.warn("Error parsing stream JSON chunk", e);
        }
      }
    }

    // 处理剩余的 buffer (通常是空的或者 [DONE])
    if (buffer.startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
        try {
            const data = JSON.parse(buffer.slice(6));
             if (data.event === "message" || data.event === "agent_message") {
              fullAnswer += data.answer;
            }
        } catch(e) {}
    }

    return {
      text: fullAnswer,
      conversationId: finalConversationId
    };

  } catch (error) {
    console.error('[Dify] Chat API Call Failed:', error);
    throw error;
  }
};

/**
 * 调用数据管理工作流获取数据库信息
 */
export const fetchDataFromManagement = async (intention: string, userId: string = 'guest') => {
  try {
    // 调用 workflow
    const outputs = await runDifyWorkflow(
      DIFY_APPS.DATA_MGMT,
      { intention: intention },
      userId
    );
    
    // 后端工作流返回的数据通常在 outputs.text 或 outputs.result 中
    let rawData = outputs.text || outputs.result || outputs.body || outputs;
    
    // 如果返回的是 JSON 字符串，解析它
    if (typeof rawData === 'string') {
      if (rawData.includes('```json')) {
        rawData = rawData.replace(/```json/g, '').replace(/```/g, '');
      }
      try {
        return JSON.parse(rawData);
      } catch (e) {
        console.warn("[Dify] Could not parse JSON from data management, returning raw text", e);
        return rawData;
      }
    }
    return rawData;
  } catch (error) {
    console.warn("[Dify] Fetch Data Management Failed (Using Mock Fallback):", error);
    return null;
  }
};
