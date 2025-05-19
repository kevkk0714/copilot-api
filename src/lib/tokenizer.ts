import { countTokens } from "gpt-tokenizer/model/gpt-4o"

import type { Message } from "~/services/copilot/create-chat-completions"
import consola from "consola"

export const getTokenCount = (messages: Array<Message>) => {
  try {
    // 確保所有訊息的 content 都是字串
    const validMessages = messages.map(message => {
      if (typeof message.content !== "string") {
        consola.warn(`Tokenizer - Non-string content found in message with role ${message.role}, converting.`);
        try {
          // @ts-ignore - 處理可能的多模態內容
          if (Array.isArray(message.content)) {
            let textContent = "";
            // @ts-ignore - 處理陣列格式
            message.content.forEach((item: any) => {
              if (item.type === "text" && item.text) {
                textContent += item.text + "\n";
              }
            });
            return {
              ...message,
              content: textContent || "Empty content after conversion."
            };
          }
          // 處理其他非字串類型
          return {
            ...message,
            content: String(message.content || "")
          };
        } catch (e) {
          return {
            ...message,
            content: "Error: Unable to process message content for token counting."
          };
        }
      }
      return message;
    });

    const input = validMessages.filter(m => m.role !== "assistant");
    const output = validMessages.filter(m => m.role === "assistant");

    const inputTokens = countTokens(input);
    const outputTokens = countTokens(output);

    return {
      input: inputTokens,
      output: outputTokens,
    }
  } catch (error) {
    consola.error("Error counting tokens:", error);
    // 返回預設值，避免中斷流程
    return {
      input: 0,
      output: 0,
    }
  }
}