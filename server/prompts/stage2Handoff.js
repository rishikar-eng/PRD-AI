/**
 * SPEC: getStage2HandoffPrompt
 * Purpose: Generates a feature-aware Claude prompt for Stage 2 UI/UX design
 * This prompt is included in the Stage 2 handoff zip bundle (stage2_prompt.txt)
 * It tells Claude exactly which screens to mock up based on the PRD content
 */
export function getStage2HandoffPrompt(prdText, featureName) {
  return `You are a Stage 2 Handoff Prompt Generator for Rian's PRD Pipeline.

YOUR TASK:
Generate a feature-aware Claude prompt that will be used in Stage 2 (Design & UI/UX).
The owner will take this prompt + the PRD + the Rian theme reference HTML to Claude web
and ask Claude to generate HTML mockups of the UI/UX for this feature.

Your job is to read the PRD and extract ONLY the design-relevant information from 3 sections:
1. User Flow — extract each screen/step that needs a UI
2. Configuration — extract each parameter that needs a control/input
3. Failure Handling — extract each error state that needs visual feedback

OUTPUT REQUIREMENTS:
Generate a plain-text Claude prompt (this becomes stage2_prompt.txt) with this exact structure:

---

I am designing UI/UX mockups for a Rian feature. I need you to generate HTML mockups that match the Rian brand system exactly.

FEATURE: ${featureName}

CONTEXT:
Attached are two files:
1. PRD_v1.0.md — the full product requirements document
2. rian_theme_reference.html — the Rian design system and brand guidelines

SCREENS TO MOCK UP:
Based on the User Flow section of the PRD, generate HTML mockups for each of these screens:
[Extract each numbered step from ## User Flow section and list as:]
- Screen 1: [step description from PRD]
- Screen 2: [step description from PRD]
... continue for all user flow steps

CONFIGURATION PANELS TO DESIGN:
Based on the Configuration section of the PRD, design UI controls for:
[Extract each parameter from ## Configuration section and list as:]
- [Parameter name]: [type of control needed - e.g. dropdown, toggle, slider, text input]
... continue for all configuration parameters

ERROR STATES TO SHOW:
Based on the Failure Handling section of the PRD, design error messages/states for:
[Extract each failure mode from ## Failure Handling section and list as:]
- [Failure mode]: [what UX feedback to show - e.g. error banner, inline warning, modal]
... continue for all failure modes

DESIGN REQUIREMENTS:
Match the Rian brand system in rian_theme_reference.html exactly:
- Pure black background (#000000)
- Dark cards (#111111) with subtle borders (rgba(255,255,255,0.06))
- Plus Jakarta Sans font family
- Pink → orange → green gradient for primary CTAs only
- White text (#ffffff) for primary, grey (#a0a0a0) for secondary
- 14px border radius for cards, 10px for smaller elements
- Constructive feedback in green (#4ade80), warnings in orange (#fb923c)

OUTPUT FORMAT:
Generate separate HTML files for each screen listed above.
Each HTML file should be fully self-contained (inline CSS, no external dependencies).
Match the Rian visual style precisely — refer to rian_theme_reference.html for examples.

---

ANALYSIS INSTRUCTIONS (for you, the prompt generator):
Read the PRD text below and extract:
1. From ## User Flow section: Each numbered step becomes a "Screen X" line
2. From ## Configuration section: Each parameter/setting becomes a configuration control line
3. From ## Failure Handling section: Each failure mode becomes an error state line

Be specific. Instead of "Login screen", say "User login screen with email/password fields and social auth buttons".
Instead of "Error", say "Connection timeout error with retry button and support link".

PRD TEXT:
${prdText}

Now generate the Claude prompt following the structure above. Return ONLY the prompt text, no JSON wrapper, no preamble.`;
}
