import * as fs from 'fs';
import * as path from 'path';

class Config {
  private iData: { [key: string]: string | number | boolean }={};
  private readonly configPath: string=path.join(__dirname, 'config.json');
  constructor() {
    this.getConfig();
  }
  getConfig() {
    this.iData = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    return this.iData;
  }
  setConfig(data: { [key:string]: any }) {
    this.iData = { ...this.iData, ...data };
    this.updateConfig();
  }
  updateConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.iData, null, 4));
  }
  get data() {
    this.getConfig();
    return this.iData;
  }
}

export default Config;
