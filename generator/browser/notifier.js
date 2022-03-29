import * as fs from 'fs';
import {Logger} from '../util/logger.js';
import {Ansi} from '../util/ansi.js';

// wait a few MS for the reader to pick up the write.
const WRITE_DELAY = 50;

export class Notifier {
    static _instance = null;

    constructor(file) {
        this.file = file;
    }

    async exit(options) {
        await this.notify('exit', options);
    }

    async notify(message, options) {
        let delay = options?.delay ?? WRITE_DELAY;
        let sync = options?.sync ?? false;

        return new Promise(async (resolve) => {
            let delayed = () => setTimeout(() => resolve(), delay);
            let data = `${message}\n`;

            if (sync) {
                fs.appendFileSync(this.file, data, 'utf8');
                delayed();
            } else {
                fs.appendFile(this.file, data, 'utf8', delayed);
            }
        })
    }

    static instance() {
        if (Notifier._instance == null) {
            let address = '../bus/analyzer.bus';
            Logger.info(`notifier is using bus file '${Ansi.cyan(address)}'.`);
            Notifier._instance = new Notifier(address);
        }
        return Notifier._instance;
    }
}