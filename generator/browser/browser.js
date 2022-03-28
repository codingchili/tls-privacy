import puppeteer from "puppeteer";

export async function delay(seconds) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), seconds * 1000);
    });
}

export class Browser {
    static async start() {
        let headless = true;
        let browser;

        if (headless) {
            // hack default args to enable webgl when running headless.
            // https://github.com/puppeteer/puppeteer/issues/3637
            const args = puppeteer.defaultArgs().filter(arg => arg !== '--disable-gpu');
            args.push('--use-gl=desktop');
            args.push('--headless');
            args.push('--proxy-server="direct://"')
            args.push('--proxy-bypass-list=*')
            browser = await puppeteer.launch({
                ignoreDefaultArgs: false,
                userDataDir: './datadir',
                args
            });
        } else {
            browser = await puppeteer.launch({
                userDataDir: './datadir',
                headless: false,
                slowMo: 0,
            });
        }
        return browser;
    }
}