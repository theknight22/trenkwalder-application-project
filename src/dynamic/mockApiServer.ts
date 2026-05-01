import { startMockApiServer } from "./mockApi";

const port = Number(process.env.MOCK_API_PORT ?? "4000");

startMockApiServer(port).catch((error) => {
  console.error("Failed to start mock API server:", error);
  process.exit(1);
});
