import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CASE_LAW_GUIDANCE = `Legal Education & Case Law Citation Guidelines:

When explaining legal concepts, follow these rules:
1. Reference real, well-known state and federal case law when relevant.
2. Cite specific cases by name and year (e.g., "Miranda v. Arizona, 384 U.S. 436 (1966)").
3. Explain the holding in plain English — what the court decided and why it matters.
4. Note jurisdiction (state or federal circuit) so users understand the geographic scope.
5. If citing a state case, mention which state's law it represents.
6. Distinguish between binding precedent and persuasive authority.
7. Never fabricate cases — only cite well-established, verifiable case law.
8. If unsure about a specific case citation, explain the general legal principle without a fake citation.

Examples of good case law references:
- For search and seizure: "Under Terry v. Ohio, 392 U.S. 1 (1968), police may conduct a brief stop-and-frisk if they have reasonable suspicion..."
- For contract disputes: "As explained in Lucy v. Zehmer, 196 Va. 493 (1954), a contract requires a meeting of the minds..."
- For negligence: "The elements of negligence were established in Donoghue v. Stevenson [1932] AC 562..."

Never provide legal advice. Always include: "This is legal education, not legal advice. Consult a licensed attorney for your specific situation."`;

export async function askAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "AI analysis is currently unavailable. Please try again later.";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.3,
        topP: 0.95,
      },
    });

    // Convert messages to Gemini format
    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const systemPrompt = [CASE_LAW_GUIDANCE, ...systemMessages.map((m) => m.content)].join("\n\n---\n\n");

    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
      history,
    });

    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "An error occurred while analyzing. Please try again. This is legal education, not legal advice.";
  }
}

export async function askAIStreaming(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onChunk: (chunk: string) => void,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!GEMINI_API_KEY) {
    onChunk("AI analysis is currently unavailable.");
    return "";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.3,
        topP: 0.95,
      },
    });

    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const systemPrompt = [CASE_LAW_GUIDANCE, ...systemMessages.map((m) => m.content)].join("\n\n---\n\n");

    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
      history,
    });

    const result = await chat.sendMessageStream(lastMessage.content);
    let fullText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      onChunk(text);
    }
    return fullText;
  } catch (error) {
    console.error("Gemini streaming error:", error);
    onChunk("An error occurred.");
    return "";
  }
}
