import { Router } from "express";
import { discoverMovies } from "../services/tmdbService";

const router = Router();

router.post("/", async (req, res) => {
  const data = await discoverMovies(req.body);
  res.json(data);
});

export default router;