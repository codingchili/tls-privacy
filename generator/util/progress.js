import {Ansi} from './ansi.js';

const WIDTH = 27;

export class Progress {

    constructor(template) {
        this.template = template;
        this.update();
        this.active = false;
    }

    begin() {
        this.write(Ansi.hide());
        this.active = true;
        return this;
    }

    end() {
        if (this.active) {
            this.active = false;
            this.write(`${Ansi.show()}\n`);
        }
        return this;
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

    static percent(current, max) {
        return ((current / (max ?? 100)) * 100).toFixed(0);
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