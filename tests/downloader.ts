import { Session } from "../dist"
import { parentPort } from "worker_threads";
import { writeFileSync } from "fs";

parentPort.on("message", async(data) => {
	const session = new Session();
	console.log(`${data.path}/${data.id}.${data.ext}`, data.url);
	writeFileSync(
		`${data.path}/${data.id}.${data.ext}`,
		(await session.request(data.url, "GET", undefined, undefined, undefined, "arraybuffer")).data
	);
	parentPort.postMessage(true);
});