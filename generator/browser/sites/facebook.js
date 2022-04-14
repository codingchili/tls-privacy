import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Facebook extends Site {

    constructor(browser) {
        super(browser, 'http://192.168.0.114:8082');
    }

    static pages() {
        return [
            '/'
        ]
    }
}