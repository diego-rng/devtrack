import { projMap } from '../services/timeline';

export function registerTimeline(program) {
  program
    .command('timeline')
    .option('--limite')
    .option('--pagina')
    .option('--por-pagina')
    .argument('<project>')
    .action((args, opts) => {
      if (projMap.has(args)) {
        const tl = projMap.get(args)
        if (opts.limite) {
          let i = 0
          tl.toArray().forEach(element => {
            console.log(`- [ ${element.type} ] - ${element.description.slice(0, 10)}-... - ${element.timestamp}`)
            i++
            if (i == opts.limite) continue
          });  
        } else {
          tl.toArray().forEach(element => {
            console.log(`- [ ${element.type} ] - ${element.description.slice(0, 10)}-... - ${element.timestamp}`)
          });
        }
      }
    });
}
