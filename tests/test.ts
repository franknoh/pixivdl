// npx ts-node .\tests\test.ts

import { PixivClient, Thread, URLUtil, FetchIllustrationStruct } from "../dist"
import { mkdirSync, existsSync } from "fs"

async function main() {
    const client = new PixivClient();
    await client.login("id", "pw!", "chrome");
    const pool = Thread({
        poolOptions: {
            max: 10,
            min: 1,
        },
        workerOptions: {},
        workerPath: "./tests/downloader.js"
    });

    let page=1;
    const dlQueue: FetchIllustrationStruct.TData[] = [];
    const n=10;

    while(dlQueue.length<n) {
        const Illusts = await client.search_illustrations(["arknights"], page);
        for(let i=0;i<Illusts.body.illustManga.data.length;i++) {
            if(dlQueue.length>=n) break;
            const illust = await client.fetch_illustration(Illusts.body.illustManga.data[i].id);
            const keys = Object.keys(illust.illust);
            for(let j=0;j<keys.length;j++) {
                const key=keys[j];
                console.log(illust.illust[key].id);
                if (illust.illust[key].tags.tags.map((e) => e.tag).includes("R-18")) continue;
                if (illust.illust[key].bookmarkCount < 100) continue;
                dlQueue.push(illust.illust[key]);
            };
        }
        page++;
    }

    if(!existsSync("./tests/downloads")) mkdirSync("./tests/downloads");

    for(let i=0;i<dlQueue.length;i++) {
        const url = URLUtil.getDownloadURL(dlQueue[i].urls);
        const worker = await pool.acquire();
        const done = async(msg: boolean)=>{
            worker.removeListener("message", done);
            await pool.release(worker);
        }
        worker.on("message", done);
        worker.postMessage({
            url: url,
            path: './tests/downloads',
            ext: url.split(".").pop(),
            id: dlQueue[i].id
        })
    }
    await pool.drain();
    await pool.clear();
}

main().then().catch(console.error);