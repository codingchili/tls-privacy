import {Notifier} from './notifier.js'

export class Site {

    constructor(browser, url) {
        this._notifier = Notifier.instance();
        this._url = url;
        this._browser = browser;
        this._errors = [];
        this.page.on("error", (e) => this._errors.push(e));
        this.page.on("pageerror", (e) => this._errors.push(e));
    }

    get notifier() {
        return this._notifier;
    }

    pages() {
        throw new Error('Site must implement the pages method to return all available pages.');
    }

    get errors() {
        return this._errors.length > 0;
    }

    get page() {
        return this._browser;
    }

    async screenshot(fileName = "screenshot") {
        return await this.page.screenshot({path: `${fileName}.png`});
    }

    async close() {
        await this.page.browser().close();
    }

    async navigate(uri) {
        this._errors = [];
        let url = `${this._url}${uri}`;
        await this._notifier.notify(url);
        await this._browser.goto(url, {waitUntil: 'networkidle2'});
        return this._browser;
    }
}