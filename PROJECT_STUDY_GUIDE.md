# Web Vocal / Sentinel: Easy Project Guide

This document explains the project in simple language. Read it from top to bottom. When you see a file name, open that file in VS Code and follow along.

## 1. What Is This Project?

This is an AI-powered application auditing tool.

You give it:

- the URL of a running application
- the URL of its GitHub repository

The tool then:

1. Visits the live application.
2. Reads information from the GitHub repository.
3. Uses AI to describe how the application is built.
4. Predicts possible future risks.
5. Creates testing ideas.
6. Connects to a user's target computer through a remote agent.
7. Runs approved checks on that computer.
8. Uses AI to explain the test results.

In one sentence:

> This project is a security and architecture assistant that studies an application and can run approved tests on its target machine.

## 2. The Three Main Parts

Think of the project as three parts:

### Part A: The dashboard

This is what the user sees in the browser. It contains forms, buttons, project information, risks, tests, and reports.

Main location: `src/app/`

### Part B: The command center

This is the backend. It receives browser requests, talks to AI services, reads and writes the database, and controls the agent.

Main files: `server.js` and `src/app/api/`

### Part C: The remote agent

This runs on the computer being tested. It connects back to the command center, asks for permission, runs approved actions, and sends results back.

Main file: `public/agent-client.js`

The simple picture is:

```text
User browser
    |
    | HTTP requests
    v
Next.js dashboard and API routes
    |
    | Prisma and AI services
    v
SQLite database
    ^
    |
Remote agent on target computer
    |
    | WebSocket connection
    +--------------------> server.js
```

## 3. Folder Structure

```text
web-vocal/
|-- server.js                 Main server entry point
|-- package.json              Commands and dependencies
|-- .env                      Local secrets and database URL
|-- prisma/
|   `-- schema.prisma         Database tables and relationships
|-- public/
|   `-- agent-client.js       Code run on the target computer
|-- lib/
|   |-- gemini/               Gemini AI logic and prompts
|   |-- github/               GitHub repository logic
|   |-- groq/                 Groq AI client
|   `-- scraper/              Live website scraping logic
|-- src/app/
|   |-- page.js               Home page
|   |-- layout.js             Common page layout
|   |-- globals.css           Application styling
|   |-- api/                  Backend HTTP endpoints
|   `-- project/[id]/          Project dashboard and its modules
|-- README.md                 Original starter documentation
|-- ARCHITECTURE.md           Architecture notes
|-- CODEBASE_GUIDE.md         Older codebase notes
`-- PROJECT_STUDY_GUIDE.md    This learning guide
```

## 4. Important Root Files

### `package.json`

This tells Node and npm how to run the project.

Important commands:

```bash
npm run dev       # starts node server.js
npm run build     # creates a production build
npm start         # starts node server.js
npm run lint      # checks JavaScript style and errors
```

Important libraries:

- `next`: web framework
- `react`: user interface library
- `@prisma/client`: database access
- `prisma`: database schema and commands
- `ws`: WebSocket communication
- `@google/genai`: Gemini API
- `playwright`: browser and page inspection

### `server.js`

This is the real starting point of the application. `npm run dev` runs it.

It does two jobs at once:

1. Starts the Next.js website and API routes.
2. Starts the WebSocket connection used by the remote agent.

It also:

- loads `.env`
- creates a Prisma client
- keeps connected agents in `activeAgents`
- creates `AgentSession` database records
- receives messages from agents
- forwards pending permission requests to agents

The normal browser address is:

```text
http://localhost:3000
```

The agent connects through:

```text
ws://localhost:3000/agent?projectId=<PROJECT_ID>
```

### `.env`

This stores private settings:

```text
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="..."
GROQ_API_KEY="..."
```

The file must be in the project root. Never commit real API keys to GitHub.

### `next.config.mjs`

Next.js configuration. It controls framework-level settings.

### `jsconfig.json`

JavaScript editor and import settings. It allows imports such as `@/../lib/...`.

### `eslint.config.mjs`

Rules used by `npm run lint`.

### `ws-server.js`

This is a separate WebSocket-related server file. The current main runtime uses the WebSocket setup inside `server.js`, so always check `server.js` first when learning the active connection flow.

### Test and helper files

- `test_flow.js`: tests a larger application flow.
- `test_dashboard.js`: checks dashboard behavior.
- `test-gemini.js` and `testGemini.js`: experiments for Gemini behavior.
- `checkModels.js`: checks available model configuration.
- `debug_browser.js`: browser debugging helper.

## 5. The Database

### `prisma/schema.prisma`

This describes the database. Prisma reads this file and creates JavaScript database methods.

The database is SQLite, usually stored in `dev.db`.

### Main database models in simple language

- `Project`: one application being audited.
- `ProjectSource`: information about its repository, such as file count and hotspots.
- `ProjectProfile`: AI's description of the application's architecture.
- `Requirement`: something the application is expected to do.
- `Risk`: a possible problem, either current or future.
- `Tester`: a generated testing role and testing strategy.
- `TestSpecification`: a planned test.
- `TestExecution`: one attempt to run a planned test.
- `Finding`: a problem discovered during a test.
- `Evidence`: proof attached to a finding, such as a log or source reference.
- `AgentSession`: one connection from a remote agent.
- `PermissionRequest`: one request asking the remote user to approve an action.
- `TelemetryEvent`: activity information sent by the agent.

The most important chain is:

```text
Project
  -> Profile
  -> Risks
  -> Test specifications
  -> Test executions
  -> Findings
  -> Evidence
