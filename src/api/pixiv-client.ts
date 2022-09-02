import {Session} from "./request";
import {Builder, By, until, WebDriver} from "selenium-webdriver";
import {CheerioAPI, load} from "cheerio";
import {FetchIllustrationStruct, IllustrationStruct} from "../structs";
import {Thread, URLUtil, hasCommon, waitFor} from "../util";
import {existsSync, mkdirSync} from "fs";
import * as cliProgress from "cli-progress";
import * as path from "path";
import * as chrome from "selenium-webdriver/chrome";
import * as firefox from "selenium-webdriver/firefox";
import * as edge from "selenium-webdriver/edge";

export class PixivClient {
	private readonly _session: Session;
	private _driver: WebDriver | null = null;

	constructor(private readonly _language: string = "en") {
		this._session = new Session();

		this._session.updateHeaders({
			"Accept-Language": this._language
		});
	}

	public get session(): Session {
		return this._session;
	}

	public terminate(): void {
		if (!this._driver) throw new Error("Driver is not initialized");

		this._driver!.quit().then();
	}

	private async _request_json<T = any>(
		url: string,
		method: "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE",
		params?: any,
		headers?: { [key: string]: string },
		data?: any
	): Promise<T> {
		const response: any = await this._session.request(url, method, params, headers, data);
		if (Math.floor(response.status / 100) === 4) throw new Error(`Status: ${response.status} ${response.statusText}`);

		return response.data as T;
	}

	private async _request_dom(
		url: string,
		method: "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE",
		params?: any,
		headers?: { [key: string]: string },
		data?: any
	): Promise<CheerioAPI> {
		const response: any = await this._session.request(url, method, params, headers, data);
		if (Math.floor(response.status / 100) === 4) throw new Error(`Status: ${response.status} ${response.statusText}`);

		return load(response.data);
	}

	public async login(id: string, password: string, browser: "chrome" | "firefox" | "edge" | "ie" | "safari" = "chrome"): Promise<boolean> {
		if (await this.is_logged_in())
			return true;

		try {
			this._driver = await new Builder()
				.forBrowser(browser)
				.setChromeOptions(new chrome.Options().headless())
				.setEdgeOptions(new edge.Options().headless())
				.setFirefoxOptions(new firefox.Options().headless())
				.build();

			await this._driver.sleep(2000);
			await this._driver.get("https://accounts.pixiv.net/login");

			await this._driver.sleep(Math.random() * 1000 + 500);
			const loginE = (await this._driver.findElements(By.xpath(".//form")))[0];

			await this._driver.sleep(Math.random() * 1000 + 500);
			const usernameE = await loginE.findElement(By.xpath('.//input[@type="text"]'));

			await this._driver.sleep(Math.random() * 1000 + 500);
			await usernameE.sendKeys(id);

			await this._driver.sleep(Math.random() * 1000 + 500);
			const passwordE = await loginE.findElement(By.xpath('.//input[@type="password"]'));

			await this._driver.sleep(Math.random() * 1000 + 500);
			await passwordE.sendKeys(password);

			await this._driver.sleep(Math.random() * 1000 + 500);
			const submitE = await loginE.findElement(By.xpath('.//button[@type="submit"]'));

			await submitE.click();
			await this._driver.sleep(Math.random() * 1000 + 500);
			this._driver.wait(until.elementLocated(By.id("root")), 10000);

			const cookies = await this._driver.manage().getCookies();

			this._session.updateCookies(cookies);
		} finally {
			if (this._driver)
				this.terminate();
		}
		return await this.is_logged_in();
	}

	public async is_logged_in(): Promise<boolean> {
		this._session.loadCookies();

		const response = await this._request_dom("https://www.pixiv.net/", "GET", {});
		return !response.html().includes("not-logged-in");
	}

	public async search_illustrations(word: string[], page = 1): Promise<IllustrationStruct.SearchIllustResult> {
		return await this._request_json<IllustrationStruct.SearchIllustResult>(
			`https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(word.join(" "))}`,
			"GET",
			{
				word: encodeURIComponent(word.join(" ")),
				p: page,
				order: "date_d",
				mode: "all",
				s_mode: "s_tag",
				type: "all",
				lang: "en"
			},
			{}
		);
	}

	public async fetch_illustration(illustrationId: number | string): Promise<FetchIllustrationStruct.FetchIllustrationResult> {
		const dom = await this._request_dom(`https://www.pixiv.net/en/artworks/${illustrationId}`, "GET");
		return JSON.parse(dom("meta[name=preload-data]").attr("content") as string) as FetchIllustrationStruct.FetchIllustrationResult;
	}

	public async download(tags: string[], num: number, dlpath: string, bookmarks: number=0, extags: string[]=[]): Promise<void> {
		const pool = Thread({
			poolOptions: {
				max: 20,
				min: 1,
			},
			workerOptions: {},
			workerPath: path.join(__dirname, "../workers/downloader.js")
		});

		const dlbar = new cliProgress.MultiBar({
			format: '{filename} [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
		}, cliProgress.Presets.shades_classic);

		const startbar = dlbar.create(num, 0, { filename: "Starting" });
		const donebar = dlbar.create(num, 0, { filename: "Done    " });

		let page=1;
		let done=0
		let start=0;

		if(!existsSync(dlpath)) mkdirSync(dlpath);

		while(start<num) {
			const Illusts = await this.search_illustrations(tags, page);
			for(let i=0;i<Illusts.body.illustManga.data.length;i++) {
				if(start>=num) break;
				const illust = await this.fetch_illustration(Illusts.body.illustManga.data[i].id);
				const keys = Object.keys(illust.illust);
				let m = 0;
				for(let j=0;j<keys.length;j++) {
					const key=keys[j];
					if (hasCommon(illust.illust[key].tags.tags.map((e) => e.tag), extags)) continue;
					if (illust.illust[key].bookmarkCount < bookmarks) continue;

					const url = URLUtil.getDownloadURL(illust.illust[key].urls);
					const worker = await pool.acquire();
					start++;
					startbar.increment();
					const doned = async(ok: boolean)=>{
						if(ok) {
							done++;
							donebar.increment();
						}else {
							start--;
						}
						worker.removeListener("message", doned);
						await pool.release(worker);
					}
					worker.on("message", doned);
					worker.postMessage({
						'url': url,
						'path': dlpath,
						'name': `${illust.illust[key].id}_${m}.${url.split(".").pop()}`,
					})
					m++;
				}
			}
			page++;
		}

		await pool.drain();
		await pool.clear();

		await waitFor(() => (done >= num), ()=>{setTimeout(()=>{dlbar.stop();})});
	}
}