const {PixivClient} = require("../dist");

async function main() {
    const client = new PixivClient();
    console.log(await client.is_logged_in('franknoh'));
    await client.login("franknoh", "pw!");
    console.log(await client.is_logged_in('franknoh'));
    //await client.download(["genshin"], 10, "./tests/genshin", 0);
}

main().then().catch(console.error);