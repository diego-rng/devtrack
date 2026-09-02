import { serveCall } from "../server";
import { readEnv } from "../utils/config";

const config = readEnv();

export function registerServe(program) {
  program
  .command('serve')
  .argument('[porta]', 'Porta para abrir o servidor', config.porta)
  .action(async (port) => {
    try {
      await serveCall(port);
    } catch (err) {
      console.error(err);
    }
  });
}