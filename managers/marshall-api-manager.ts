import axios from 'axios';

var parseString = require('xml2js').parseString;

const endpoints = {
  volume: 'netremote.sys.audio.volume',
  mode: 'netremote.sys.mode'
}

const mappedModes = [
  0, // AUX
  7, // RCA
  5, // Bluetooth
  6, // Radio
  8, // Spotify
]

class MarshallAPIManager {
  host: string;
  pin: string;
  api: string;

  fixedMaxVolume: number = 32;

  constructor(host: string, pin: string, api: string) {
    this.host = host;
    this.pin = pin;
    this.api = api;
  }

  async setVolume(volume: number): Promise<number> {
    console.log(`Setting volume to ${volume * this.fixedMaxVolume}`);

    try {
      const response = await axios.get(`http://${this.host}${this.api}/SET/${endpoints.volume}`, {
        params: {
          pin: this.pin,
          value: volume * this.fixedMaxVolume
        },
      });

      if(response.status == 200)
        return volume * this.fixedMaxVolume;
    } catch (error) {
      console.log(error);
    }

    return -1;
  }

  async setMode(mode: string): Promise<string> {
    console.log(`Setting mode to ${mode}`);

    try {
      const response = await axios.get(`http://${this.host}${this.api}/SET/${endpoints.mode}`, {
        params: {
          pin: this.pin,
          value: mode
        },
      });

      if(response.status == 200)
        return mode;
    } catch (error) {
      console.log(error);
    }

    return "-1";
  }

  async getStatus(): Promise<anyObject> {
    try {
      const response = await axios.get(`http://${this.host}${this.api}/GET_MULTIPLE?pin=${this.pin}&node=${Object.values(endpoints).join('&node=')}`);

      if(response.status == 200) {
        const { fsapiGetMultipleResponse } = await this._parseXml(response.data);
        return {
          volume: Number(fsapiGetMultipleResponse.fsapiResponse.find((response: any) => response.node.includes(endpoints.volume)).value[0].u8[0] / this.fixedMaxVolume),
          mode: fsapiGetMultipleResponse.fsapiResponse.find((response: any) => response.node.includes(endpoints.mode)).value[0].u32[0],
        };
      }
    } catch (error) {
      console.log(error);
    }

    return {};
  }

  getMappedModes(): number[] {
    return mappedModes;
  }

  async _parseXml(xml: string): Promise<anyObject> {
    return new Promise((resolve, reject) => {
      parseString(xml, (err: any, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}

type anyObject = {
  [key: string]: any;
};

export default MarshallAPIManager;
