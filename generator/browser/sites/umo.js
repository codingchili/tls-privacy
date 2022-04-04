import {Site} from '../site.js';

const HOST = 'http://192.168.0.114:8080';

/**
 * Shared test code for pages.
 */
export default class Umo extends Site {

    constructor(browser) {
        super(browser, HOST);
    }

    pages() {
        return [
            '/jag/jamstalldhet/vad-ar-jamstalldhet/',
            '/tobak-alkohol-droger/rokning/att-sluta-roka/',
            '/tobak-alkohol-droger/alkohol/dricka-for-mycket-eller-for-ofta/',
            '/tobak-alkohol-droger/droger/att-anvanda-droger/ ',
        ];
    }
}