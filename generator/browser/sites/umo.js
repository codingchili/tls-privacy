import {Site} from '../site.js';

// run the server on port 443 with tls enabled.
// edit hosts or run the mDNS beacon for correct hostname.
// remember to create a matching certificate with dns names and trust it.
const HOST = 'https://umo';

/**
 * Shared test code for pages.
 */
export default class Umo extends Site {

    constructor(browser) {
        super(browser, HOST);
    }

    static pages() {
        return [
            // links used in preliminary testing.
            '/',
            '/jag/jamstalldhet/vad-ar-jamstalldhet/',

            '/tobak-alkohol-droger/rokning/att-sluta-roka/',
            '/tobak-alkohol-droger/alkohol/dricka-for-mycket-eller-for-ofta/',
            '/tobak-alkohol-droger/droger/att-anvanda-droger/',
            '/tobak-alkohol-droger/dopning/',

            '/sex/konssjukdomar/klamydia/',
            '/sex/konssjukdomar/kondylom/',
            '/sex/konssjukdomar/gonorre/',
            '/sex/konssjukdomar/syfilis/',

            // all the links from the navigation menu.
            '/kroppen/',
            '/kroppen/kroppen-ar-fantastisk/',
            '/kroppen/puberteten/',
            '/kroppen/penisen-och-pungen/',
            '/kroppen/snippan/',
            '/kroppen/mens/',
            '/kroppen/utseende/',
            '/kroppen/traning/',
            '/kroppen/vad-ska-man-ata/',
            '/kroppen/vikt/',
            '/kroppen/brost/',
            '/kroppen/somn-och-trotthet/',
            '/kroppen/graviditet/',
            '/kroppen/svettas/',
            '/kroppen/rodna2/',
            '/karlek-och-vanskap/',
            '/karlek-och-vanskap/karlek/',
            '/karlek-och-vanskap/att-vara-ihop/',
            '/karlek-och-vanskap/nar-det-tar-slut/',
            '/karlek-och-vanskap/vanskap/',
            '/karlek-och-vanskap/relationer-pa-natet/',
            '/karlek-och-vanskap/svartsjuka/',
            '/karlek-och-vanskap/pussar-kyssar-och-hangel/',
            '/sex/',
            '/sex/att-ha-sex/',
            '/sex/forsta-gangen/',
            '/sex/porr/',
            '/sex/sexnoveller/',
            '/sex/regler-och-lagar-om-sex/',
            '/sex/problem-med-sex/',
            '/sex/konssjukdomar/',
            '/sex/skydd-mot-konssjukdomar/',
            '/sex/skydd-mot-graviditet/',
            '/sex/att-salja-sex-och-att-kopa-sex/',
            '/sex/sex-och-samlevnad-i-skolan/',
            '/jag/',
            '/jag/sjalvkansla-och-blyghet/',
            '/jag/sexuell-laggning-och-konsidentitet/',
            '/jag/jamstalldhet/',
            '/jag/funktionsvariation/',
            '/jag/att-vara-adopterad/',
            '/jag/allas-lika-varde/',
            '/jag/manskliga-rattigheter/',
            '/jag/barnkonventionen/',
            '/jag/skolan/',
            '/familj/',
            '/familj/umo-fragar-hur-ser-din-familj-ut/',
            '/familj/skilda-foraldrar/',
            '/familj/vald-och-orattvisor-i-familjen/',
            '/familj/nar-vuxna-inte-mar-bra/',
            '/familj/tips-nar-du-blir-foralder/',
            '/tobak-alkohol-droger/',
            '/tobak-alkohol-droger/alkohol/',
            '/tobak-alkohol-droger/rokning/',
            '/tobak-alkohol-droger/snusning/',
            '/tobak-alkohol-droger/droger/',
            '/tobak-alkohol-droger/om-nagon-i-din-narhet-har-problem-med-alkohol-eller-droger/',
            '/vald-och-krankningar/',
            '/vald-och-krankningar/sexuella-overgrepp-och-trakasserier/',
            '/vald-och-krankningar/mobbning/',
            '/vald-och-krankningar/illa-behandlad-pa-natet/',
            '/vald-och-krankningar/nollning/',
            '/vald-och-krankningar/diskriminering/',
            '/vald-och-krankningar/hedersrelaterat-vald-och-fortryck/',
            '/vald-och-krankningar/vald-fran-vuxna-i-familjen/',
            '/vald-och-krankningar/brott-och-polisanmalan/',
            '/vald-och-krankningar/stod-om-du-ar-utsatt/',
            '/vald-och-krankningar/skadliga-forhallanden/',
            '/att-ma-daligt/',
            '/att-ma-daligt/om-du-mar-daligt/',
            '/att-ma-daligt/tips-for-att-ma-battre/',
            '/att-ma-daligt/nedstamdhet-och-angest/',
            '/att-ma-daligt/stress/',
            '/att-ma-daligt/atstorningar/',
            '/att-ma-daligt/skada-sig-sjalv/',
            '/att-ma-daligt/sjalvmordstankar/',
            '/att-ma-daligt/sorg-och-kris/',
            '/att-ma-daligt/problem-med-spel-om-pengar/',
            '/att-ma-daligt/kanner-du-oro-for-kriget-i-ukraina/',
            '/att-ta-hjalp/',
            '/att-ta-hjalp/hit-kan-du-ringa-maila-eller-chatta/',
            '/att-ta-hjalp/ungdomsmottagningen/',
            '/att-ta-hjalp/elevhalsan/',
            '/att-ta-hjalp/andra-du-kan-fa-hjalp-av/',
            '/att-ta-hjalp/att-prata-med-nagon/',
            '/att-ta-hjalp/rattigheter-och-lagar/',
            '/att-ta-hjalp/1177-vardguidens-e-tjanster/',
            '/att-ta-hjalp/kopa-medicin-pa-natett/',
            '/att-ta-hjalp/vill-du-veta-det-senaste-om-coronaviruset-eller-covid-19/'
        ];
    }
}
