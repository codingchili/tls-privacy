import {Site} from '../site.js';

/**
 * Trying some random cat images.
 */
export default class InatGeo extends Site {

    constructor(browser) {
        super(browser, 'https://i.natgeofe.com');
    }

    static pages() {
        return [
            '/n/f0dccaca-174b-48a5-b944-9bcddf913645/01-cat-questions-nationalgeographic_1228126_square.jpg?w=64',
            '/n/9a40b638-b4c0-48ca-a3a1-f15f5e21bcc5/01-feral-cats-nationalgeographic_1152629_16x9.jpg?w=64',
            '/n/9135ca87-0115-4a22-8caf-d1bdef97a814/75552.jpg?w=64',
            '/n/3861de2a-04e6-45fd-aec8-02e7809f9d4e/02-cat-training-NationalGeographic_1484324_3x4.jpg?w=64',
            '/n/46b07b5e-1264-42e1-ae4b-8a021226e2d0/domestic-cat_thumb_square.jpg?w=64',
        ];
    }
}