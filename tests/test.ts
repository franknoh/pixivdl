import { PixivClient, Thread, URLUtil } from "../dist"
import { mkdirSync, existsSync } from "fs"

async function main() {
    const client = new PixivClient();
    await client.login("id", "pw!", "chrome");
    const pool = Thread({
        poolOptions: {
            max: 20,
            min: 1,
        },
        workerOptions: {},
        workerPath: "./tests/downloader.js"
    });

    let page=1;
    let dlQueue = 0;;
    const n=10;

    if(!existsSync("./tests/downloads")) mkdirSync("./tests/downloads");

    while(dlQueue<n) {
        const Illusts = await client.search_illustrations(["genshin"], page);
        for(let i=0;i<Illusts.body.illustManga.data.length;i++) {
            if(dlQueue>=n) break;
            const illust = await client.fetch_illustration(Illusts.body.illustManga.data[i].id);
            const keys = Object.keys(illust.illust);
            for(let j=0;j<keys.length;j++) {
                const key=keys[j];
                if (illust.illust[key].tags.tags.map((e) => e.tag).includes("R-18")) continue;
                if (illust.illust[key].bookmarkCount < 1000) continue;
                dlQueue++;

                const url = URLUtil.getDownloadURL(illust.illust[key].urls);
                const worker = await pool.acquire();
                const t = dlQueue;
                const done = async(msg: boolean)=>{
                    console.log(`${t}/${n} done`);
                    worker.removeListener("message", done);
                    await pool.release(worker);
                }
                worker.on("message", done);
                worker.postMessage({
                    'url': url,
                    'path': './tests/downloads',
                    'ext': url.split(".").pop(),
                    'id': illust.illust[key].id
                })
            };
        }
        page++;
    }

    await pool.drain();
    await pool.clear();
}

main().then().catch(console.error);