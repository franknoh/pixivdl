# pixivdl
 
### usage

```bash
$ npm i @franknoh/pixivdl
```
    
```js
const {PixivClient} = require("@franknoh/pixivdl");

async function main() {
    const client = new PixivClient();
    await client.login("id", "pw");
    await client.download(["genshin"], 10, "./downloads", 200, ["R-18"]);
}

main().then().catch(console.error);
```