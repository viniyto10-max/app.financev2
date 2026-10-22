var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv";
async function startServer() {
  const app = (0, import_express.default)();
  const httpServer = import_http.default.createServer(app);
  const PORT = process.env.PORT || 3e3;
  app.get("/api/sheet-csv", async (_req, res) => {
    try {
      const response = await fetch(`${SHEET_CSV_URL}&_=${Date.now()}`);
      if (!response.ok) {
        return res.status(response.status).send("Erro ao buscar planilha no Google Sheets");
      }
      const text = await response.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(text);
    } catch (err) {
      console.error("Error fetching sheet CSV:", err);
      res.status(500).send(err?.message || "Erro interno ao buscar planilha");
    }
  });
  if (process.env.NODE_ENV === "production") {
    app.use(import_express.default.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.resolve("dist", "index.html"));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
