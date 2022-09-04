import { Session } from "../api"
import { parentPort } from "worker_threads";
import { writeFileSync } from "fs";

parentPort!.on("message", async(data) => {
	try {
		const session = new Session();
		writeFileSync(
			`${data.path}/${data.name}`,
			(await session.request(data.url, "GET", undefined, undefined, undefined, "arraybuffer")).data
		);
		parentPort!.postMessage({
			'ok': true,
			'id': data.id
		});
	} catch (e) {
		console.log(e);
		parentPort!.postMessage(false);
	}
});