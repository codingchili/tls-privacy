import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class Portainer extends Site {

    constructor(browser) {
        super(browser, 'http://192.168.0.114:9000');
    }

    static pages() {
        return ['/'];
    }
}