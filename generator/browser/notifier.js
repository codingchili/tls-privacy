import * as fs from 'fs';
import {Logger} from '../util/logger.js';

// wait a few MS for the reader to pick up the write.
const WRITE_DELAY = 50;

export class Notifier {
    static _instance = null;

    constructor(file) {
        this.file = file;
    }

    async exit() {
        await this.notify('exit', 0);
    }

    async notify(message, delay) {
        delay = delay || WRITE_DELAY;
        return new Promise(async (resolve, reject) => {
            fs.appendFile(this.file, `${message}\n`, 'utf8', () => {
                setTimeout(() => resolve(), delay);
            });
        })
    }

    static instance() {
        if (Notifier._instance == null) {
            let address = '../bus/analyzer.bus';
            Logger.info(`notifier is using bus file '${address}'.`);
            Notifier._instance = new Notifier(address);
        }
        return Notifier._instance;
    }
}