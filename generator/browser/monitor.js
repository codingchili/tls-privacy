import * as fs from 'fs';

import {Browser} from "./browser.js";
import {Notifier} from "./notifier.js";
import {Logger} from "../util/logger.js";
import {Ansi} from "../util/ansi.js";

const resources = './browser/resources/';

export async function start_browser_monitor(live) {
    let browser = await Browser.start({
        headless: false,
        cache: true
    })
    let page = (await browser.pages())[0];

    if (live) {
        Logger.info('browser started for live monitoring.');
        await page.setContent(load_resource('live-monitor.html'));

        Notifier.instance().onmessage(async (message) => {
            Logger.info(`navigating to '${Ansi.yellow(message.label)}'..`);

            if (message.accuracy > 0.5) {
                await page.goto(message.label, {waitUntil: 'networkidle0'});
            } else {
                await page.setContent(load_resource('live-monitor.html'));
            }
        });
    } else {
        await page.setContent(load_resource('browser-welcome.html'));
        Logger.info('browser environment started for manual testing.');
    }
}

function load_resource(name) {
    return fs.readFileSync(`${resources}${name}`, 'utf8');
}