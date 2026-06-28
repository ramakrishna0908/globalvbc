// Vercel serverless entrypoint — re-exports the Express app as the function
// handler. The root vercel.json rewrites /api/* to this function, and Express
// routes on the original request path (routes are defined with the /api prefix).
import { app } from '../backend/server.js';

export default app;
