# Antigravity Agent Instructions (Universal)

You are operating as an agent inside the **WAT framework** (Workflows, Agents, Tools) specifically tailored for the Antigravity environment. This architecture separates concerns: probabilistic AI handles reasoning and orchestration, while deterministic code handles execution. This separation is the key to our system's reliability.

---

## 1. The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs (Standard Operating Procedures) stored in `workflows/`.
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases.
- Written in plain language, acting as your operational blueprint.

**Layer 2: Agents (The Decision-Maker - YOUR ROLE)**
- You are responsible for intelligent coordination.
- Read the relevant workflow, trigger tools in the correct sequence, handle failures gracefully, and ask clarifying questions to the user when needed.
- You connect intent to execution without trying to hardcode or simulate the execution yourself.
- *Example:* If you need to pull data from a website, do not attempt to write a one-off script on the fly. Read `workflows/scrape_website.md`, determine the required inputs, and then execute `tools/scrape_single_site.py`.

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual, deterministic work.
- API calls, data transformations, file operations, database queries.
- Credentials and API keys are stored in `.env`.
- These scripts must be consistent, testable, and modular.

**Why this matters:** When AI tries to handle every granular step directly, compound errors occur. By offloading execution to deterministic Python scripts, you conserve your context window and focus purely on orchestration, logic, and decision-making—where your high-reasoning capabilities shine.

---

## 2. Critical Guardrails & Git Workflow

### 🛡️ The Git Protocol (MANDATORY)
**NEVER execute a `git commit` without the user validating/approving the proposed commit message.**
1. **Work:** Perform the task and show/summarize the changes.
2. **Propose:** Propose a clear, concise commit message describing the changes.
3. **Permission:** Wait for the user to approve or modify the proposed message.
4. **Execution:** Execute: `git add .` -> `git commit -m "[approved_message]"` -> `git push`.
5. **Follow-up:** After pushing, remind the user to wait 2 minutes for GitHub Actions and use **Ctrl + Shift + R** to bypass cache.
6. **Session Closure Rule:** NEVER say goodbye or close the session/day without first updating the `fejlesztesi_naplo.md`, committing the log, and pushing it to the repository. The log update and push must ALWAYS happen before the final sign-off.

### 🚫 Böngésző / Chrome Használati Tilalom (MANDATORY)
**Az ágens soha NE nyisson meg és NE vezéreljen önállóan böngészőt (Chrome, browser_subagent)!**
- A felület megtekintését és tesztelését mindig a felhasználó végzi a saját böngészőjében.
- Az ágens kizárólag terminálos és szerveroldali eszközökkel (Node.js futtatás, unit tesztek, fetch API mérések) ellenőrizheti a rendszert, szigorúan tilos felugró Chrome ablakot vagy automatizált böngészőt indítani.

---

## 3. Multi-Model & Resource Guidelines

Since this system operates with various models (Gemini 3.1 Pro/Flash, Claude, GPT-OSS), follow these rules to maintain consistency:

1. **Contextual Continuity:**
   - Always respect the logic and naming conventions established by previous agents. Do not refactor code or change variable naming (e.g., camelCase vs snake_case) just to match your default style.
   - If a "Thinking" model (like Claude or Gemini Pro High) has defined a structural direction, stick to it unless it is technically flawed.
2. **Strategic Resource Management:**
   - **High-Reasoning Tasks:** Use Gemini Pro (High) or Claude Thinking for complex architectural changes, debugging deep logic, or initial tool creation.
   - **Routine Tasks:** Use Gemini Flash for documentation, simple function updates, or repetitive data mapping to conserve tokens and credits.
3. **Session & Daily Persistence:**
   - **Summarize Daily:** Every time a major sub-task is finished, update the `fejlesztesi_naplo.md`.
   - **Handover:** If you sense a model switch might happen (task is long), leave a "Current State" comment at the bottom of the log so the next agent can resume immediately.
4. **Style & Tech Consistency:**
   - Always check `fejlesztesi_naplo.md` for the project's specific Tech Stack and UI/Design rules. Maintain these strictly. Do not introduce new frameworks or heavy libraries unless explicitly requested.
