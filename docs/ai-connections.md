# AI connections

Choose a provider in onboarding or Settings → AI & connections. Enable sharing only after reviewing what information the task needs. Connect through the provider's own sign-in, then run Test connection. The application records verification only after an actual completed AI response.

## ChatGPT

The open-source local-client flow requests permission to use an eligible ChatGPT plan. It uses dynamic client registration, a stable local host ID, PKCE, state and nonce, signed ID-token validation, current account model discovery and the public Responses API with store=false and stream=true. It does not collect ChatGPT passwords or session cookies, and cannot read prior ChatGPT conversations through that flow. Account eligibility, model/tool availability and usage limits are controlled by OpenAI.

## Claude

Desktop packages include the official unmodified Claude Code binary and its licence. Sign-in happens through its own auth login flow. The application checks subscription authentication before execution. API-key and third-party billing configurations are not accepted as an automatic fallback. Tasks run without shell tools, unrelated MCP servers or project/user hooks. A PDF import may permit the helper to read only its isolated task directory; the directory is removed after completion.

## Conversations

Install the local conversation connector from Settings in the installed application. It adds only Career Workshop's named connection, preserving unrelated provider settings. Restart the AI desktop client. Ask it to read career_contract and the current profile. Use a dedicated career project with the downloadable project guide. Connection configuration and an actual successful tool call are different checks.

Browser-only chats cannot directly reach a standard-I/O server on a personal computer. Use a compatible desktop client for local access, a supported remote connection, or a deliberate file handoff. MCP compatibility alone does not grant app-initiated inference or subscription access.

## Cost and privacy

Included usage is shared with other use of the provider account. The app does not enable API billing or purchase credits. Disable paid extra usage in the provider's account settings if enabled there. Subscription exhaustion stops work or returns a clear failure. Other providers are added only when their permitted authentication, client transport and execution capabilities are verified.

Official references: https://developers.openai.com/siwc/token-sharing-open-source and https://code.claude.com/docs/en/legal-and-compliance.
