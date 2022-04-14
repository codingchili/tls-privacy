import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Mutable extends Site {

    constructor(browser) {
        super(browser, 'http://192.168.0.114:2180');
    }

    static pages() {
        return ['/'];
    }
}