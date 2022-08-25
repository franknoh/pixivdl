import Config from './config';
import { Session } from './Request';
import Illustration from './Illustration';
import {Builder, By, until} from 'selenium-webdriver';
import { load } from 'cheerio';
import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
import * as edge from 'selenium-webdriver/edge';
import * as path from 'path';
import * as fs from 'fs';

// tslint:disable-next-line:no-var-requires
const createPool = require("thread-pool-node");

class Client {
  private readonly language: string;
  private readonly session: Session;
  private readonly config: Config;
  private driver: any;

  constructor() {
    this.config = new Config();

    this.language = this.config.data.language as string;

    this.session = new Session();

    if (this.language) {
      this.session.updateHeaders({
        'Accept-Language': this.language,
      });
    }
  }

  terminate() {
    if (this.driver) {
      setTimeout(() => {
        this.driver.quit();
      }, 1000);
    }
  }

  async _request_json(
    url: string,
    method: 'GET' | 'POST' | 'OPTIONS' | 'PUT' | 'DELETE',
    params?: any,
    headers?: { [key: string]: string },
    data?: any,
  ) {
    const response: any = await this.session.request(url, method, params, headers, data);
    if (Math.floor(response.status / 100) === 4) {
      throw new Error(`Status: ${response.status} ${response.statusText}`);
    }
    return response.data;
  }

  async _request_dom(
    url: string,
    method: 'GET' | 'POST' | 'OPTIONS' | 'PUT' | 'DELETE',
    params?: any,
    headers?: { [key: string]: string },
    data?: any,
  ) {
    const response: any = await this.session.request(url, method, params, headers, data);
    if (Math.floor(response.status / 100) === 4) {
      throw new Error(`Status: ${response.status} ${response.statusText}`);
    }
    return load(response.data);
  }

  async login(id: string, password: string, browser: 'chrome' | 'firefox' | 'edge' | 'ie' | 'safari' = 'chrome') {
    if (await this.is_logged_in()){
        return;
    }
    try {
      this.driver = await new Builder()
        .forBrowser(browser)
        .setChromeOptions(new chrome.Options().headless())
        .setEdgeOptions(new edge.Options().headless())
        .setFirefoxOptions(new firefox.Options().headless())
        .build();
      await this.driver.sleep(2000);
      await this.driver.get('https://accounts.pixiv.net/login');
      await this.driver.sleep(Math.random() * 1000 + 500);
      const loginE = (await this.driver.findElements(By.xpath('.//form')))[0];
      await this.driver.sleep(Math.random() * 1000 + 500);
      const usernameE = await loginE.findElement(By.xpath('.//input[@type="text"]'));
      await this.driver.sleep(Math.random() * 1000 + 500);
      await usernameE.sendKeys(id);
      await this.driver.sleep(Math.random() * 1000 + 500);
      const passwordE = await loginE.findElement(By.xpath('.//input[@type="password"]'));
      await this.driver.sleep(Math.random() * 1000 + 500);
      await passwordE.sendKeys(password);
      await this.driver.sleep(Math.random() * 1000 + 500);
      const submitE = await loginE.findElement(By.xpath('.//button[@type="submit"]'));
      await submitE.click();
      await this.driver.sleep(Math.random() * 1000 + 500);
      this.driver.wait(until.elementLocated(By.id('root')), 10000);
      const cookies = await this.driver.manage().getCookies();
      this.session.updateCookies(cookies);
    } catch (e: any) {
      throw new Error(e);
    }
  }

  async is_logged_in() {
    this.session.loadCookies();
    try {
      const response = await this._request_dom(
          'https://www.pixiv.net/',
          'GET',
          {}
      );
      return !response.html().includes('not-logged-in');
    }catch (e){
        return false;
    }
  }

  async search_illustrations(word: string[], page = 1) {
    const response = await this._request_json(
      `https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(word.join(' '))}`,
      'GET',
      {
        word: encodeURIComponent(word.join(' ')),
        p: page,
        order: 'date_d',
        mode: 'all',
        s_mode: 's_tag',
        type: 'all',
        lang: 'en',
      },
      {},
    );
    return {
      popular: {
        permanent: response.body.popular.permanent,
        recent: response.body.popular.recent,
      },
      data: response.body.illustManga.data,
    };
  }

  async fetch_illustration(illustrationId: number | string) {
    const dom = await this._request_dom(`https://www.pixiv.net/en/artworks/${illustrationId}`, 'GET');
    const response = JSON.parse(dom('meta[name=preload-data]').attr('content') as string);
    return Object.keys(response.illust).map((key) => new Illustration(response.illust[key], this));
  }

  has_common(arr1: any[], arr2: any[]) {
    arr1.forEach((i) => {
      if (arr2.includes(i)) {
        return true;
      }
    });
    return false;
  }

  async download(dlpath: string, count: number = 20, args?: any) {
    const dlQueue: Illustration[] = [];
    const info: { [key: string]: any | any[] } = {
      'args': args,
      'path': dlpath,
      'count': count,
      'date': new Date(),
      'illusts': [],
    };
    const pool = createPool({
      workerPath: path.join(__dirname, 'dlworker.js'),
      workerOptions: {},
      poolOptions: {
        min: this.config.data.dl_threads_min,
        max: this.config.data.dl_threads_max
      }
    });
      if (!args || !args.tag) {
        throw new Error('No tag specified');
      }
      let page = 1;
      while (dlQueue.length < count) {
        let done = false;
        const response = await this.search_illustrations(args.tag, page);
        for (const rawData of response.data) {
          if (dlQueue.length >= count || rawData.length === 0) {
            done = true;
            break;
          } else {
            const illusts = await this.fetch_illustration(rawData.id);
            illusts.forEach((illust) => {
              if (
                (!args.bookmarks || args.bookmarks <= illust.bookmark_count()) &&
                (!args.ex_tag || !this.has_common(args.ex_tag, illust.tags()))
              ) {
                dlQueue.push(illust);
              }
            });
          }
        }
        if (done) {
          break;
        }
        page++;
      }
    for (const illust of dlQueue) {
      const worker = await pool.acquire();
      const onMessage = () => {
        pool.release(worker);
        worker.removeListener("message", onMessage);
      }
      worker.on("message", onMessage)
      const dlinfo =illust.dl_url(dlpath + '/' + illust.illust_id());
        worker.postMessage({
          'url': dlinfo[0],
          'path': dlinfo[1],
          'dir': __dirname
        });
      const data = {
        id: illust.illust_id(),
        title: illust.title(),
        description: illust.description(),
        comments: illust.comments(),
        tags: illust.tags(),
        bookmark_count: illust.bookmark_count(),
        view_count: illust.view_count(),
        date: illust.create_date(),
        size: illust.size(),
      };
      info.illusts.push(data);
    }
    if(!fs.existsSync(dlpath)){
        fs.mkdirSync(dlpath);
    }
    fs.writeFileSync(dlpath + '/info.json', JSON.stringify(info, null, 2));
    await pool.drain();
    await pool.clear();
  }
}

export default Client;
