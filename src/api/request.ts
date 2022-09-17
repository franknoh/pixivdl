import axios from "axios";
import {IWebDriverCookie} from "selenium-webdriver";
import {existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync} from "fs";
import * as path from "path";

export class Session {
	public headers: { [key: string]: string };
	public cookies: IWebDriverCookie[] = [];

	constructor(user?: string) {
		this.headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
			Referer: "https://www.pixiv.net/"
		};
		if (user) this.loadCookies(user);
	}

	updateHeaders(headers: { [key: string]: string }) {
		this.headers = {
			...headers,
			...this.headers
		};
	}

	updateCookies(cookies: IWebDriverCookie[], user: string) {
		this.cookies = cookies.concat(this.cookies);
		for (let i = 0; i < this.cookies.length; ++i) {
			for (let j = i + 1; j < this.cookies.length; ++j) {
				if (this.cookies[i].name === this.cookies[j].name) this.cookies.splice(j--, 1);
			}
		}

		this.saveCookies(this.cookies, user);
	}

	saveCookies(cookies: IWebDriverCookie[], user: string) {
		if(!existsSync(path.join(__dirname, "../data/cookies"))) {
			mkdirSync(path.join(__dirname, "../data"));
			mkdirSync(path.join(__dirname, "../data/cookies"));
		}
		writeFileSync(path.join(__dirname, `../data/cookies/${user}.json`), JSON.stringify(cookies));
	}

	loadCookies(user: string) {
		if (existsSync(path.join(__dirname, `../data/cookies/${user}.json`))) {
			this.updateCookies(JSON.parse(readFileSync(path.join(__dirname, `../data/cookies/${user}.json`), "utf-8")), user);
		}
	}

	deleteCookies(user: string) {
		if (existsSync(path.join(__dirname, `../data/cookies/${user}.json`))) {
			unlinkSync(path.join(__dirname, `../data/cookies/${user}.json`));
		}
	}

	getCookieString(): string {
		let cookieString = "";
		for (let i = 0; i < this.cookies.length; i++) {
			cookieString += this.cookies[i].name + "=" + this.cookies[i].value + "; ";
		}
		return cookieString;
	}

	async request(
		url: string,
		method: "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE",
		params?: { [key: string]: any },
		headers?: { [key: string]: string },
		data?: any,
		responseType?: any
	) {
		this.updateHeaders({ Cookie: this.getCookieString() });
		return axios({
			"url": url,
			"method": method,
			"params": params,
			"headers": {
				...headers,
				...this.headers
			},
			"data": data,
			"responseType": responseType
		});
	}
}
