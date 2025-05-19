import { readFileSync } from "node:fs";
import consola from "consola";
import type { Message } from "~/services/copilot/create-chat-completions";

/**
 * 處理單一訊息中的內容，包括檔案路徑解析和內容格式轉換
 */
export function processSingleMessageContent(message: Message, messageIndex?: number): Message {
    const logPrefix = messageIndex !== undefined ? `Message ${messageIndex}: ` : "Message: ";
    consola.log(`${logPrefix}Processing message content...`);

    if (typeof message.content === "string") {
        // 如果 content 是字串，檢查是否包含檔案路徑標記
        const filePathMarker = "file_path:";
        if (message.content.includes(filePathMarker)) {
            try {
                // 假設 content 中包含 "file_path:/path/to/file" 格式
                const filePathStart = message.content.indexOf(filePathMarker) + filePathMarker.length;
                // 確保 filePathEnd 正確處理末尾無換行符的情況
                let filePathEnd = message.content.indexOf("\n", filePathStart);
                if (filePathEnd === -1) {
                    filePathEnd = message.content.length;
                }
                const filePath = message.content.slice(filePathStart, filePathEnd).trim();

                // 檢查檔案路徑是否為空
                if (!filePath) {
                    consola.warn(`${logPrefix}Empty file path provided after marker.`);
                    return {
                        ...message,
                        content: `${message.content}\nError: Empty file path provided.`
                    };
                }

                const fileContent = readFileSync(filePath, "utf-8");
                // 確保替換的切片是正確的
                const contentToReplace = message.content.slice(message.content.indexOf(filePathMarker), filePathEnd);
                const updatedContent = message.content.replace(
                    contentToReplace,
                    `File content:\n${fileContent}`
                );
                consola.log(`${logPrefix}File content loaded from ${filePath}.`);
                return {
                    ...message,
                    content: updatedContent
                };
            } catch (error: any) {
                consola.error(`${logPrefix}Failed to read file:`, error.message);
                return {
                    ...message,
                    content: `${message.content}\nError: Unable to read file content. Details: ${error.message}`
                };
            }
        }
        // 純文本，未包含檔案路徑，直接返回
        consola.log(`${logPrefix}Content is already a string.`);
        return message;
    } else {
        // 如果遇到非字符串類型，記錄警告並嘗試轉換
        consola.warn(`${logPrefix}Unexpected content type: ${typeof message.content}. Converting to string if possible.`);

        // 安全轉換邏輯
        try {
            if (Array.isArray(message.content)) {
                // 處理數組類型 (假設可能是 OpenAI 多模態格式)
                let textContent = "";

                // @ts-ignore - 處理可能的多模態內容
                message.content.forEach((item: any) => {
                    if (item.type === "text" && item.text) {
                        textContent += item.text + "\n";
                    } else if (item.type === "image_url" && item.image_url?.url) {
                        textContent += `[Image: ${item.image_url.url}]\n`;
                    }
                });

                return {
                    ...message,
                    content: textContent || "Empty content after conversion."
                };
            } else {
                // 其他類型嘗試字符串化
                return {
                    ...message,
                    content: String(message.content || "")
                };
            }
        } catch (error) {
            consola.error(`${logPrefix}Failed to convert content:`, error);
            return {
                ...message,
                content: "Error: Unable to process message content."
            };
        }
    }
}

/**
 * 處理所有訊息的內容
 */
export function processMessages(messages: Message[]): Message[] {
    consola.log("Processing messages...");
    return messages.map((msg, index) => {
        return processSingleMessageContent(msg, index);
    });
}