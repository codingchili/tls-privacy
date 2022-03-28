import {Ansi} from './ansi.js';

const INFO = 'INFO';
const WARNING = 'WARNING';
const ERROR = 'ERROR';
const padding = 7;

export class Logger {
    static template = (level, message) =>
        `${Ansi.magenta(Logger.timestamp())} [${Logger.color(level)}] ${message}\n`;

    static format(format) {
        this.template = format;
    }

    static timestamp() {
        return new Date().toLocaleString();
    }

    static color(level) {
        return {
            INFO: Ansi.green,
            WARNING: Ansi.yellow,
            ERROR: Ansi.red,
        }[level](Logger.pad(level, padding));
    }

    static pad(text, length) {
        return text + ' '.repeat(length - text.length)
    }

    static info(message) {
        process.stdout.write(Logger.template(INFO, message));
    }

    static warning(message) {
        process.stdout.write(Logger.template(WARNING, message));
    }

    static error(message) {
        process.stderr.write(Logger.template(ERROR, message));
    }

    static clear() {
        process.stdout.write(Ansi.clear());
        process.stderr.write(Ansi.clear());
    }
}