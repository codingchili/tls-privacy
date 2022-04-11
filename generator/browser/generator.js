import {Browser, delay} from './browser.js'
import {Notifier} from "./notifier.js";
import {Progress} from "./../util/progress.js";
import {Logger} from "./../util/logger.js";
import {Ansi} from "./../util/ansi.js";

const LANDING_PAGE = 'about:blank';

export class Generator {

    /**
     * Generates page loads using browser automation.
     * @param loads the number of loads per page.
     * @param delay delay between page loads.
     * @param cache indicates if caching is allowed or not.
     * @param notifier the port that the notifier is listening on.
     */
    constructor(loads, delay, cache, notifier) {
        this.notifier = Notifier.instance(notifier);
        this.loads = loads;
        this.delay = delay;
        this.initialized = false;
        this.cache = cache;
        Logger.info(`starting generator with ${Ansi.cyan(loads.toLocaleString())} load(s) per page and delay ${Ansi.cyan(`${delay}`)}s.`);
    }

    /**
     * Starts generating requests for the given site.
     * @param site_creator constructor for a site implemented in browser/sites/*.
     * @returns {Promise<void>}
     */
    async generate(site_creator) {
        await this.initialize();
        let site = new site_creator(this.page);
        let current = 0, page, siteName;
        let max = this.loads * site_creator.pages().length;

        this.progress = new Progress(() => {
            let percent = ((current / max) * 100).toFixed(0);
            return `${Progress.bar(current, max)} requests ${Ansi.cyan(percent)}%, [${Ansi.cyan(current)}/${Ansi.cyan(max)}] ${Ansi.yellow(siteName)} (${Ansi.cyan(page)})`;
        }).begin();

        for (let i = 0; i < this.loads; i++) {
            for (page of site_creator.pages()) {
                try {
                    this.progress.update(() => {
                        siteName = site.constructor.name.toLowerCase();
                        current++
                    });
                    await this.notifier.notify(`${site.constructor.name}${page}`);
                    await site.navigate(page);
                    await delay(this.delay);
                } catch (e) {
                    this.progress.end();
                    Logger.error(e);
                    return;
                }
            }
        }
        this.progress.end();
    }

    async initialize() {
        if (!this.initialized) {
            Logger.info(`cache is ${this.cache ? Ansi.green('enabled') : Ansi.red('disabled')}.`);
            this.listeners();
            await this.create_browser();
            this.initialized = true;
        }
    }

    listeners() {
        process.once('SIGINT', () => {
            this.progress.end();
            Logger.warning(`got ${Ansi.red('exit')} signal, terminating.`);
            this.close(); // exit listeners must be synchronous.
        });
    }

    async create_browser() {
        let current = 0;
        let bar = new Progress(() => `${Progress.bar(current)} initializing generator.. [${Ansi.cyan(current)}%]`).begin();
        let proceed = (result, progress) => {
            bar.update(() => current = progress);
            return result;
        }
        this.browser = proceed(await Browser.start({cache: this.cache}), 25);
        this.page = proceed((await this.browser.pages())[0], 50);
        proceed(await this.page.goto(LANDING_PAGE, {waitUntil: 'networkidle0'}), 75);
        proceed(await this.page.setCacheEnabled(this.cache), 100);
        bar.end();
    }

    async close() {
        Logger.info('shutting down generator..');
        await this.notifier.exit();
        await this.page.close();
        await this.browser.close();
    }
}