import zlib from "zlib";

const ALGORITHMS = {
    "br": brotli_compress,
    "gzip": gzip_compress
}

/**
 * @param data the data to be compressed.
 * @param algorithm the compression algorithm to use.
 * @returns {Promise<*>} on compression complete.
 */
export async function compress(data, algorithm) {
    if (algorithm in ALGORITHMS) {
        return (await ALGORITHMS[algorithm](data));
    } else {
        return data;
    }
}

async function brotli_compress(data) {
    return new Promise((resolve, reject) => {
        zlib.brotliCompress(data, {
            params: {[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT}
        }, (err, compressed) => {
            if (err) {
                reject(err);
            } else {
                resolve(compressed);
            }
        });
    });
}

async function gzip_compress(data) {
    return new Promise((resolve, reject) => {
        zlib.gzip(data, {}, (err, compressed) => {
            if (err) {
                reject(err);
            } else {
                resolve(compressed);
            }
        });
    });
}