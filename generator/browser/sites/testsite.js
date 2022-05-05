import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class TestSite extends Site {

    constructor(browser) {
        super(browser, 'https://localhost');
    }

    static pages() {
        return [
            '/16b-file.html',
            '/32b-file.html',
            '/64b-file.html',
            '/128b-file.html',
            '/256b-file.html',
            '/512b-file.html',

            '/1k-file.html',
            '/2k-file.html',
            '/4k-file.html',
            '/8k-file.html',
            '/16k-file.html',

            '/32k-file.html',
            '/48k-file.html',
            '/64k-file.html',
            '/128k-file.html',
            '/256k-file.html',
            '/512k-file.html'
        ];
    }
}