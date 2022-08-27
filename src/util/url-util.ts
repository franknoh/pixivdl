import { FetchIllustrationStruct } from "../structs";

export namespace URLUtil {
	export function getDownloadURL(urls: FetchIllustrationStruct.Urls, type: "mini" | "regular" | "thumb" | "small" | "original" = "original") {
		return urls[type];
	}
}