5. **Token-Aware Responses:**
   - Be concise. Only output the necessary code blocks or diffs to save context window space and processing credits.

---

## 4. The Persistence Layer: Development Log

Every project MUST have a `fejlesztesi_naplo.md` file. This is your "short-term memory" across different models and sessions.

**If the file does not exist, you must create it with these mandatory sections:**
- **Project Overview:** Core goal and specific context.
- **Tech Stack & Style Guidelines:** Defined technology (e.g., Vanilla JS, Python) and UI rules (e.g., Design system).
- **Current TODO List:** Active and pending tasks.
- **Changelog:** Chronological history of changes.
- **Session Handover:** A "Current Status" report for the next incoming model.

---

## 5. How to Operate in Antigravity

1. **Look for existing tools first:** Check the `tools/` directory before generating any new code. Only create new scripts when a suitable tool does not exist.
2. **Learn and adapt when things fail:**
   - Read the full error message and stack trace.
   - Fix the script and retest (check with the user before looping if it involves costs).
   - Document findings in the workflow (e.g., rate limits, API quirks).
3. **Keep workflows current:** Refine markdown files as you discover better methods. Do not discard core logic without permission.

---

## 6. The Self-Improvement Loop

1. **Identify** what broke.
2. **Fix** the underlying tool.
3. **Verify** the fix works deterministically.
4. **Update** the workflow or the `fejlesztesi_naplo.md` with the new context.
5. **Resume** the task with a more robust system.

---

## 7. File Structure & Data Handling

- **.tmp/**: Temporary files (scraped data, intermediate JSONs). Disposable.
- **tools/**: Python scripts for deterministic execution.
- **workflows/**: Markdown SOPs defining tasks and rules.
- **deliverables/**: Final outputs for the user.
- **.env**: API keys and environment variables (**NEVER commit this**).

---

## 8. Robust Development & Debugging Rules (NEW)

🛡️ **Fail-Safe Coding & Event Listeners:**
- **Check Before Listen:** Always wrap event listeners in existence checks (e.g., `if (button) { button.addEventListener... }`). This prevents the script from crashing if a UI element is missing from a specific page.
- **No Naked Variables:** Never use or check a variable (especially DOM elements) without declaring it (`const`/`let`) at the top of the scope.

📦 **Moduláris Architektúra & Duplikáció Kerülése (NEW):**
- Szigorúan TILOS backend vagy UI service logikát (pl. Firebase hívások, Parser-ek, Printer rendszerek, egyedi Dialógusok) "inline" beégetni a fő `app.js`-be. 
- Mindent, ami elkülöníthető felelősségi kör, a `js/services/` vagy `js/utils/` mappában lévő dedikált fájlokból kell ES module `import`-al meghívni a monolitikus fájlméret (6000+ sor) elkerülése érdekében.

🔍 **Console-First Debugging:**
- If the UI is unresponsive (buttons don't click, modals don't open), **the very first step** is to check the Browser Console (`F12`).
- Identify the exact error (ReferenceError, SyntaxError, 404) and line number before attempting to fix the code.

🧱 **Syntax & Structural Integrity:**
- After large-scale code movements or refactoring, perform a "Brace Audit." Ensure every `{` has a matching `}` and that no block (like `DOMContentLoaded`) was closed prematurely.
- Avoid duplicate declarations of the same variable name within the same scope.

🌐 **Environment Awareness (Local Servers):**
- Local development servers (like `server.js`) must be robust enough to handle URL query parameters (e.g., `?v=3`) and not treat them as part of the filename. Use standard libraries (`url`, `path`) for path resolution.

🧪 **Incremental Verification:**
- After implementing a new feature, verify that the **existing core features** (e.g., Main Navigation, Import, Reset) still function correctly.

---

## 🚀 Session Start Protocol

1. **Initialize:** Read this `skill.md` to understand your operational rules.
2. **Context:** Read `fejlesztesi_naplo.md` to understand the project-specific goals, tech stack, and current TODOs.
3. **Acknowledge:** Briefly confirm you have read both and state the current project context.
4. **Proceed:** Ask the user if you should continue with the next item on the TODO list.