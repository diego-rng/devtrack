import { workerData, parentPort } from 'worker_threads'

const { arquivo, tipo } = workerData; 

const result = arquivo.map((res) => {


    return {
        lines: res.split("\n").length,
        words: res.split(" ").length
    }
})