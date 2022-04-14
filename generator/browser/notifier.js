import dgram from "dgram";
import {Logger} from '../util/logger.js';
import {Ansi} from '../util/ansi.js';

const NOTIFY_TIMEOUT = 1000;

export class Notifier {
    static _instance = null;

    /**
     * Creates a new notifier and udp socket that is used for IPC with the analyzer.
     * This is required in order to label page loads to support encrypted traffic.
     * @param port that the remote analyzer is listening on.
     */
    static instance(port) {
        if (Notifier._instance == null) {
            Notifier._instance = new Notifier("127.0.0.1", port ?? 9555);
        }
        return Notifier._instance;
    }

    /**
     * @param ip the file to use, should match the analyzer.
     * @param port the file to use, should match the analyzer.
     */
    constructor(ip, port) {
        this.callbacks = [];
        this.ip = ip;
        this.port = port;
        this.server = dgram.createSocket('udp4');
        this.server.on('listening', this.listening.bind(this));
        this.server.on('error', this.error.bind(this));
        this.server.on('message', this.message.bind(this));
        this.server.bind(0);
    }

    message(buffer) {
        let response = JSON.parse(buffer);

        this.callbacks.forEach(callback => {
            if (response.acknowledged) {
                callback.resolve();
            } else {
                callback.reject(new Error(JSON.stringify(response)));
            }
        });
        this.callbacks = [];
    }

    listening() {
        let address = this.server.address();
        Logger.info(`notifier listening on '${Ansi.cyan(address.address)}:${Ansi.cyan(address.port)}'.`);
    }

    error(err) {
        Logger.warning(err);
    }

    async exit() {
        try {
            await this.notify('exit');
        } catch (e) {
            // ignored.
        } finally {
            await this.server.close();
        }
    }

    async notify(message) {
        this.server.send(JSON.stringify({
            message: message,
            exit: message === 'exit'
        }), this.port, this.ip);
	return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => reject(`timed out waiting for notification ack.`), NOTIFY_TIMEOUT);
            this.callbacks.push({
                resolve: () => {
                    clearTimeout(timeout);
                    resolve();
                },
                reject: () => {
                    clearTimeout(timeout);
                    reject();
                }
            });
        });
    }
}
