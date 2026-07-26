import { askAI } from "~/lib/ai";

export interface ArgumentTemplate {
  caseCaption: string;
  jurisdiction: string;
  statementOfFacts: string;
  legalStandard: string;
  argument: string;
  counterArguments: string;
  prayerForRelief: string;
  citations: string[];
  strategyNotes: string;
}

export interface ArgumentRequest {
  situation: string;
  jurisdiction: string;
  caseType: string;
  position: string; // "plaintiff" | "defendant" | "neutral"
  additionalContext?: string;
}

const ARGUMENT_SYSTEM_PROMPT = `You are a legal education tool that helps users understand how legal arguments are structured. Your role is strictly educational — you never provide legal advice or represent anyone.

Given a user's legal situation, generate a legal argument TEMPLATE that demonstrates proper legal argument structure. This is an educational example, not a filing-ready document.

Structure your response with these EXACT sections, using the markdown headers as shown:

## Case Caption
Create a sample case caption in proper format for the jurisdiction.

## Statement of Facts
Write 2-4 paragraphs presenting the facts in the light most favorable to the user's position. Use neutral, professional legal tone.

## Legal Standard
State the applicable legal standard (e.g., summary judgment standard, motion to dismiss standard, etc.) with citations to relevant rules and case law.

## Argument
Present 3-4 key arguments with:
- Point headings in ALL CAPS
- Supporting case law citations with parenthetical explanations
- Application of law to facts
Explain each case's holding in plain English.

## Anticipated Counter-Arguments
Identify 2-3 strongest counter-arguments the opposing party might raise and suggest responses.

## Prayer for Relief
State specifically what relief the court should grant, in proper legal format.

## Relevant Case Citations
List 3-5 real, well-established case law citations with:
- Full case name and citation
- Brief plain-English explanation of the holding
- How it supports the argument

## Strategic Notes
Provide 3-5 strategic considerations about timing, burden of proof, and procedural posture.

CRITICAL: Only cite REAL, well-known cases. Never fabricate case citations. If uncertain about a specific case, state the legal principle without a fake citation.
Always include: "FOR EDUCATIONAL PURPOSES ONLY — NOT LEGAL ADVICE. Review with a licensed attorney before filing."`;

export async function generateArgumentTemplate(request: ArgumentRequest): Promise<string> {
  const userPrompt = `Generate an educational legal argument template for the following situation:

Jurisdiction: ${request.jurisdiction}
Case Type: ${request.caseType}
Position: ${request.position}
Situation: ${request.situation}
${request.additionalContext ? `Additional Context: ${request.additionalContext}` : ""}

Remember: only cite real, verifiable cases. This is for educational purposes only.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: ARGUMENT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  return askAI(messages, { maxTokens: 4096, temperature: 0.2 });
}

export function parseArgumentTemplate(response: string): Partial<ArgumentTemplate> {
  const extract = (header: string): string => {
    const regex = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
    return response.match(regex)?.[1]?.trim() || "";
  };

  const citationsSection = extract("Relevant Case Citations");
  const citationLines = citationsSection
    .split("\n")
    .filter((l) => l.trim().startsWith("-") || l.trim().match(/^\d+\./))
    .map((l) => l.replace(/^[-\d.]+\s*/, "").trim());

  return {
    caseCaption: extract("Case Caption"),
    statementOfFacts: extract("Statement of Facts"),
    legalStandard: extract("Legal Standard"),
    argument: extract("Argument"),
    counterArguments: extract("Anticipated Counter-Arguments"),
    prayerForRelief: extract("Prayer for Relief"),
    citations: citationLines,
    strategyNotes: extract("Strategic Notes"),
    jurisdiction: "",
  };
}
