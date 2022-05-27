import * as fs from 'fs';

import {Browser} from "./browser.js";
import {Notifier} from "./notifier.js";
import {Logger} from "../util/logger.js";
import {Ansi} from "../util/ansi.js";

const MIN_CONFIDENCE = 0.3;
const resources = './browser/resources/';

function parse_url(url, proxy) {
    let split = /(https:\/\/.+?)(\/.*)/gi;
    let groups = split.exec(url);
    return {
        domain: proxy ?? groups[1],
        path: groups[2],
        full: (proxy ?? groups[1]) + groups[2]
    }
}

export async function start_browser_monitor(live, proxy) {
    let browser = await Browser.start({
        headless: false,
        cache: true,
        ignoreHTTPSErrors: true
    })
    let page = (await browser.pages())[0];

    if (live) {
        if (proxy) {
            Logger.info(`using proxy server '${Ansi.cyan(proxy)}'.`);
        }
        Logger.info('browser started for live monitoring.');
        await page.setContent(load_resource('live-monitor.html'));

        Notifier.instance().onmessage((message) => handle_page_load(page, message, proxy));
    } else {
        await page.setContent(load_resource('browser-welcome.html'));
        Logger.info('browser environment started for manual testing.');
    }
}

async function handle_page_load(page, message, proxy) {
    let percent = (parseFloat(message.accuracy) * 100).toFixed(0);
    let url = parse_url(message.label, proxy);

    if (message.accuracy > MIN_CONFIDENCE) {
        Logger.info(`navigating to '${Ansi.yellow(url.path)}' - ${Ansi.green(percent)}%.`);
        try {
            await page.goto(url.full, {waitUntil: 'networkidle0'});
        } catch (e) {
            Logger.error(e.message);
            await page.waitForNetworkIdle();
            await setPageWithMessage(page, e.message ?? '');
        }
    } else {
        Logger.warning(`ignoring '${Ansi.yellow(url.path)}' - ${Ansi.red(percent)}%.`);
        await setPageWithMessage(page, `[ignored '${url.path}' - ${percent}%]`);
    }
}

async function setPageWithMessage(page, text) {
    try {
        await page.setContent(load_resource('live-monitor.html'));
        await page.evaluate((text) => setMessage(text), text);
    } catch (e) {
        // ignored.
    }
}

function load_resource(name) {
    return fs.readFileSync(`${resources}${name}`, 'utf8');
}