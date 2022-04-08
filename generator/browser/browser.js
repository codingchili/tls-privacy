import puppeteer from "puppeteer";

const CACHE = './.cache';
const INCONSPICUOUS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36';

/**
 * delay is used to support delays between page loads. This is important
 * when testing against online services to avoid request flooding.
 * @param seconds the delay in seconds.
 * @returns {Promise<unknown>}
 */
export async function delay(seconds) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), seconds * 1000);
    });
}

/**
 * Provides an instance of a puppeteer browser. The instance should be closed.
 */
export class Browser {
    static async start(options) {
        let headless = true;
        let browser;

        if (headless) {
            browser = await puppeteer.launch({
                userDataDir: options?.cache ? CACHE : null,
                headless: headless,
                slowMo: 0,
                defaultViewport: null,
                //ignoreHTTPSErrors: true
            });
        } else {
            browser = await puppeteer.launch({
                userDataDir: options?.cache ? CACHE : null,
                headless: headless,
                slowMo: 0,
                defaultViewport: null,
                //ignoreHTTPSErrors: true
            });
        }
        let page = (await browser.pages())[0]
        await page.setUserAgent(INCONSPICUOUS_UA);
        return browser;
    }

    static ua() {
        return INCONSPICUOUS_UA;
    }
}