import dgram from 'dgram';
import {Logger} from '../util/logger.js';
import {Ansi} from '../util/ansi.js';

// packet structure and defaults.
const txid = [0x00, 0x00];
const flags = [0x84, 0x00];
const questions = [0x00, 0x00];
const rrs = [0x0, 0x01]; // one resource record in response.
const authority = [0x0, 0x0];
const additional = [0x0, 0x0];
const type = [0x00, 0x01]; // A-record.
const rclass = [0x00, 0x01];
const ttl = [0x0, 0x0, 0x0, 0x3c]; // 60s.
const len = [0x00, 0x04] // length of ipv4 address.

const MDNS_PORT = 5353;
// mdns listener 5353 is likely bound but any port works with gratuitous responses.
const SOURCE_PORT = 0;
const TLD = 'local';
const MDNS_IP = `224.0.0.251`;
const server = dgram.createSocket('udp4');

/**
 * Publishes mDNS responses gratuitously for the given domain name and ip pair.
 * @param dn the domain name to publish, should not include .local or known tld's.
 * @param ip the ip address that is multicast as the A-record RR address.
 */
export function beacon(dn, ip) {
    server.on('error', error);
    server.on('message', message);
    server.on('listening', () => {
        const address = server.address();
        Logger.info(`server listening ${address.address}:${address.port}`);
        Logger.info(`beacon is periodically publishing gratuitous responses.`)

        setInterval(() => {
            server.send(mdns_packet(dn, TLD, ip), MDNS_PORT, MDNS_IP);
            Logger.info(`beacon pushed ${Ansi.yellow(`${dn}.${TLD}`)} at ${Ansi.yellow(ip)}.`)
        }, 500);
    });
    server.bind(SOURCE_PORT);
}

function message(buffer, info) {
    // not handling responses yet, only valuable if default mDNS service is disabled.
    Logger.info(`<< ${buffer.toString()} (${info.address}:${info.port})`);
}

function error(err) {
    Logger.warning(err);
    server.close();
}

function mdns_packet(host, tld, ip) {
    return Buffer.from([
        txid, flags, questions, rrs, authority, additional,
        hex_hostname(host, tld), type, rclass, ttl, len, hex_ip(ip)
    ].flat());
}

function hex_hostname(name, tld) {
    let convert = (name) => Array.from(name).map(e => e.charCodeAt(0));
    return [name.length, convert(name), tld.length, convert(tld), 0x00].flat();
}

function hex_ip(address) {
    return address.split('.').map(e => parseInt(e));
}
