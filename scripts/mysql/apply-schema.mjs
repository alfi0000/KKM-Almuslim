import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { connectMysql, ensureDatabase } from "./connection.mjs";

function splitStatements(source) {
  const statements = [];
  let buffer = "";
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      buffer += char;
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      buffer += char;
      if (char === "*" && next === "/") {
        buffer += next;
        index++;
        blockComment = false;
      }
      continue;
    }
    if (!quote && char === "-" && next === "-" && /\s/.test(source[index + 2] || "")) {
      buffer += char + next;
      index++;
      lineComment = true;
      continue;
    }
    if (!quote && char === "/" && next === "*") {
      buffer += char + next;
      index++;
      blockComment = true;
      continue;
    }
    if (quote) {
      buffer += char;
      if (char === "\\" && next) {
        buffer += next;
        index++;
      } else if (char === quote) {
        if (next === quote) {
          buffer += next;
          index++;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === ";") {
      if (buffer.trim()) statements.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += char;
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

await ensureDatabase();
const schema = await readFile(resolve("db/mysql/schema.sql"), "utf8");
const statements = splitStatements(schema);
const connection = await connectMysql();
try {
  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (error) {
      if (error?.code === "ER_DUP_FIELDNAME" && /^ALTER TABLE .* ADD COLUMN /i.test(statement)) continue;
      throw error;
    }
  }
  console.log(`Skema MySQL berhasil diterapkan (${statements.length} statement).`);
} finally {
  await connection.end();
}
