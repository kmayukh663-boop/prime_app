const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
  ]
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Continue serving the existing static frontend from /public.
app.use(express.static(path.join(__dirname, "../../public")));

app.use("/api/health", require("./routes/health.routes"));
app.use("/api/schemas", require("./routes/schema.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

// Multer and request errors are normalized here.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error("Request error:", err.message);
  const status = err.status || (err.name === "MulterError" ? 400 : 400);
  return res.status(status).json({
    message: err.message || "Request failed."
  });
});

module.exports = app;
