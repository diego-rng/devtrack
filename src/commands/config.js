import { readEnv } from "../utils/config";

const config = readEnv();

export function registerConfig(program) {
  program
    .command('config <--list>')
    .description('Exibe as configurações atuais do devtrack')
    .action(() => {
      console.log(JSON.stringify(config));
    });
}
