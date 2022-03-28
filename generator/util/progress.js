import {Ansi} from './ansi.js';

const WIDTH = 32;

export class Progress {

    constructor(template) {
        this.template = template;
        this.update();
    }

    begin() {
        this.write(Ansi.hide());
    }

    end() {
        this.write(`${Ansi.show()}\n`);
    }

    update(updater) {
        if (updater) {
            updater();
        }
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        this.write(this.template())
    }

    write(msg) {
        process.stdout.write(msg);
    }

    static bar(current, max) {
        max = max || 100;
        let progress = current / max;
        let block = Math.trunc(progress * WIDTH);
        let space = WIDTH - block;
        let color = (progress < 0.25 ? Ansi.red : (progress < 0.75) ? Ansi.yellow : Ansi.green)
        return `[${color('#'.repeat(block) + ' '.repeat(space))}]`;
    }
}