import {Session} from "./request";
import {Builder, By, until, WebDriver} from "selenium-webdriver";
import {CheerioAPI, load} from "cheerio";
import {FetchIllustrationStruct, IllustrationStruct} from "../structs";
import {Thread, URLUtil, hasCommon, waitFor} from "../util";
import {existsSync, mkdirSync, writeFileSync} from "fs";
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
			const chromeOptions = new chrome.Options();
			chromeOptions.addArguments("--log-level=OFF");
			chromeOptions.headless();
			this._driver = await new Builder()
				.forBrowser(browser)
				.setChromeOptions(chromeOptions)
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

	public async fetch_illustration(illustrationId: number | string): Promise<FetchIllustrationStruct.FetchIllustrationResult|null> {
		const dom = await this._request_dom(`https://www.pixiv.net/en/artworks/${illustrationId}`, "GET").catch(() => null);
		if(dom) return JSON.parse(dom("meta[name=preload-data]").attr("content") as string) as FetchIllustrationStruct.FetchIllustrationResult;
		else return null;
	}

	public async download(tags: string[], num: number, dlpath: string, bookmarks: number=0, extags: string[]=[]): Promise<void> {
		const pool = Thread({
			poolOptions: {
				max: 40,
				min: 1,
			},
			workerOptions: {},
			workerPath: path.join(__dirname, "../workers/downloader.js")
		});

		const dlbar = new cliProgress.MultiBar({
			format: '{filename} [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} {name}',
			hideCursor: true,
		}, cliProgress.Presets.shades_classic);

		const startbar = dlbar.create(num, 0, { filename: "Starting", name: "" });
		const donebar = dlbar.create(num, 0, { filename: "Done    ", name: "" });

		let page=1;
		let done=0
		let start=0;

		const data: {[key:string]: any} = {
			'num': num,
			'tags': tags,
			'ex_tags': extags,
			'path': dlpath,
			'bookmarks': bookmarks,
			'illustrations': []
		};

		const deleted: string[] = [];

		if(!existsSync(dlpath)) mkdirSync(dlpath);

		while(start<num) {
			const Illusts = await this.search_illustrations(tags, page);
			for(let i=0;i<Illusts.body.illustManga.data.length;i++) {
				if(start>=num) break;
				const illust = await this.fetch_illustration(Illusts.body.illustManga.data[i].id);
				if(!illust) continue;
				const keys = Object.keys(illust.illust);
				let m = 0;
				for(let j=0;j<keys.length;j++) {
					const key=keys[j];
					const Illust = illust.illust[key];
					startbar.update(start, { name: Illust.id });
					if (hasCommon(Illust.tags.tags.map((e) => e.tag), extags)) continue;
					if (Illust.bookmarkCount < bookmarks) continue;
					data.illustrations.push(Illust);

					const url = URLUtil.getDownloadURL(Illust.urls);
					const worker = await pool.acquire();
					start++;
					startbar.increment();
					const doned = async(res: { 'ok': boolean, 'id': string })=>{
						if(res.ok) {
							done++;
							donebar.increment();
							donebar.update(done, { name: res.id });
						}else {
							start--;
							startbar.update(start);
							deleted.push(res.id);
						}
						worker.removeListener("message", doned);
						await pool.release(worker);
					}
					worker.on("message", doned);
					worker.postMessage({
						'url': url,
						'path': dlpath,
						'name': `${Illust.id}_${m}.${url.split(".").pop()}`,
						'id': Illust.id
					})
					m++;
				}
			}
			page++;
		}

		await pool.drain();
		await pool.clear();

		await waitFor(() => (done >= num), ()=>{setTimeout(()=>{
			dlbar.stop();
			deleted.forEach((e) => {
				data.illustrations = data.illustrations.filter((f: FetchIllustrationStruct.TData) => f.id !== e);
			});
			writeFileSync(path.join(dlpath, "data.json"), JSON.stringify(data, null, 2));
		}, 200)});
	}
}
