import * as http from "http";
import * as https from "https";

export function create(options, listener) {
    return {
        listen: async (port, host, callback) => {
            if (options.tls) {
                https.createServer(options, listener).listen(port, host, callback);
            } else {
                http.createServer(listener).listen(port, host, callback);
            }
        }
    }
}