```

Agent-related data follows another chain:

```text
Project
  -> AgentSession
  -> PermissionRequest
  -> TelemetryEvent
```

Many arrays are saved as JSON inside string columns. For example, `mainFeatures` is a string containing JSON rather than a separate table.

## 6. The `src/app` Frontend

### `src/app/layout.js`

Common layout shared by pages. It is where global page structure and metadata are connected.

### `src/app/page.js`

The home page.

The user enters a live URL and a GitHub URL. The page sends them to `/api/analyze`. When the API returns a project ID, the page opens that project's dashboard.

Browser flow:

```text
User fills form
  -> handleAnalyze()
  -> POST /api/analyze
  -> receive projectId
  -> router.push('/project/' + projectId)
```

### `src/app/globals.css`

Global styling for the dashboard. It controls colors, layout, buttons, panels, tables, reports, and responsive behavior.

## 7. The Project Dashboard

Folder: `src/app/project/[id]/`

`[id]` means the page is dynamic. It represents one project ID.

### `page.js`

Loads the project from Prisma and places all project modules on the screen.

### `AgentConnection.js`

Shows whether the remote computer is connected. It polls the agent-status API and displays the command the user must run to start the agent.

### `AiUsageDetector.js`

Button and display for checking whether parts of the project look AI-generated.

### `FutureRiskProfiler.js`

Allows the user to request future risk predictions, such as risks in 6 months, 12 months, or 5 years.

### `TesterGeneration.js`

Displays or starts generation of tester roles, personas, objectives, strategies, and risk areas.

### `TestExecution.js`

The main test screen. It handles:

- custom test instructions
- suggested deep tests
- starting an agent test
- loading states
- execution errors
- technical HTML reports
- simple-language report explanations

### `RootCauseAnalysis.js`

Starts and displays a report explaining why findings happened.

## 8. The Backend API Folder

Folder: `src/app/api/`

Each `route.js` file is an HTTP endpoint. A route usually does four things:

1. Reads JSON from the browser.
2. Reads or changes database records.
3. Calls an AI service or helper.
4. Returns JSON to the browser.

### `/api/analyze`

File: `src/app/api/analyze/route.js`

This is the first major workflow.

```text
receive URL and GitHub URL
  -> create Project
  -> scrape live URL
  -> fetch GitHub repository
  -> collect files and history
  -> save ProjectSource
  -> ask Gemini for project understanding
  -> save ProjectProfile
  -> return projectId
