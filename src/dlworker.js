import { parentPort } from "worker_threads";
import axios from 'axios';
import { writeFileSync, readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import * as path from 'path';

let __dirname = '';

class Session {
    headers;
    cookies = [];

    constructor() {
        this.headers = {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
            'Referer': 'https://www.pixiv.net/',
        };
    }

    updateHeaders(headers) {
        this.headers = {
            ...headers,
            ...this.headers,
        };
    }

    updateCookies(cookies) {
        this.cookies = cookies.concat(this.cookies);
        for (let i = 0; i < this.cookies.length; ++i) {
            for (let j = i + 1; j < this.cookies.length; ++j) {
                if (this.cookies[i].name === this.cookies[j].name)
                    this.cookies.splice(j--, 1);
            }
        }

        this.saveCookies(this.cookies);
    }

    saveCookies(cookies) {
        writeFileSync(path.join(__dirname, 'cookies.json'), JSON.stringify(cookies));
    }

    loadCookies() {
        if (existsSync(path.join(__dirname, 'cookies.json'))) {
            this.updateCookies(JSON.parse(readFileSync(path.join(__dirname, 'cookies.json'), 'utf-8')));
        }
    }

    getCookieString() {
        let cookieString = '';
        for (let i = 0; i < this.cookies.length; i++) {
            cookieString += this.cookies[i].name + '=' + this.cookies[i].value + '; ';
        }
        return cookieString;
    }

    async request(url, method, params, headers, data, responseType) {
        let response;
        this.updateHeaders({Cookie: this.getCookieString()});
        await axios({
            'url': url,
            'method': method,
            'params': params,
            'headers': {
                ...headers,
                ...this.headers,
            },
            'data': data,
            'responseType': responseType,
        })
            .then((res) => {
                response = res;
            })
            .catch((err) => {
                throw new Error(err.message);
            });
        return response;
    }
}

async function download(url, dlpath) {
    const session = new Session();
    session.loadCookies();
    const request = await session.request(url, 'GET', {}, {}, null, 'stream');
    if (request.status !== 200) {
        throw new Error(`Status: ${request.status} ${request.statusText}`);
    }
    const dir = dlpath.substring(0, dlpath.lastIndexOf('/'));
    if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
    }
    const file = createWriteStream(dlpath);
    return new Promise((resolve, reject) => {
        request.data.pipe(file);
        let error = null;
        file.on('error', (err) => {
            error = err;
            file.close();
            reject(err);
        });
        file.on('close', () => {
            if (!error) {
                resolve(true);
            }
        });
    });
}

parentPort.on("message",  async data => {
    __dirname = data.dir;
    await download(data.url, data.path);
    parentPort.postMessage(true);
});