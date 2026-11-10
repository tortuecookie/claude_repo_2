# GenAI Governance Academy

A self-paced training website for (re)insurance professionals on the governance and ethics of generative AI. It is based on the SOA Research Institute report
[*Model Governance/Ethics for GenAI Models – Practical Guide and Educational Handbook*](https://www.soa.org/resources/research-reports/2026/model-gov-ethics-for-gen-ai/) (September 2026).

This is an independent educational adaptation. The Society of Actuaries and the report's authors have not reviewed or endorsed it. Nothing in it is legal advice.

## What's inside

| Part | Modules |
| --- | --- |
| A · Foundations | 1 What changes · 2 How LLMs work · 3 Specialising models (prompts, RAG, fine-tuning, agents, MCP) |
| B · Risks and rules | 4 Threats and defences · 5 Regulatory landscape (US, privacy, EU AI Act…) · 6 Standards (ISO, NIST, IAA, EIOPA, OECD) |
| C · Governance in practice | 7 Lifecycle governance and documentation · 8 Validation and explainability |
| D · Case studies | 9 Actuarial reporting agent · 10 Marketing chatbot · 11 Underwriting support agent |
| Resources | Interactive governance checklist · Glossary · 15-question final assessment · About and sources |

Every module has learning objectives, a quiz with explanations and section references, and key takeaways. Interactive exercises include an oversight matrix, a temperature/Top-K/Top-P sampling demo, a COSTAR prompt builder, an MCP integration counter, an agent architecture decision tree, a fairness metric calculator, a RAGAS faithfulness exercise and a lifecycle sorting exercise.

Progress, quiz scores and checklist ticks are stored in the browser's `localStorage` only.

## Using it

`index.html` is self-contained: open it in a browser, or serve the repository root with any static host (for example GitHub Pages). Fonts load from Google Fonts. Without network access the site falls back to system fonts.

## Editing

Sources live in `src/`:

```
src/template.html   page shell
src/styles.css      styling (light and dark themes)
src/data.js         module list, quiz bank, glossary, checklist items
src/app.js          routing, progress, quizzes, exercises
src/pages/*.html    one file per module or resource page, assembled in filename order
```

After editing, rebuild:

```bash
python3 build.py
```

This regenerates `index.html`, plus `dist/artifact.html` (the same page without the document skeleton, for hosts that add their own).
