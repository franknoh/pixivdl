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
import {AxiosResponse} from "axios";

export class PixivClient {
	private readonly _session: Session;
	private user: string | null = null;
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
		return (await this._session.request(url, method, params, headers, data)).data as T;
	}

	private async _request_dom(
		url: string,
		method: "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE",
		params?: any,
		headers?: { [key: string]: string },
		data?: any
	): Promise<CheerioAPI|null> {
		const response: AxiosResponse = await this._session.request(url, method, params, headers, data);
		if (response)
			return load(response.data);
		return null;
	}

	public async login(id: string, password: string, browser: "chrome" | "firefox" | "edge" | "ie" | "safari" = "chrome"): Promise<boolean> {
		if (await this.is_logged_in(id)) {
			this.user = id;
			return true;
		}else {
			try {
				const chromeOptions = new chrome.Options();
				chromeOptions.addArguments("--log-level=OFF");
				chromeOptions.addArguments("--disable-gpu");
				chromeOptions.headless();
				this._driver = await new Builder()
					.forBrowser(browser)
					.setChromeOptions(chromeOptions)
					.setEdgeOptions(new edge.Options().headless())
					.setFirefoxOptions(new firefox.Options().headless())
					.build();
				await this._driver.get("https://accounts.pixiv.net/login");
				const loginE = (await this._driver.findElements(By.xpath(".//form")))[0];
				await this._driver.sleep(500);
				const usernameE = await loginE.findElement(By.xpath('.//input[@type="text"]'));
				for (const c of id.split("")) {
					await usernameE.sendKeys(c);
					await this._driver.sleep(10);
				}
				await this._driver.sleep(500);
				const passwordE = await loginE.findElement(By.xpath('.//input[@type="password"]'));
				for (const c of password.split("")) {
					await passwordE.sendKeys(c);
					await this._driver.sleep(10);
				}
				await this._driver.sleep(500);
				const submitE = await loginE.findElement(By.xpath('.//button[@type="submit"]'));
				await submitE.click();
				this._driver.wait(until.elementLocated(By.id("root")), 1000);
				await this._driver.sleep(5000);
				await this._driver.get("https://www.pixiv.net/");
				this._driver.wait(until.elementLocated(By.id("root")), 1000);
				const cookies = await this._driver.manage().getCookies();
				this._session.updateCookies(cookies, id);
				this.user = id;
			} finally {
				this.terminate();
			}
			return await this.is_logged_in(id);
		}
	}

	public async is_logged_in(id: string): Promise<boolean> {
		this._session.loadCookies(id);
		const response = await this._request_dom("https://www.pixiv.net/", "GET");
		return response?response.html().indexOf("not-logged-in")===-1:false;
	}

	public async search_illustrations(word: string[], page: number): Promise<IllustrationStruct.SearchIllustResult> {
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
		const dom = await this._request_dom(`https://www.pixiv.net/en/artworks/${illustrationId}`, "GET");
		if(dom) return JSON.parse(dom("meta[name=preload-data]").attr("content") as string) as FetchIllustrationStruct.FetchIllustrationResult;
		else return null;
	}

	public async download(tags: string[], num: number, dlpath: string, bookmarks: number=0, extags: string[]=[], urlonly: boolean=false): Promise<void> {
		const pool = Thread({
			poolOptions: {
				max: 60,
				min: 1,
			},
			workerOptions: {},
			workerPath: path.join(__dirname, "../workers/downloader.js")
		});

		const dlbar = new cliProgress.MultiBar({
			format: '{filename} [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} {name}',
			hideCursor: true,
		}, cliProgress.Presets.shades_classic);
		const infobar  = new cliProgress.SingleBar({
			format: '{filename} {name}',
			hideCursor: true,
		}, cliProgress.Presets.shades_classic);

		let page=1;
		let done=0
		let start=0;
		let lastId="";

		const startbar = dlbar.create(num, 0, { filename: "Starting", name: "" });
		const donebar = dlbar.create(num, 0, { filename: "Done    ", name: "" });
		dlbar.create(num, 0, { filename: "", name: "" });
		infobar.start(0, 0, { filename: "Info    ", name: "" });

		const data: {[key:string]: any} = {
			'num': num,
			'tags': tags,
			'ex_tags': extags,
			'path': dlpath,
			'bookmarks': bookmarks,
			'urlonly': urlonly,
			'illustrations': []
		};

		const deleted: string[] = [];

		if(!existsSync(dlpath)) mkdirSync(dlpath);
		if(!existsSync(path.join(dlpath, '/images'))) mkdirSync(path.join(dlpath, '/images'));
		if(!existsSync(path.join(dlpath, '/labels'))) mkdirSync(path.join(dlpath, '/labels'));

		while(start<num) {
			await new Promise(resolve => setTimeout(resolve, 100));
			let Illusts = await this.search_illustrations(tags, page);
			infobar.update(0, { name: `Page: ${page}, length: ${Illusts.body.illustManga.data.length}` });
			while(!Illusts||Illusts.body.illustManga.data.length===0) {
				Illusts = await this.search_illustrations(tags, page);
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
			if(lastId===Illusts.body.illustManga.data[0].id){
				infobar.update(0, { name: `No more illustrations found (page: ${page})` });
				num = done;
				break;
			}
			lastId = Illusts.body.illustManga.data[0].id;
			for(let i=0;i<Illusts.body.illustManga.data.length;i++) {
				if(start>=num) break;
				const illust = await this.fetch_illustration(Illusts.body.illustManga.data[i].id);
				if(!illust) continue;
				const keys = Object.keys(illust.illust);
				let m = 0;
				for(let j=0;j<keys.length;j++) {
					const Illust = illust.illust[keys[j]];
					infobar.update(0, { name: `Page: ${page}, length: ${Illusts.body.illustManga.data.length}, Id: ${Illust.id}` });
					if (hasCommon(Illust.tags.tags.map((e) => e.tag), extags)) continue;
					if (Illust.bookmarkCount < bookmarks) continue;
					await data.illustrations.push(Illust.id);
					const url = URLUtil.getDownloadURL(Illust.urls);
					try{
						const worker = await pool.acquire();
						start++;
						startbar.update(start, {name: Illust.id});
						startbar.increment();
						const doned = async(res: { 'ok': boolean, 'id': string })=>{
							if(res.ok) {
								done++;
								donebar.increment();
								donebar.update(done, {name: res.id});
							}else{
								infobar.update(0, { name: `Failed to download id: ${res.id}` });
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
							'id': Illust.id,
							'label': Illust.tags.tags.map((e) => e.tag).join(", "),
							'user': this.user,
							'urlonly': urlonly,
							'bookmark': Illust.bookmarkCount
						});
						m++;
					}catch(e){
						infobar.update(0, {name: `Error: ${e}`});
					}
				}
			}
			page++;
		}

		await pool.drain();
		await pool.clear();

		waitFor(() => (done >= num), () => {
			infobar.update(0, { name: `Finished downloading ${done}images` });
			setTimeout(() => {
				dlbar.stop();
				infobar.stop();
				deleted.forEach((e) => {
					data.illustrations = data.illustrations.filter((f: string) => f !== e);
				});
				data.num = done
				writeFileSync(path.join(dlpath, "info.json"), JSON.stringify(data, null, 2));
			}, 200);
		});
	}
}
