# HR Assistant Demo

TypeScript chatbot for the Trenkwalder assignment.

It answers two kinds of questions:

- policy/handbook questions from files in `data/docs`
- employee balance/vacation questions by calling a mocked HR API

I kept the project intentionally lightweight. There are no embeddings, vector databases, queues, or framework-heavy frontend pieces because the goal is to show the flow clearly: load documents, search them, decide when live data is needed, and call the external service boundary.

## Assumptions and Design Decisions

- The chatbot is implemented in **TypeScript** with a simple CLI/web interface.
- The **“Multi-modal”** is seen as multiple document formats (.txt, .md, .pdf) that are converted into plain text then retrieved.
- **PDF files** are assumed to be text-based (no OCR or image based PDF's).
- The **static knowledge** is loaded from local files and indexed at startup (using TF-IDF).
- **Dynamic questions** are detected with rule-based intent matching
- Dynamic data is fetched through a dedicated HR service client over HTTP (using a mock API)
- Employee balance questions require an employee ID do to a valid anwser.
- No authentication, persistence, or conversation memory nedded for this demo.



## To run it:

Install dependencies:

```bash
npm install
```

Run the CLI chatbot:

```bash
npm run mock-api
npm run dev
```

Or a small browser UI:

```bash
npm run web
```

Then open `http://localhost:3000`.

## Some questions it can anwser

```text
When should vacation requests be submitted?
What is the remote work policy?
How many vacation days do I have left for employee E001?
employee:E002 what is my sick days balance left?
What is the lunch menu?
```

## How it works

Static document answers live in `src/static`.

- `loader.ts` reads `.txt`, `.md`, `.pdf` files and normalizes it.
- `search.ts` chunks the content, builds a small TF-IDF index, retrieves matching chunks, and turns the best ones into an answer with citations.

Dynamic answers are handled by the chatbot in `src/chatbot.ts`.
Static questions go through TF-IDF retrieval over the loaded documents.
Dynamic balance questions only go to the HR service when the question has stronger phrasing such as `left`, `remaining`, `balance`, `do I have`, or `my vacation`.

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

I used TF-IDF because it is simple, offline, and good enough for this demo. For a larger database, I might use something like a retrieval interface around this and swap in embeddings later.

For this assignment, the only live-data intent is employee leave balance, so a few keyword checks are easier to review and debug than a classifier.

The HR API is separated behind `HrServiceClient` so the chatbot does not care whether the data comes from JSON, a mock server, or a real HR system.

## Project structure

- `src/static` handles document loading, chunking, and retrieval for `.txt`, `.md`, and `.pdf` files.
- `src/dynamic` contains the HR service client and the mocked API.
- `src/chatbot.ts` coordinates intent routing and chooses between the static retrieval and dynamic calls.

## What I would improve with more time

- Improve retrieval quality with better ranking, chunk metadata, and possibly embeddings for larger document number.
- Add better intent detection so routing depends less on simple keyword rules.
- Support OCR or image based PDFs instead of assuming all PDFs are text based.
- Add authentication and employee context for a more realistic dynamic HR integration.

## Tests

```bash
npm test
npm run build
```

The tests test document loading, chunking and search behavior, intent detection, HR-service errors, and the chatbot flow.
