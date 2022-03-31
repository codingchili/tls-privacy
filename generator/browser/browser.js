import puppeteer from "puppeteer";

const CACHE = './.cache';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36';

export async function delay(seconds) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), seconds * 1000);
    });
}

export class Browser {
    static async start() {
        let headless = true;
        let browser;

        if (headless) {
            browser = await puppeteer.launch({
                userDataDir: CACHE,
                headless: headless,
                slowMo: 0,
                defaultViewport: null
            });
        } else {
            browser = await puppeteer.launch({
                userDataDir: CACHE,
                headless: headless,
                slowMo: 0,
                defaultViewport: null
            });
        }
        let page = (await browser.pages())[0]
        await page.setUserAgent(UA);
        return browser;
    }
}