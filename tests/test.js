const {PixivClient} = require("../dist");

async function main() {
    const client = new PixivClient();
    await client.download(["genshin"], 20, "./tests/genshin", 500, ["R-18"]);
}

main().then().catch(console.error);