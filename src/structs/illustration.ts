export namespace IllustrationStruct {
	export interface TitleCaptionTranslation {
		workTitle?: any;
		workCaption?: any;
	}

	export interface Datum {
		id: string;
		title: string;
		illustType: number;
		xRestrict: number;
		restrict: number;
		sl: number;
		url: string;
		description: string;
		tags: string[];
		userId: string;
		userName: string;
		width: number;
		height: number;
		pageCount: number;
		isBookmarkable: boolean;
		bookmarkData?: any;
		alt: string;
		titleCaptionTranslation: TitleCaptionTranslation;
		createDate: Date;
		updateDate: Date;
		isUnlisted: boolean;
		isMasked: boolean;
		profileImageUrl: string;
	}

	export interface IllustManga {
		data: Datum[];
	}

	export interface TagTranslation {
		[key: string]: string;
	}

	export interface Header {
		url: string;
	}

	export interface Footer {
		url: string;
	}

	export interface Infeed {
		url: string;
	}

	export interface ZoneConfig {
		header: Header;
		footer: Footer;
		infeed: Infeed;
	}

	export interface AlternateLanguages {
		ja: string;
		en: string;
	}

	export interface Meta {
		title: string;
		description: string;
		canonical: string;
		alternateLanguages: AlternateLanguages;
		descriptionHeader: string;
	}

	export interface ExtraData {
		meta: Meta;
	}

	export interface Body {
		illustManga: IllustManga;
		relatedTags: string[];
		tagTranslation: TagTranslation;
		zoneConfig: ZoneConfig;
		extraData: ExtraData;
	}

	export interface SearchIllustResult {
		error: boolean;
		body: Body;
	}
}

export namespace FetchIllustrationStruct {
	export interface Urls {
		mini: string;
		thumb: string;
		small: string;
		regular: string;
		original: string;
	}

	export interface Translation {
		en: string;
	}

	export interface Tag {
		tag: string;
		locked: boolean;
		deletable: boolean;
		userId: string;
		romaji: string;
		translation: Translation;
		userName: string;
	}

	export interface Tags {
		authorId: string;
		isLocked: boolean;
		tags: Tag[];
		writable: boolean;
	}

	export interface TitleCaptionTranslation {
		workTitle?: any;
		workCaption?: any;
	}

	export interface Data {
		id: string;
		title: string;
		illustType: number;
		xRestrict: number;
		restrict: number;
		sl: number;
		url: string;
		description: string;
		tags: string[];
		userId: string;
		userName: string;
		width: number;
		height: number;
		pageCount: number;
		isBookmarkable: boolean;
		bookmarkData?: any;
		alt: string;
		titleCaptionTranslation: TitleCaptionTranslation;
		createDate: Date;
		updateDate: Date;
		isUnlisted: boolean;
		isMasked: boolean;
		profileImageUrl: string;
	}

	export interface UserIllusts {
		[key: number]: Data;
	}

	export interface IUrl {
		url: string;
	}

	export interface ZoneConfig {
		responsive: IUrl;
		rectangle: IUrl;
		"500x500": IUrl;
		header: IUrl;
		footer: IUrl;
		expandedFooter: IUrl;
		logo: IUrl;
		relatedworks: IUrl;
	}

	export interface AlternateLanguages {
		ja: string;
		en: string;
	}

	export interface Ogp {
		description: string;
		image: string;
		title: string;
		type: string;
	}

	export interface Twitter {
		description: string;
		image: string;
		title: string;
		card: string;
	}

	export interface Meta {
		title: string;
		description: string;
		canonical: string;
		alternateLanguages: AlternateLanguages;
		descriptionHeader: string;
		ogp: Ogp;
		twitter: Twitter;
	}

	export interface ExtraData {
		meta: Meta;
	}

	export interface TitleCaptionTranslation14 {
		workTitle?: any;
		workCaption?: any;
	}

	export interface Translation2 {
		en: string;
	}

	export interface Successor {
		tag: string;
		translation: Translation2;
	}

	export interface Current {
		en: string;
	}

	export interface Breadcrumbs {
		successor: Successor[];
		current: Current;
	}

	export interface TitleCaptionTranslation15 {
		workTitle?: any;
		workCaption?: any;
	}

	export interface ZengoIdWork {
		id: string;
		title: string;
		illustType: number;
		xRestrict: number;
		restrict: number;
		sl: number;
		url: string;
		description: string;
		tags: string[];
		userId: string;
		userName: string;
		width: number;
		height: number;
		pageCount: number;
		isBookmarkable: boolean;
		bookmarkData?: any;
		alt: string;
		titleCaptionTranslation: TitleCaptionTranslation15;
		createDate: Date;
		updateDate: Date;
		isUnlisted: boolean;
		isMasked: boolean;
		profileImageUrl: string;
	}

	export interface NextWork {
		id: string;
		title: string;
	}

	export interface PrevWork {
		id: string;
		title: string;
	}

	export interface ZengoWorkData {
		nextWork: NextWork;
		prevWork: PrevWork;
	}

	export interface NoLoginData {
		breadcrumbs: Breadcrumbs;
		zengoIdWorks: ZengoIdWork[];
		zengoWorkData: ZengoWorkData;
	}

	export interface TData {
		illustId: string;
		illustTitle: string;
		illustComment: string;
		id: string;
		title: string;
		description: string;
		illustType: number;
		createDate: Date;
		uploadDate: Date;
		restrict: number;
		xRestrict: number;
		sl: number;
		urls: Urls;
		tags: Tags;
		alt: string;
		storableTags: string[];
		userId: string;
		userName: string;
		userAccount: string;
		userIllusts: UserIllusts;
		likeData: boolean;
		width: number;
		height: number;
		pageCount: number;
		bookmarkCount: number;
		likeCount: number;
		commentCount: number;
		responseCount: number;
		viewCount: number;
		bookStyle: number;
		isHowto: boolean;
		isOriginal: boolean;
		imageResponseOutData: any[];
		imageResponseData: any[];
		imageResponseCount: number;
		pollData?: any;
		seriesNavData?: any;
		descriptionBoothId?: any;
		descriptionYoutubeId?: any;
		comicPromotion?: any;
		fanboxPromotion?: any;
		contestBanners: any[];
		isBookmarkable: boolean;
		bookmarkData?: any;
		contestData?: any;
		zoneConfig: ZoneConfig;
		extraData: ExtraData;
		titleCaptionTranslation: TitleCaptionTranslation14;
		isUnlisted: boolean;
		request?: any;
		commentOff: number;
		noLoginData: NoLoginData;
	}

	export interface Illust {
		100717259: 1007172592;
	}

	export interface UserInfo {
		userId: string;
		name: string;
		image: string;
		imageBig: string;
		premium: boolean;
		isFollowed: boolean;
		isMypixiv: boolean;
		isBlocking: boolean;
		background?: any;
		sketchLiveId?: any;
		partial: number;
		acceptRequest: boolean;
		sketchLives: any[];
	}

	export interface User {
		[key: number]: UserInfo;
	}

	export interface FetchIllustrationResult {
		timestamp: Date;
		illust: Illust;
		user: User;
	}
}
