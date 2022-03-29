import puppeteer from "puppeteer";

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
                userDataDir: './.cache',
                headless: headless,
                slowMo: 0,
            });
        } else {
            browser = await puppeteer.launch({
                userDataDir: './.cache',
                headless: headless,
                slowMo: 0,
            });
        }
        return browser;
    }
}