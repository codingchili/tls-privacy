import {Site} from '../site.js';


const HOST = 'http://192.168.0.149:8080';

/**
 * Shared test code for pages.
 */
export default class Umo extends Site {

    constructor(browser) {
        super(browser, HOST);
    }

    pages() {
        return [
            '/',
            '/jag/jamstalldhet/vad-ar-jamstalldhet/',

            '/tobak-alkohol-droger/rokning/att-sluta-roka/',
            '/tobak-alkohol-droger/alkohol/dricka-for-mycket-eller-for-ofta/',
            '/tobak-alkohol-droger/droger/att-anvanda-droger/',
            '/tobak-alkohol-droger/dopning/',

            '/sex/konssjukdomar/klamydia/',
            '/sex/konssjukdomar/kondylom/',
            '/sex/konssjukdomar/gonorre/',
            '/sex/konssjukdomar/syfilis/',
        ];
    }
}