```

### `/api/agent/request-capability`

Creates or handles a request for the agent to perform a capability. A capability is an allowed operation such as executing a command or using a file in the sandbox.

### `/api/analyze-ai-usage`

Asks Gemini to inspect project signals and estimate whether code appears to have been generated by AI.

### `/api/analyze-findings`

Collects test failures and findings, then asks AI to explain the likely root cause.

### `/api/bootstrapper/[projectId]`

Creates the startup command for the remote agent. The project ID connects the target computer to the correct dashboard project.

### `/api/execute-agent-test`

Runs a test through the remote agent. The complete workflow is explained in Section 11.

### `/api/execute-tests`

Handles the other test-execution path used by the application. Check this route when studying tests that do not use the remote agent flow.

### `/api/generate-tester`

Uses AI to create tester information and saves it to the project.

### `/api/predict-future-risks`

Uses the project profile to predict future technical and security risks.

### `/api/project/[id]/agent-status`

Reports whether the latest agent session for a project is connected.

### `/api/simplify-report`

Takes a technical report and asks Gemini to explain it in simpler language.

### `/api/suggest-deep-tests`

Uses project information to suggest useful test ideas.

## 9. The `lib` Folder

The `lib` folder contains reusable backend logic. API routes call these helpers instead of putting every detail inside the route file.

### `lib/github/RepositoryProvider.js`

Responsible for GitHub repository work:

- understand the repository URL
- fetch or prepare repository data
- list files
- read commit history

The analyze route uses this helper before asking Gemini to understand the project.

### `lib/scraper/liveUrl.js`

Visits or inspects the live application URL. It collects information that cannot be learned only from the GitHub repository.

### `lib/gemini/projectUnderstanding.js`

Sends live-site data, repository files, and history to Gemini. It asks Gemini to return a structured project profile.

### `lib/gemini/testerGeneration.js`

Contains logic and prompts for creating tester strategies.

### `lib/gemini/testExecution.js`

Contains prompts or helpers related to planning tests for the remote agent.

### `lib/gemini/rootCauseAnalysis.js`

Asks Gemini to connect findings, logs, and failures to a likely root cause.

### `lib/groq/client.js`

Small client for calling Groq's API. It is used for faster tasks such as future-risk prediction and execution-result evaluation.

## 10. The Remote Agent

### `public/agent-client.js`

This file is meant to run on the target computer, not just inside the browser.

Its job is:

1. Read the project ID and server URL.
2. Open a WebSocket connection to the command center.
3. Send information about the target computer and workspace.
4. Wait for a capability request.
5. Ask the person at the target computer for approval.
6. Run the approved operation.
7. Send the result or error back to the server.

The agent does not decide which project it belongs to by itself. The project ID in the startup command identifies it.

### Agent connection flow

```text
Dashboard shows bootstrap command
  -> user runs command in target terminal
  -> agent starts
  -> agent connects to ws://server/agent?projectId=...
  -> server creates AgentSession with CONNECTED status
  -> agent sends contextDump
  -> server saves contextDump
  -> dashboard sees the connected status
```

### Permission flow

The server does not immediately run an action.

```text
API creates PermissionRequest(PENDING)
  -> server notices it
  -> server sends capability_request to agent
  -> agent asks target user for approval
  -> user approves or denies
  -> agent sends capability_response
  -> server updates the database
  -> API continues or stops
```

This permission step is important because the agent can run commands on another computer.

## 11. How Was the Connection Made With the Target Device?

### Question

How does Sentinel connect with the targeted device?

### Answer

The target device makes an outgoing connection to the Sentinel server. The browser does not connect directly to the target device.

The connection happens in these steps:

```text
Dashboard creates a bootstrap command
  -> target terminal downloads the bootstrap script
  -> bootstrap script downloads and starts the Sentinel agent
  -> agent opens a WebSocket connection to the server
  -> server creates an AgentSession
  -> agent sends target-device information
  -> dashboard shows the device as connected
