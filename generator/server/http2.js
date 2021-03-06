import http2 from "http2";

export function create(options, listener) {
    return {
        listen: async (port, host, callback) => {
            if (options.tls) {
                options.paddingStrategy = http2.constants.PADDING_STRATEGY_NONE;
                http2.createSecureServer(options, listener).listen(port, host, callback);
            } else {
                http2.createServer(options, listener).listen(port, host, callback);
            }
        }
    }
}