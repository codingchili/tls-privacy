import dgram from "dgram";
import {Logger} from '../util/logger.js';
import {Ansi} from '../util/ansi.js';

export class Notifier {
    static _instance = null;

    /**
     * Creates a new notifier and backing file that is used for IPC with the analyzer.
     * This is required in order to label page loads to support encrypted traffic.
     */
    static instance() {
        if (Notifier._instance == null) {
            Notifier._instance = new Notifier("224.0.0.251", 9555);
        }
        return Notifier._instance;
    }

    /**
     * @param ip the file to use, should match the analyzer.
     * @param port the file to use, should match the analyzer.
     */
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.server = dgram.createSocket('udp4');
        this.server.addMembership(ip);
        this.server.on('listening', err => {
            Logger.info(`notifier listening on '${Ansi.cyan(ip)}:${Ansi.cyan(port)}' ..`);
        });
        this.server.on('error', err => {

        });
        this.server.on('message', msg => {
            console.log('got message');
        });
        this.server.bind(port, "0.0.0.0");
    }

    async exit(options) {
        await this.notify('exit', options);
    }

    async notify(message, options) {
        this.server.send(message, this.port, this.ip);
    }
}

Notifier.instance().notify('ping');