import * as http from "http";
import fs from 'fs/promises';
import {performance} from 'perf_hooks';

import {Logger} from "./../util/logger.js";
import {Ansi} from "./../util/ansi.js";

const files = {};
const EXFIL_LOG = 'ex.jsonl';

export async function serve(host, port, resources) {
    if (!resources.includes('/')) {
        resources = `browser/ripped/${resources}`;
    }
    if (!resources.endsWith('/')) {
        resources += '/';
    }
    Logger.info(`Loading files from '${Ansi.cyan(resources)}' into ${Ansi.red('memory')}..`);
    // load dirtree into memory for performance and security.
    for await (let file of walkdir(resources)) {
        let webpath = file.path.replace(resources, '/');
        files[webpath.toLowerCase()] = {data: await fs.readFile(file.path), path: file.path};

        if (webpath.endsWith('index.html')) {
            let alias = webpath.replace(/(?<=.+?)\/?(index.html)/gi, '');
            files[alias] = files[webpath];
        }
        Logger.info(`\t${Ansi.cyan(webpath)}`);
    }
    http.createServer(listener).listen(port, host, () =>
        Logger.info(`${Ansi.green('server')} listening on ${Ansi.cyan(host)} port ${Ansi.cyan(port)}.`));
}

function sniff(path) {
    if (path.endsWith('.svg')) return "image/svg+xml";
    if (path.endsWith('.png')) return "image/png";
    if (path.endsWith('.html')) return "text/html";
    if (path.endsWith('.css')) return "text/css";
    return '';
}

const listener = async (req, res) => {
    let start = performance.now();
    let url = req.url.split('?')[0].toLowerCase();

    if (url.length > 1) {
        // policy: drop trailing slashes to treat endpoints as files not directories.
        url = url.replace(/\/$/, '');
    }

    access(req, res, url, (performance.now() - start).toFixed(1));

    if (url === `/${EXFIL_LOG}`) {
        let body = [];
        req.on('data', (chunk) => body.push(chunk))
        req.on('end', async () => {
            body.push(Buffer.from('\n', 'utf-8'));
            respond(res, null, 'application/json');
            await fs.appendFile(EXFIL_LOG, Buffer.concat(body), 'utf8');
        })
    } else if (files[url]) {
        respond(res, files[url].data, sniff(files[url].path))
    } else {
        missing(res);
    }
};

function respond(res, data, type) {
    res.writeHead(200, {"Content-Type": type});
    res.end(data);
}

function missing(res) {
    let missing = '/404/index.html';
    res.writeHead(404);
    if (files[missing]) {
        res.end(files[missing].data)
    } else {
        res.end('page not found.');
    }
}

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