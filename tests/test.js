const {PixivClient} = require("../dist");

async function main() {
    const client = new PixivClient();
    await client.login("franknoh", "pw!");
    await client.download(["genshin"], 1000, "./tests/genshin", 0, ['R-18']);
}

main().then().catch(console.error);