#!/usr/bin/node
import 'argparse';
import fs from 'fs';

import {Logger} from './util/logger.js';
import {Ansi} from './util/ansi.js';
import {ArgumentParser, SUPPRESS} from "argparse";
import {Generator} from "./browser/generator.js";
import {serve} from "./server/server.js";
import {rip} from "./server/ripper.js";
import {beacon} from "./server/beacon.js";

const SITE_LOCATION = './browser/sites/'
const version = JSON.parse(
    fs.readFileSync('./package.json', 'utf8')
)['version'];

const parser = new ArgumentParser({
    description: Ansi.green('Dataset generator and real-time monitoring of analyzer.'),
    add_help: false
})

async function generate(args) {
    let sites = args.sites.split(',')
        .filter(site => site.match(/[a-z]/mg));

    Logger.info(`generating data for ${Ansi.cyan(sites.length)} site(s).`);
    let generator = new Generator(args.count, args.delay, args.cache, args.nak);

    for (let site of sites) {
        await generator.generate((await import(`${SITE_LOCATION}${site}.js`)).default);
    }
    await generator.close();
}

function sites() {
    Logger.info(`Following sites are available\n\t[${fs.readdirSync(SITE_LOCATION)
        .map(site => site.replace('.js', ''))
        .map(site => Ansi.cyan(site))
    }]`);
}

function monitor() {
    Logger.error('monitor mode is not implemented.');
}

async function server(args) {
    // read multiple injection payloads into a single buffer.
    let inject = args.inject?.split(',')
        .map(inject => fs.readFileSync((inject.includes('/')) ? inject : `../data/payloads/${inject}.html`))
        .reduce((buffer, item) => Buffer.concat([buffer, item]), Buffer.from('\n'));

    await serve(args.bind, args.port, args.resources, inject, args.tls, args.compress, args.h2 ? 2 : 1);
}

async function forge(args) {
    await rip(args.url, args.out, {
        follow: args.follow,
        missing: args.missing,
        favicon: args.favicon
    });
}

function start_beacon(args) {
    beacon(args.name, args.ip);
}

let subparser = parser.add_subparsers({
    help: "",
    title: Ansi.cyan('Available commands'),
    //description: 'available commands'
})

parser.add_argument('-v', '--version', {action: 'version', version, help: ''});
parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});

let forgery_parser = subparser.add_parser('forge', {help: 'Create a static copy of a remote website for the webserver', add_help: false});
forgery_parser.add_argument('url', {help: 'create a mock clone of the given site.', metavar: 'URL'});
forgery_parser.add_argument('-o', {help: 'name of web folder to store site in.', metavar: 'NAME', dest: 'out'});
forgery_parser.add_argument('-f', {help: 'depth of a-href links to follow. (0)', metavar: 'NUM', dest: 'follow'});
forgery_parser.add_argument('--missing', {help: 'attempt to clone the 404 page.', action: 'store_true'});
forgery_parser.add_argument('--favicon', {help: 'explicitly download favicon.ico.', action: 'store_true'});
forgery_parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});
forgery_parser.set_defaults({func:forge})

let server_parser = subparser.add_parser('serve', {help: 'Serve static websites that the generator can target', add_help: false})
server_parser.add_argument('resources', {
    help: '../data/ripped directory to serve resources from.',
    metavar: 'DIR'
});
server_parser.add_argument('--bind', {
    help: 'bind webserver to given hostname.',
    default: '0.0.0.0',
    nargs: '?',
    metavar: 'BIND'
});
server_parser.add_argument('-p', {help: 'port to run the webserver on.', default: 9000, metavar: 'NUM', dest: 'port'});
server_parser.add_argument('-i', {help: 'payload to inject into html content.', metavar: 'NAME', dest: 'inject'});
server_parser.add_argument('-t', {help: 'run http server with tls enabled.', action: 'store_true', dest: 'tls'});
server_parser.add_argument('-c', {help: 'compress with br or gzip.', metavar: 'ALG', dest: 'compress'});
server_parser.add_argument('-h2', {help: 'enable server http/2.', action: 'store_true'});
server_parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});
server_parser.set_defaults({func: server})

let sites_parser = subparser.add_parser('sites', {help: 'list available sites.', add_help: false})
sites_parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});
sites_parser.set_defaults({func: sites})

let generator_parser = subparser.add_parser('generate', {help: 'Generate web traffic for the analyzers sniffer module', add_help: false})
generator_parser.add_argument('sites', {help: 'generate data, sites separated by comma.', metavar: 'SITE'});
generator_parser.add_argument('-c', '--cache', {action: 'store_true', help: 'enable browser cache.', dest: 'cache'});
generator_parser.add_argument('-nak', {action: 'store_true', help: 'skip waiting for acknowledgements.'});
generator_parser.add_argument('-d', {help: 'pause between page loads', default: 3, metavar: 'SEC', dest: 'delay'});
generator_parser.add_argument('-n', {
    help: 'number of page loads to generate.',
    default: 10,
    metavar: 'NUM',
    dest: 'count'
});
generator_parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});
generator_parser.set_defaults({func: generate});


let beacon_parser = subparser.add_parser('beacon', {help: 'Multicast DNS beacon for hostname simulation', add_help: false});
beacon_parser.add_argument('ip', {help: 'the host ip of the mDNS response.', metavar: 'ADDR'});
beacon_parser.add_argument('name', {help: 'Runs a mDNS beacon to announce the given host.', metavar: 'NAME'});
beacon_parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});
beacon_parser.set_defaults({func: start_beacon})

let monitor_parser = subparser.add_parser('monitor', {help: 'monitor replay, requires a running analyzer.', add_help: false})
monitor_parser.add_argument('-h', '--help', {action: 'help', help: SUPPRESS});
monitor_parser.set_defaults({func: monitor});

let args = parser.parse_args();

if (args.func) {
    args.func(args);
} else {
    parser.print_help();
}