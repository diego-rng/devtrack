import fs from 'fs'
import path from 'path'
import os from 'os'

export function readEnv() {
    const temp = fs.readFileSync(path.normalize('.env'), 'utf-8')
    const obj = {}
    const choices = temp.split('\n').forEach(line => {
        if (!line || line.startsWith('#')) return
        const [key, ...rest] = line.split('=')
        if (key) obj[key.trim()] = rest.join('=').trim();
    });
    const config = { 
        porta: obj.PORT ? obj.PORT : '3000',
        githubToken: obj.GITHUB_TOKEN ? '*********************************************************************************************' : 'Não definido', 
        dataDir: './data/',
        debug: obj.DEBUG ? true : false,
        maxWorkers: os.cpus().length,
        webhookURL: null
    }
    return config
}