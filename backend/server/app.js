const express = require("express");
const cors = require("cors");

const app = express();

// --------------------------------------------------
// Global middleware
// --------------------------------------------------

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
  ]
}));

app.use("/api/health", require("./routes/health.routes"));
app.use("/api/schemas", require("./routes/schema.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

app.use(express.json({ limit: "1mb" }));

// Route modules will be registered here as we migrate them.
// Keep this file focused on application setup and route mounting.

// --------------------------------------------------
// Central error handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;

  return res.status(status).json({
    message:
      status < 500
        ? err.message
        : "An unexpected server error occurred."
  });
});

module.exports = app;
