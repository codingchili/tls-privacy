import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Overleaf extends Site {

    constructor(browser) {
        super(browser, 'http://192.168.0.114:5180');
    }

    static pages() {
        return ['/'];
    }
}