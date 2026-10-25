const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  return res.status(connected ? 200 : 503).json({
    api: "ok",
    database: connected ? "connected" : "disconnected"
  });
});

module.exports = router;
