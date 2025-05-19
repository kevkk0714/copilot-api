import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

import consola from "consola"

import { HTTPError } from "./http-error"

export async function forwardError(c: Context, error: unknown) {
    consola.error("Error occurred:", error)

    if (error instanceof HTTPError) {
        try {
            // 檢查 response 是否已被消費
            const clonedResponse = error.response.clone();

            let errorMessage: string;
            try {
                // 嘗試讀取錯誤內容
                errorMessage = await clonedResponse.text();
            } catch (textError) {
                // 如果無法讀取 response.text()，使用錯誤的 message 屬性
                consola.warn("Could not read response body:", textError);
                errorMessage = error.message || "Unknown error";
            }

            // 返回錯誤 JSON
            return c.json(
                {
                    error: {
                        message: errorMessage,
                        type: "error",
                        status: error.response.status,
                        statusText: error.response.statusText
                    },
                },
                error.response.status as ContentfulStatusCode,
            );
        } catch (responseError) {
            consola.error("Error handling HTTPError:", responseError);
            // 如果處理 HTTPError 時出錯，回退到基本錯誤訊息
            return c.json(
                {
                    error: {
                        message: error.message || "Error processing request",
                        type: "error",
                    },
                },
                500,
            );
        }
    }

    // 處理一般錯誤
    return c.json(
        {
            error: {
                message: (error as Error).message || "Unknown error",
                type: "error",
            },
        },
        500,
    );
}