```

The dashboard generates a command similar to:

```bash
node -e "fetch('http://SERVER_HOST:3000/api/bootstrapper/PROJECT_ID').then(r => r.text()).then(t => eval(t))"
```

The user runs this command on the target device. The command first contacts:

```text
/api/bootstrapper/<projectId>
```

The bootstrapper then:

1. Creates a temporary workspace on the target device.
2. Reuses or installs the `ws` WebSocket package.
3. Downloads `public/agent-client.js`.
4. Starts the Sentinel agent.

The agent connects to the server through a URL similar to:

```text
ws://SERVER_HOST:3000/agent?projectId=PROJECT_ID
```

`server.js` accepts this WebSocket connection, saves the active agent in memory, and creates an `AgentSession` record with status `CONNECTED`.

After connecting, the agent sends a context dump containing:

- target operating system
- Node.js version
- directory structure
- target `package.json`, when available

The dashboard checks the session status regularly. When it sees the `CONNECTED` session, it displays:

```text
Sentinel Agent connected securely.
```

The target terminal must remain open because the running agent process maintains the WebSocket connection. The target device must also be able to reach the server host and port. If the server runs on a laptop, another device must use the laptop's network IP, such as `192.168.1.10:3000`, instead of `localhost:3000`.

## 12. What To Do After Connecting the Target Machine

When the dashboard shows:

```text
Sentinel Agent connected securely.
```

the target machine is connected to the correct project. Keep the target terminal open while using the dashboard. The agent process must continue running to receive requests.

### Step 1: Test the connection with a harmless capability

In the **Deep Connection Engine**, use these buttons in this order:

1. Click `inspect_runtime`.
2. Look at the target machine terminal.
3. When it asks `Approve this request? [y/N]:`, type `y` and press Enter.
4. Confirm that the result appears in the dashboard.

The expected runtime result contains the target's Node.js version. You can also try `inspect_tools` and `inspect_ai` afterward. These are read-only checks and do not change project files.

The full request cycle is:

```text
Click capability button
  -> server creates a pending permission request
  -> target terminal displays the request
  -> target user types y or n
  -> agent sends the response
  -> dashboard displays the result
