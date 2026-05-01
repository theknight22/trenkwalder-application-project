# HR Assistant Demo

Small TypeScript chatbot for the Trenkwalder take-home assignment.

It answers two kinds of questions:

- policy/handbook questions from files in `data/docs`
- employee balance questions by calling a mocked HR API

I kept the project intentionally lightweight. There are no embeddings, vector databases, queues, or framework-heavy frontend pieces because the goal is to show the flow clearly: load documents, search them, decide when live data is needed, and call the external service boundary.

## Running it

Install dependencies:

```bash
npm install
```

Run the CLI chatbot:

```bash
npm run mock-api
npm run dev
```

Or run the small browser UI:

```bash
npm run web
```

Then open `http://localhost:3000`.

## Good demo questions

```text
When should vacation requests be submitted?
What is the remote work policy?
How many vacation days do I have left for employee E001?
employee:E002 what is my sick days balance left?
What is the lunch menu?
```

## How it works

Static document answers live in `src/static`.

- `loader.ts` reads `.txt`, `.md`, and text-based `.pdf` files and normalizes the content.
- `search.ts` chunks the content, builds a small TF-IDF index, retrieves matching chunks, and turns the best snippets into an answer with citations.

Dynamic answers are handled in the chatbot flow itself. If a question looks like a vacation or sick-day balance question, and it contains an employee ID, the chatbot calls the HR client instead of searching documents.

The external service is mocked, but it still behaves like a real HTTP dependency:

```http
GET /employees/:id/balances
```

Example response:

```json
{
  "employeeId": "E001",
  "vacationDaysRemaining": 14,
  "sickDaysRemaining": 8,
  "lastUpdated": "2026-04-20"
}
```

## Design notes

I used TF-IDF because it is simple, offline, and good enough for a small controlled document set. For a larger or messier knowledge base, I would put a retrieval interface around this and swap in embeddings later.

The intent detection is rule-based on purpose. For this assignment, the only live-data intent is employee leave balance, so a few keyword checks are easier to review and debug than a classifier.

The HR API is separated behind `HrServiceClient` so the chatbot does not care whether the data comes from JSON, a mock server, or a real HR system later.

## Tests

```bash
npm test
npm run build
```

The tests cover document loading, chunking/search behavior, intent detection, HR-service errors, and the main chatbot flow.

## What I would improve with more time

- Add a small adapter interface around document search so TF-IDF and embeddings can be swapped without touching the chatbot.
- Improve PDF citations with page numbers.
- Add a couple more dynamic intents, for example equipment-ticket status or benefit allowance balance.
- Package the demo with Docker Compose so the mock API and app start together.
