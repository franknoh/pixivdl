import { Session } from "../api"
import { parentPort } from "worker_threads";
import { writeFileSync } from "fs";

parentPort!.on("message", async(data) => {
	try {
		const session = new Session();
		if(data.user) session.loadCookies(data.user);
		writeFileSync(
			`${data.path}/labels/${data.id}.txt`,
			data.label
		);
		await session.request(data.url, "GET", undefined, undefined, undefined, "arraybuffer").then(d=>{
			if (!d){
				parentPort!.postMessage({
					'ok': false,
					'id': data.id
				});
				return;
			}
			writeFileSync(
				`${data.path}/images/${data.name}`,
				d.data
			);
			parentPort!.postMessage({
				'ok': true,
				'id': data.id
			});
		}).catch(e=>{
			parentPort!.postMessage({
				'ok': false,
				'id': data.id
			});
		})
	} catch (e) {
		parentPort!.postMessage({
			'ok': false,
			'id': data.id
		});
	}
});