import Client from './Client';

class Illustration {
  private data: any;
  private client: Client;

  constructor(illust: any, client: Client) {
    this.data = illust;
    this.client = client;
  }

  public illust_id(): number {
    return this.data.id;
  }
  public tags(): string[] {
    return this.data.tags.tags.map((tag: any) => tag.tag);
  }
  public bookmark_count(): number {
    return this.data.bookmarkCount;
  }
  public view_count(): number {
    return this.data.viewCount;
  }
  public title(): string {
    return this.data.illustTitle;
  }
  public size(): [number, number] {
    return [this.data.width, this.data.height];
  }
  public urls(): { [key: string]: string } {
    return this.data.urls;
  }
  public create_date(): Date {
    return new Date(this.data.createDate);
  }
  public description(): string {
    return this.data.description;
  }
  public comments(): string[] {
    return this.data.illustComment;
  }
  dl_url(path: string, type: 'mini' | 'regular' | 'thumb' | 'small' | 'original' = 'original') {
    return [this.urls()[type], path + '.' + this.urls()[type].split('.').pop()];
  }
}

export default Illustration;
