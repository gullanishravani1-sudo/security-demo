// vulnerable-demo.js
// Intentionally vulnerable code for scanner testing only.

const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// 1. Hardcoded secret
const JWT_SECRET = "super-secret-hardcoded-key";

// 2. Weak JWT usage
app.post("/token", (req, res) => {
  const user = req.body.user || "guest";
  const token = jwt.sign({ user }, JWT_SECRET, { algorithm: "HS256" });
  res.json({ token });
});

// 3. No auth / no authorization
app.get("/admin", (req, res) => {
  res.send("Sensitive admin data");
});

// 4. Command injection
app.get("/ping", (req, res) => {
  const host = req.query.host;
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).send(stderr);
    }
    res.send(stdout);
  });
});

// 5. Path traversal
app.get("/read", (req, res) => {
  const file = req.query.file;
  const data = fs.readFileSync(`./files/${file}`, "utf8");
  res.send(data);
});

// 6. Reflected XSS
app.get("/search", (req, res) => {
  const q = req.query.q || "";
  res.send(`<h1>Results for: ${q}</h1>`);
});

// 7. Open redirect
app.get("/redirect", (req, res) => {
  const url = req.query.url;
  res.redirect(url);
});

// 8. Insecure random for security token
app.get("/reset-token", (req, res) => {
  const token = Math.random().toString(36).slice(2);
  res.send({ resetToken: token });
});

// 9. Sensitive error leak
app.get("/error", (req, res) => {
  try {
    throw new Error("Database password is pass@123");
  } catch (e) {
    res.status(500).send(e.stack);
  }
});

// 10. Prototype pollution style unsafe merge
app.post("/merge", (req, res) => {
  const target = {};
  Object.assign(target, req.body);
  res.json(target);
});

app.listen(3000, () => {
  console.log("Vulnerable demo app running on port 3000");
});