```

### Step 2: Generate the audit profile

Scroll to **Threat Modeling Engine** and click **Generate Audit Profile**.

Gemini uses the saved project profile and repository source information to generate:

- a specialized tester
- important workflows
- testing strategies
- requirements
- current and future risks

After generation, the page reloads and displays the audit profile, audit requirements, and identified risks.

### Step 3: Run a safe deep test

Scroll to **Dynamic Test Execution**. You can select an AI-suggested execution domain or enter a custom instruction.

Use this first test:

```text
Check the Node.js version and inspect the project package.json without modifying any files.
```

Then click **Send Instruction**. The system will:

1. Send the instruction to `/api/execute-agent-test`.
2. Ask Gemini to create a test plan with up to three actions.
3. Ask for permission for each action in the target terminal.
4. Execute only the actions approved by the target user.
5. Return the command results to the dashboard.
6. Ask Groq to turn the raw output into an execution report.

Approve only actions that are clear and safe. If an action is unexpected, type `n` or leave it unanswered.

### Step 4: Run a security check

After the basic test succeeds, try:

```text
Run npm audit in the target project and report high or critical vulnerabilities. Do not modify files.
```

This should inspect dependency vulnerabilities without changing the project. The target terminal still asks for approval before execution.

### Step 5: Read and simplify the report

The execution report shows the returned output and the AI's evaluation. Use **Explain in Simple Terms** to ask Gemini to rewrite the technical report for a non-technical reader.

### Step 6: Analyze findings

If tests create findings, scroll to **Root Cause Analysis & Final Report** and click **Analyze Findings & Generate Report**. Gemini then analyzes the findings using the project architecture and execution information, estimates root causes and impact, and produces the final report.

### Recommended first-use sequence

```text
1. Confirm the green connected status.
2. Click inspect_runtime and approve it in the target terminal.
3. Generate Audit Profile.
4. Run the package.json and Node.js read-only test.
5. Run npm audit.
6. Review the technical report.
7. Use Explain in Simple Terms.
8. Run Analyze Findings & Generate Report when findings exist.
```

### Safety rules

- Keep the target terminal open during the entire test.
- Read every permission request before approving it.
- Prefer read-only commands for the first tests.
- Do not approve commands that delete files, drop databases, overwrite source code, or install packages unless that action is intentional.
- Do not paste API keys, passwords, or other secrets into test instructions.
- The agent's file-writing capability is restricted to its `.sentinel_sandbox` folder, but command execution must still be reviewed carefully.

### If something does not work

- **Green status disappears:** restart the bootstrap command on the target machine.
- **No active agent session:** confirm the command uses the correct project page and project ID.
- **Permission request does not appear:** check that the target terminal is still running and that the server terminal has no WebSocket error.
- **Request times out:** answer the terminal prompt with `y` or `n`; the API waits only a limited time.
- **Report is empty:** first run a harmless test that produces visible terminal output, then retry the report.

## 13. Deep Test Workflow, Step by Step

Main file: `src/app/api/execute-agent-test/route.js`

Imagine the user enters: `Check whether the application is healthy`.

### Step 1: Browser sends instruction

`TestExecution.js` sends `projectId` and `instruction` to `/api/execute-agent-test`.

### Step 2: API checks the agent

The API searches for the newest `AgentSession` with status `CONNECTED`.

If there is no connected agent, the test stops. This is why the dashboard can load normally while deep testing says that no agent is available.

### Step 3: API loads context

The API loads:

- the project profile
- the agent's context dump
- the user's test instruction

### Step 4: Gemini creates a plan

Gemini creates up to three actions. The prompt tells Gemini:

- test the real application
- do not invent failures
- do not destroy data
- use only allowed capabilities
- return JSON only

The API parses Gemini's JSON into an `actions` array.

### Step 5: Server asks for permission

For every action, the API creates a `PermissionRequest` with status `PENDING`.

The server's polling loop finds it and sends it to the agent. The agent displays the request in the target terminal.

### Step 6: Agent runs the approved action

If the user approves, the agent executes the action and returns the result. If the user denies it, the API cancels the test. If nobody answers, the request times out.

### Step 7: Groq evaluates the result

The API collects the action results into `executionLogs`. Groq reads these logs and creates an HTML report.

### Step 8: Dashboard displays the report

The API returns the report to `TestExecution.js`, which displays it and can ask Gemini to simplify it.

Complete flow:

```text
instruction
  -> execute-agent-test API
  -> connected AgentSession
  -> Gemini test plan
  -> PermissionRequest
  -> server.js WebSocket loop
  -> public/agent-client.js
  -> approved terminal action
  -> result and logs
  -> Groq evaluation
  -> dashboard report
```

## 14. AI Services in Simple Language

### Gemini

Gemini is used for deeper thinking:

- understand the project
- plan a test
- inspect possible AI-generated code
- explain root causes
- simplify technical reports

### Groq

Groq is used for fast thinking:

- predict future risks
- suggest deep tests
- evaluate returned terminal logs

The two services are used for different strengths: Gemini handles deeper reasoning, while Groq handles quick evaluation.

## 15. Full User Workflow

```text
1. User opens http://localhost:3000.
2. User enters a live URL and GitHub URL.
3. Browser calls /api/analyze.
4. Server creates a Project.
5. Server scrapes the live URL.
6. Server reads repository files and history.
7. Gemini creates a ProjectProfile.
8. Dashboard opens /project/<id>.
9. User runs the bootstrap command on a target computer.
10. Agent connects through WebSocket.
11. Server saves AgentSession and contextDump.
12. User chooses an analysis module or enters a test instruction.
13. AI generates analysis or a test plan.
14. Approved agent actions run on the target computer.
15. Logs and results return to the server.
16. AI creates a report.
17. Dashboard displays the report and findings.
```

## 16. How to Run the Project

From the project root:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run dev
```

