let app;
try {
  const handler = require("./handler.cjs");
  app = handler.default ?? handler;
} catch (e) {
  app = (req, res) => {
    res.status(500).json({ error: "Handler load failed", message: e.message, stack: e.stack });
  };
}
module.exports = app;
