import * as http from "http";
import fs from 'fs/promises';
import {performance} from 'perf_hooks';

import {Logger} from "./../util/logger.js";
import {Ansi} from "./../util/ansi.js";

const files = {};


export async function serve(host, port, resources) {
    if (!resources.endsWith('/')) {
        resources += '/';
    }
    Logger.info(`Loading files from '${Ansi.cyan(resources)}' into ${Ansi.red('memory')}..`);
    // load dirtree into memory for performance and security.
    for await (let file of walkdir(resources)) {
        let webpath = file.path.replace(resources, '/');
        files[webpath.toLowerCase()] = await fs.readFile(file.path, 'utf8')

        if (webpath.endsWith('index.html')) {
            // alias '/' to index.html and allow direct references.
            files[webpath.replace('index.html', '')] = files[webpath];
        }
        Logger.info(`\t${Ansi.cyan(webpath)}`);
    }
    //Logger.info(`loaded ${Ansi.red(`${files.map(file => file.data.length).reduce((sum, a) => (sum/1000) + a, 0).toFixed(0)}kb`)}`)
    http.createServer(listener).listen(port, host, () => {
        Logger.info(`${Ansi.green('server')} listening on ${Ansi.cyan(host)} port ${Ansi.cyan(port)}.`);
    });
}

function sniff(url) {
    if (url.endsWith('.svg')) return "image/svg+xml";
    if (url.endsWith('.png')) return "image/png";
    return '';
}

const listener = (req, res) => {
    let start = performance.now();
    let url = req.url.split('?')[0].toLowerCase();

    if (files[url]) {
        res.writeHead(200, {
            "Content-Type": sniff(url)
        });
        res.end(files[url]);
    } else {
        res.writeHead(400);
        res.end('page not found');
    }
    access(req, res, url, (performance.now() - start).toFixed(1));
};

function access(req, res, url, time) {
    Logger.info(`${Ansi.red(req.method)} ${Ansi.yellow(res.statusCode)} [${Ansi.red(time + 'ms')}] - ${Ansi.cyan(url)} - ${req.headers['user-agent']?.substring(0, 48)}..`);
}


async function* walkdir(path = './') {
    const list = await fs.readdir(path, {withFileTypes: true});

    for (let item of list) {
        if (item.isDirectory()) {
            yield* walkdir(`${path}${item.name}/`)
        } else {
            yield {...item, path: `${path}${item.name}`}
        }
    }
}
