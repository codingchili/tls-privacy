import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Umo extends Site {

    constructor(browser) {
        super(browser, 'https://umo.se');
    }

    pages() {
        return [
            '/jag',
            '/karlek-och-vanskap/',
            '/tobak-alkohol-droger/droger/',
            '/tobak-alkohol-droger/alkohol/',
            '/tobak-alkohol-droger/rokning/',
            '/tobak-alkohol-droger/alkohol/sa-paverkas-kroppen-av-alkohol/'
        ];
    }
}