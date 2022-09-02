const {PixivClient} = require("../dist");

async function main() {
    const client = new PixivClient();
    await client.download(["genshin"], 10, "./tests/downloads", 0, ["R-18"]);
}

main().then().catch(console.error);