import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Google extends Site {

    constructor(browser) {
        super(browser, 'https://www.google.com');
    }

    static pages() {
        return [
            '/'
        ]
    }
}