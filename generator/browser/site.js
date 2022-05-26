export class Site {

    /**
     * @param browser browser instance.
     * @param url the url of the site.
     */
    constructor(browser, url) {
        this._url = url;
        this._browser = browser;
        this._errors = [];
        this.page.on("error", (e) => this._errors.push(e));
        this.page.on("pageerror", (e) => this._errors.push(e));
    }

    pages() {
        throw new Error('Site must implement the pages method to return all available pages.');
    }

    get url() {
        return this._url;
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
        await this._browser.goto(url, {waitUntil: 'networkidle0'});
        return this._browser;
    }
}