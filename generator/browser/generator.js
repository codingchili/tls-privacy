import {Browser, delay} from './browser.js'
import {Notifier} from "./notifier.js";
import {Progress} from "./../util/progress.js";
import {Logger} from "./../util/logger.js";
import {Ansi} from "./../util/ansi.js";

export class Generator {

    constructor(loads, delay) {
        Notifier.instance();
        this.loads = loads;
        this.delay = delay;
        this.initialized = false;
        Logger.info(`starting generator with ${Ansi.cyan(loads.toLocaleString())} loads per page and delay ${Ansi.cyan(`${delay}`)}s`);
    }

    async initialize() {
        if (!this.initialized) {
            let current = 0;
            let progress = new Progress(() => `${Progress.bar(current)} initializing generator.. [${current}%]`);
            progress.begin();

            this.browser = await Browser.start()
            progress.update(() => current = 50);

            this.page = (await this.browser.pages())[0];
            progress.update(() => current = 75);

            await this.page.setCacheEnabled(true)
            progress.update(() => current = 100);
            progress.end();

            this.initialized = true;
        }
    }

    async generate(site) {
        await this.initialize();
        site = new site(this.page);

        let current = 0, page, siteName;
        let max = this.loads * site.pages().length;
        let progress = new Progress(() =>
            `${Progress.bar(current, max)} requests [${current}/${max}] ${siteName} (${page})`);

        progress.begin();

        for (let i = 0; i < this.loads; i++) {
            for (page of site.pages()) {
                progress.update(() => {
                    siteName = site.constructor.name.toLowerCase();
                    current++
                });
                await site.navigate(page);
                await delay(this.delay);
            }
        }
        progress.end();
    }

    async close() {
        Logger.info('shutting down generator..');
        await Notifier.instance().exit();
        await this.page.close();
        await this.browser.close();
        Logger.info('generator was shut down.');
    }
}

