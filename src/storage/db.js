import { readFile, writeFile, rename } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(
  __dirname,
  path.normalize("../../data/devtrack.json"),
);

export async function lerDB() {
  if (!existsSync(DB_PATH, "utf-8")) {
    await writeFile(
      DB_PATH,
      '{ "version": "1.0", "projects": [], "tasks": [], "log": [] }',
    );
  }
  console.log(JSON.parse(await readFile(DB_PATH, "utf-8")))
  return;
}

export async function salvarDB(dados) {
  const temp = JSON.parse(await readFile(DB_PATH, "utf-8"));
  await writeFile(DB_PATH, dados);
}

export async function adicionarTask(task) {
  const newID = crypto.randomUUID();
  const content = JSON.parse(await readFile(DB_PATH, "utf-8"));

  if (!["pendente", "em_progresso", "concluida"].includes(task.status)) {
    return "ERROR: Invalid status";
  }

  if (!["alta", "media", "baixa"].includes(task.prioridade)) {
    return "ERROR: Invalid priority";
  }

  task.id = newID;
  task.criadaEm = new Date();
  task.atualizadaEm = task.criadaEm;
  content.tasks.push(task);

  await writeFile(DB_PATH, JSON.stringify(content, null, 2));

  return task;
}

export async function atualizarTask(id, campos) {
  const content = JSON.parse(await readFile(DB_PATH, "utf-8"));

  if (!content.tasks.some((task) => task.id === id)) {
    console.log("No task matches the ID provided.");
    return;
  }

  const identifier = content.tasks.findIndex((cont) => cont.id === id);

  if (campos.titulo != undefined) {
    content.tasks[identifier].titulo = campos.titulo;
  }

  if (campos.descricao != undefined) {
    content.tasks[identifier].descricao = campos.descricao;
  }

  if (campos.status != undefined) {
    if (["pendente", "em_progresso", "concluida"].includes(campos.status)) {
      content.tasks[identifier].status = campos.status;
    } else {
      console.log("Incorrect status");
      return;
    }
  }

  if (campos.prioridade != undefined) {
    if (["alta", "media", "baixa"].includes(campos.prioridade)) {
      content.tasks[identifier].prioridade = campos.prioridade;
    } else {
      console.log("Incorrect priority");
      return;
    }
  }

  if (campos.projeto != undefined) {
    content.tasks[identifier].projeto = campos.projeto;
  }

  if (campos.tags != undefined) {
    content.tasks[identifier].tags = campos.tags;
  }

  content.tasks[identifier].atualizadaEm = new Date();

  await writeFile(DB_PATH, JSON.stringify(content, null, 2));
  return;
}

export async function removerTask(id) {
  const content = JSON.parse(await readFile(DB_PATH, "utf-8"));

  if (content.tasks.some((task) => task.id === id)) {
    content.tasks.filter((task) => task.id != id);
    await writeFile(DB_PATH, JSON.stringify(content, null, 2));
    console.log("Task removed!");
  }
}

export async function listarTasks(filtro) {
  const content = JSON.parse(await readFile(DB_PATH, "utf-8"));
  if (filtro == undefined) {
    content.tasks.forEach((element) => {
      console.log(element);
    });
  } else {
    if (filtro.titulo != undefined) {
        content.tasks = content.tasks.filter(a => a.titulo === filtro.titulo)
    }
    if (filtro.descricao != undefined) {
        content.tasks = content.tasks.filter(a => a.descricao === filtro.descricao)
    }
    if (filtro.status != undefined) {
        content.tasks = content.tasks.filter(a => a.status === filtro.status)
    }
    if (filtro.prioridade != undefined) {
        content.tasks = content.tasks.filter(a => a.prioridade === filtro.prioridade)
    }
    if (filtro.projeto != undefined) {
        content.tasks = content.tasks.filter(a => a.projeto === filtro.projeto)
    }
    if (filtro.tags != undefined) {
        content.tasks = content.tasks.filter(a => !a.tags.includes(filtro.tags) )
    }
    console.log (content.tasks)
  }
}

const filter = {
  prioridade: "baixa",
};

lerDB()