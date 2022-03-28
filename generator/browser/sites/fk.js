import {Site} from '../site.js';

/**
 * Shared test code for pages.
 */
export default class FK extends Site {

    constructor(browser) {
        super(browser, 'https://www.forsakringskassan.se');
    }

    pages() {
        return [
            '/privatpers/foralder/adoptera_barn/adoptionsbidrag',
            '/privatpers/sjuk/anstalld/sjukpenning',
            '/privatpers/sjuk/om-du-skadat-dig-under-militar-utbildning-eller-vid-verksamhet-inom-det-civila-forsvaret'
        ]
    }
}