import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class TestSite extends Site {

    constructor(browser) {
        super(browser, 'http://192.168.0.102:8082');
    }

    pages() {
        return [
            '/512b-file.html',
            '/1k-file.html',
            '/2k-file.html',
            '/4k-file.html',
            '/8k-file.html',
           // '/16k-file.html',
            //'/32k-file.html',
            //'/48k-file.html',
            //'/64k-file.html',
            //'/128k-file.html',
            //'/256k-file.html',
            //'/512k-file.html'
        ];
    }
}