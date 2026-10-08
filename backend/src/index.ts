import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import exerciseRoutes from "./routes/exercises";
import vocabularyRoutes from "./routes/vocabulary";
import listeningRoutes from "./routes/listening";
import writingRoutes from "./routes/writing";
import curriculumRoutes from "./routes/curriculum";
import "./db/database";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/exercises", exerciseRoutes);
app.use("/api/vocabulary", vocabularyRoutes);
app.use("/api/listening", listeningRoutes);
app.use("/api/writing", writingRoutes);
app.use("/api/curriculum", curriculumRoutes);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
