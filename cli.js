#!/usr/bin/env node
// cli.js - Entry point do DevTrack
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as db from "./src/storage/db.js";
import fs from "node:fs/promises";
import path from "path";
console.log("DevTrack v1.0");
console.log("Node:", process.version);
console.log("Plataforma:", process.platform);

const rl = readline.createInterface({ input, output });

const DB_PATH = path.normalize("./data/devtrack.json");

rl.setPrompt(
  "--------MENU--------\n1. Adicionar\n2. Listar\n3. Atualizar status\n4. Sair\n> ",
);
await rl.prompt();

rl.on("line", (line) => {
  if (line == "4") rl.close().then(process.exit(0));
  else if (line == "1") {
    addPrompt(line);
  } else if (line == "2") {
    const list = parseJSON(DB_PATH).tasks;
    console.table(list, [id, titulo, status, prioridade]);
  }
});

async function parseJSON(raw) {
  try {
    const unparsed = fs.readFile(raw, "utf-8");
    const parsed = JSON.parse(unparsed);
    return parsed;
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw new SyntaxError(`Invalid JSON in ${raw}: ${err.message}`);
  }
}

async function addPrompt(line) {
  const title = await rl.question("Título (Obrigatório): ");
  const prio = await rl.question("Prioridade: ");
  const tags = await rl.question("Tags (separadas por vírgula, pode deixar em branco): ");
  const tagsFixed = tags.split(",");
  let prioFixed = prio

  if (prio != "alta" || "baixa") {
    prioFixed = "media"
  } 

  db.adicionarTask({ title, priority: prioFixed, tags, status: 'pendente' });
  console.log("Task added successfully!");
  return
}
