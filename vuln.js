// secure-final.js 

const express = require("express");
const rateLimit = require("express-rate-limit");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// ✅ Rate limiter (global or per-route)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Use environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}

// ✅ Sanitize input
function sanitize(input) {
  return String(input).replace(/[<>]/g, "");
}

// ✅ Token generation
app.post("/token", limiter, (req, res) => {
  const user = sanitize(req.body.user || "guest");

  const token = jwt.sign(
    { user },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "1h"
    }
  );

  res.json({ token });
});

// ✅ Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send("Unauthorized");

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).send("Invalid token");
  }
}

// ✅ Protected admin (with rate limiting)
app.get("/admin", limiter, authMiddleware, (req, res) => {
  res.send("Secure admin data");
});

// ✅ Safe command execution
app.get("/ping", limiter, (req, res) => {
  const host = req.query.host;

  if (!/^[a-zA-Z0-9.\-]+$/.test(host)) {
    return res.status(400).send("Invalid host");
  }

  execFile("ping", ["-c", "1", host], (err, stdout) => {
    if (err) return res.status(500).send("Ping failed");
    res.send(stdout);
  });
});

// ✅ Safe file read
app.get("/read", limiter, (req, res) => {
  const file = req.query.file;

  const baseDir = path.join(__dirname, "files");
  const filePath = path.normalize(path.join(baseDir, file));

  if (!filePath.startsWith(baseDir)) {
    return res.status(400).send("Invalid file path");
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    res.send(data);
  } catch {
    res.status(404).send("File not found");
  }
});

// ✅ Prevent XSS
app.get("/search", (req, res) => {
  const q = sanitize(req.query.q || "");
  res.send(`<h1>Results for: ${q}</h1>`);
});

// ✅ FIXED Open Redirect (whitelist only)
app.get("/redirect", (req, res) => {
  const key = req.query.url;

  const ALLOWED_REDIRECTS = {
    home: "/",
    profile: "/profile",
    help: "/help"
  };

  const target = ALLOWED_REDIRECTS[key];

  if (!target) {
    return res.status(400).send("Invalid redirect");
  }

  res.redirect(target);
});

// ✅ Secure random token
app.get("/reset-token", (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.send({ resetToken: token });
});

// ✅ No sensitive error leakage
app.get("/error", (req, res) => {
  try {
    throw new Error("Internal error");
  } catch {
    res.status(500).send("Something went wrong");
  }
});

// ✅ Prevent prototype pollution
app.post("/merge", (req, res) => {
  const target = {};

  for (const key in req.body) {
    if (key === "__proto__" || key === "constructor") continue;
    target[key] = req.body[key];
  }

  res.json(target);
});

app.listen(3000, () => {
  console.log("Secure app running on port 3000");
});
