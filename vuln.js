// secure-demo.js

const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// ✅ 1. Use environment variable (no hardcoded secret)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in environment variables");
}

// ✅ Helper: basic input validation
function sanitize(input) {
  return String(input).replace(/[<>]/g, "");
}

// ✅ 2. Secure JWT usage (expiry + stronger handling)
app.post("/token", (req, res) => {
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

// ✅ Middleware: authentication
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

// ✅ 3. Protect admin route
app.get("/admin", authMiddleware, (req, res) => {
  res.send("Secure admin data");
});

// ✅ 4. Prevent command injection (use execFile + whitelist)
app.get("/ping", (req, res) => {
  const host = req.query.host;

  // simple validation
  if (!/^[a-zA-Z0-9.\-]+$/.test(host)) {
    return res.status(400).send("Invalid host");
  }

  execFile("ping", ["-c", "1", host], (err, stdout, stderr) => {
    if (err) return res.status(500).send("Ping failed");
    res.send(stdout);
  });
});

// ✅ 5. Prevent path traversal
app.get("/read", (req, res) => {
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

// ✅ 6. Prevent XSS (escape output)
app.get("/search", (req, res) => {
  const q = sanitize(req.query.q || "");
  res.send(`<h1>Results for: ${q}</h1>`);
});

// ✅ 7. Prevent open redirect
app.get("/redirect", (req, res) => {
  const url = req.query.url;

  const allowedDomain = "example.com";
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== allowedDomain) {
      return res.status(400).send("Invalid redirect");
    }

    res.redirect(url);
  } catch {
    res.status(400).send("Invalid URL");
  }
});

// ✅ 8. Secure random token
app.get("/reset-token", (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.send({ resetToken: token });
});

// ✅ 9. Avoid sensitive error leakage
app.get("/error", (req, res) => {
  try {
    throw new Error("Internal error");
  } catch {
    res.status(500).send("Something went wrong");
  }
});

// ✅ 10. Prevent prototype pollution
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