Then open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run lint
npx prisma validate
npx prisma studio
```

Check that the database environment exists without printing secrets:

```bash
node -e 'require("dotenv").config(); console.log(Boolean(process.env.DATABASE_URL))'
```

After changing `.env`, restart the server. A running Node process does not automatically receive new environment values.

## 17. Debugging in Simple Steps

### The server does not start

1. Run `npm ci`.
2. Run `npx prisma generate`.
3. Check the first error in the terminal.
4. Make sure port 3000 is free.
5. Make sure `.env` is in the project root.

### Prisma says `DATABASE_URL` is missing

1. Open `.env`.
2. Confirm it contains `DATABASE_URL="file:./dev.db"` or the correct database URL.
3. Confirm `server.js` loads dotenv before `new PrismaClient()`.
4. Restart `npm run dev`.
5. Run `npx prisma validate`.

### Project analysis fails

Check:

- both URLs were entered
- the GitHub URL is valid
- the repository helper can access the repository
- the Gemini API key works
- the terminal error from `/api/analyze`

### Agent stays disconnected

Check:

- the bootstrap command has the correct project ID
- the target terminal is still running the agent
- the server address is correct
- the agent uses the `/agent` WebSocket path
- `server.js` prints `[WebSocket] Agent connected`

### Deep test says no active session

The agent must be connected first. The database must contain an `AgentSession` for the same project with status `CONNECTED`.

### Permission request times out

Check that:

- the target terminal is open
- the user answered the prompt
- the server polling loop is still running
- the request status changed in Prisma Studio

## 18. Best Reading Order

Read these files in this order:

1. `package.json` - learn how the project starts.
2. `server.js` - learn the main server and WebSocket connection.
3. `src/app/page.js` - learn the first browser screen.
4. `src/app/api/analyze/route.js` - learn project creation.
5. `prisma/schema.prisma` - learn where data is stored.
6. `src/app/project/[id]/page.js` - learn the dashboard shell.
7. `AgentConnection.js` - learn how the dashboard waits for the agent.
8. `src/app/api/bootstrapper/[projectId]/route.js` - learn how the agent starts.
9. `public/agent-client.js` - learn what runs on the target machine.
10. `src/app/api/project/[id]/agent-status/route.js` - learn connection polling.
11. `src/app/api/execute-agent-test/route.js` - learn the deep test workflow.
12. `TestExecution.js` - learn the browser controls for testing.
13. `lib/gemini/projectUnderstanding.js` - learn project analysis prompts.
14. `lib/gemini/testExecution.js` - learn test-planning prompts.
15. `lib/gemini/rootCauseAnalysis.js` - learn finding analysis.
16. `lib/groq/client.js` - learn fast AI calls.
17. Read the remaining API routes and dashboard modules.
18. Read `src/app/globals.css` for the visual design.

For every function, ask:

- What data enters this function?
- What database record does it read or change?
- Does it call an external service?
- What does it return?
- What happens when it fails?

## 19. Important Warnings

- The custom server and API routes create Prisma clients. This is acceptable for now, but a shared database helper would be cleaner later.
- Many arrays are JSON strings, so code must parse them correctly.
- Status values are strings, so spelling must stay consistent.
- The agent can run terminal actions, so permission checks and sandbox rules are security-critical.
- AI-generated HTML is untrusted output and must be rendered carefully.
- `ARCHITECTURE.md` and `CODEBASE_GUIDE.md` contain older documentation. The current source files are the final source of truth.

## 20. Final Mental Model

```text
Collect information
  -> save project
  -> ask AI to understand it
  -> show dashboard
  -> connect remote agent
  -> request permission
  -> run approved test
  -> collect logs
  -> ask AI to evaluate logs
  -> show report and findings
```

If you understand this sequence, you understand the main purpose and working flow of the project.
