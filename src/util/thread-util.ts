import { Options, Pool, createPool } from "generic-pool";
import { WorkerOptions, Worker } from "worker_threads";
import { resolve } from "path";
import { existsSync } from "fs";

export interface WorkerThreadsPoolOptions {
	workerPath: string;
	workerOptions: WorkerOptions;
	poolOptions: Options;
}

export const Thread = (options: WorkerThreadsPoolOptions) => {
	const resolvedWorkerPath = resolve(options.workerPath);

	if (!existsSync(resolvedWorkerPath)) {
		throw new Error(`Worker path ${resolvedWorkerPath} does not exist.`);
	}

	const pool = createPool(
		{
			create: async () => {
				return new Worker(options.workerPath, options.workerOptions);
			},
			destroy: async (worker) => {
				worker.terminate();
			}
		},
		options.poolOptions
	);

	return pool;
};
