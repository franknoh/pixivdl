const {PixivClient} = require("../dist");

async function main() {
    const client = new PixivClient();
    await client.download(["genshin"], 1000, "./tests/downloads", 200, ["R-18"]);
}

main().then().catch(console.error);