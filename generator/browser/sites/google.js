import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Google extends Site {

    constructor(browser) {
        super(browser, 'http://192.168.0.114:8081');
    }

    pages() {
        return [
            '/'
        ]
    }
}