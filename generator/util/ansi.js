export class Ansi {
    static show() {
        return '\x1B[?25h';
    }

    static hide() {
        return '\x1B[?25l';
    }

    static clear() {
        return '\x1B[2J';
    }

    static escape(id, message) {
        return `\u001b[${id}m${message}\u001b[0m`;
    }

    static red(message) {
        return Ansi.escape(31, message);
    }

    static green(message) {
        return Ansi.escape(32, message);
    }

    static yellow(message) {
        return Ansi.escape(33, message);
    }

    static blue(message) {
        return Ansi.escape(34, message);
    }

    static magenta(message) {
        return Ansi.escape(35, message);
    }

    static cyan(message) {
        return Ansi.escape(36, message);
    }
}