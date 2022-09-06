import { Session } from "../api"
import { parentPort } from "worker_threads";
import { writeFileSync } from "fs";

parentPort!.on("message", async(data) => {
	try {
		const session = new Session();
		await session.request(data.url, "GET", undefined, undefined, undefined, "arraybuffer").then(d=>{
			writeFileSync(
				`${data.path}/${data.name}`,
				d.data
			);
		}).catch(e=>{
			console.log(e);
			parentPort!.postMessage(false);
		})
		parentPort!.postMessage({
			'ok': true,
			'id': data.id
		});
	} catch (e) {
		console.log(e);
		parentPort!.postMessage(false);
	}
});