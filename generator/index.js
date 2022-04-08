#!/usr/bin/node
import 'argparse';
import fs from 'fs';

import {Logger} from './util/logger.js';
import {Ansi} from './util/ansi.js';
import {ArgumentParser} from "argparse";
import {Generator} from "./browser/generator.js";
import {serve} from "./browser/server.js";
import {rip} from "./browser/ripper.js";
import {beacon} from "./browser/beacon.js";

const SITE_LOCATION = './browser/sites/'
const version = JSON.parse(
    fs.readFileSync('./package.json', 'utf8')
)['version'];

const parser = new ArgumentParser({
    description: Ansi.green('Dataset generator and real-time monitoring of analyzer.'),
    add_help: true
})

parser.add_argument('-v', '--version', {action: 'version', version, 'help': ''});

let monitoring = parser.add_argument_group(Ansi.magenta('Monitor and replay network traffic in real time using the analyzer'));
monitoring.add_argument('--monitor', {action: 'store_true', help: 'monitor replay, requires a running analyzer.'});

let generator = parser.add_argument_group(Ansi.magenta('Generate web traffic for the analyzers sniffer module'))
generator.add_argument('--generate', {help: 'generate data, sites separated by comma.', metavar: 'SITE'});
generator.add_argument('-l', '--list', {action: 'store_true', help: 'list available sites.'});
generator.add_argument('--cache', {action: 'store_true', help: 'enable browser cache.'});
generator.add_argument('-n', '--notifier', {
    help: 'remote port for the notifier to use.',
    default: 9555,
    metavar: 'NUM'
});
generator.add_argument('-c', '--count', {help: 'number of page loads to generate.', default: 10, metavar: 'NUM'});
generator.add_argument('-d', '--delay', {help: 'pause between page loads', default: 3, metavar: 'SEC'});

let server = parser.add_argument_group(Ansi.magenta('Serve static websites that the generator can target'))
server.add_argument('--web', {
    help: 'bind webserver to given hostname.',
    const: 'localhost',
    metavar: 'BIND',
    nargs: '?'
});
server.add_argument('-p', '--port', {help: 'port to run the webserver to.', default: 9000});
server.add_argument('-r', '--res', {
    help: 'directory to serve resources from.',
    default: './browser/ripped',
    metavar: 'DIR'
});
server.add_argument('-i', '--inject', {help: 'javascript file to inject into html heads.', metavar: ''});

let forgery = parser.add_argument_group(Ansi.magenta('Create a static copy of a remote website for the webserver'))
forgery.add_argument('--forge', {help: 'create a mock clone of the given site.', metavar: 'URL'});
forgery.add_argument('-o', '--out', {help: 'name of web folder to store site in.', metavar: 'NAME'});
forgery.add_argument('-f', '--follow', {help: 'depth of a-href links to follow. (0)', metavar: 'NUM'});
forgery.add_argument('--missing', {help: 'attempt to clone the 404 page.', action: 'store_true'});
forgery.add_argument('--favicon', {help: 'explicitly download favicon.ico.', action: 'store_true'});

let beacon_group = parser.add_argument_group(Ansi.magenta('Multicast DNS beacon for hostname simulation'))
beacon_group.add_argument('--beacon', {help: 'Runs a mDNS beacon to announce the given host.', metavar: 'NAME'});
beacon_group.add_argument('--ip', {help: 'the host ip of the mDNS response.', metavar: 'ADDR'});

let args = parser.parse_args();
let actions = [args.list, args.monitor, args.generate, args.web, args.forge, args.beacon].filter(item => item)

async function generate(sites, count, delay, cache, notifier) {
    Logger.info(`generating data for ${Ansi.cyan(sites.length)} site(s).`);
    let generator = new Generator(count, delay, cache, notifier);

    for (let site of sites) {
        await generator.generate((await import(`${SITE_LOCATION}${site}.js`)).default);
    }
    await generator.close();
}

function list() {
    Logger.info(`Following sites are available\n\t[${fs.readdirSync(SITE_LOCATION)
        .map(site => site.replace('.js', ''))
        .map(site => Ansi.cyan(site))
    }]`);
}

function monitor() {
    Logger.error('monitor mode is not implemented.');
}

async function parse(args) {
    if (actions.length === 0) {
        Logger.info('no actions specified, try -h for help.')
    } else if (actions.length > 1) {
        Logger.error('please specify a single action.')
    } else {
        if (args.generate) {
            let sites = args.generate.split(',')
                .filter(site => site.match(/[a-z]/mg));

            await generate(sites, args.count, args.delay, args.cache, args.notifier);
        }
        if (args.web) {
            // read multiple injection payloads into a single buffer.
            let inject = args.inject?.split(',')
                .map(inject => fs.readFileSync((inject.includes('/')) ? inject : `./browser/payloads/${inject}.html`))
                .reduce((buffer, item) => Buffer.concat([buffer, item]), Buffer.from('\n'));

            await serve(args.web, args.port, args.res, inject);
        }
        if (args.beacon) {
            beacon(args.beacon, args.ip);
        }
        if (args.list) list();
        if (args.monitor) monitor()
        if (args.forge) {
            await rip(args.forge, args.out, args.follow, args.missing, args.favicon);
        }
    }
}

parse(args);
