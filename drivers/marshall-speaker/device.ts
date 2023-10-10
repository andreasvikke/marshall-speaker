import { Device, FlowCardCondition } from 'homey';

import MarshallAPIManager from '../../managers/marshall-api-manager.js';

class MarshallSpeakerDevice extends Device {
  marshallAPIManager!: MarshallAPIManager;

  speakerStatusTimeout: NodeJS.Timeout | undefined;
  deleted: boolean = false;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MarshallSpeakerDevice is beeing initialized');
    this.marshallAPIManager = new MarshallAPIManager(`http://${this.getStoreValue('address')}/device`, this.getStoreValue('pincode'), 10);
    await this.checkSpeakerAvailability();

    this.registerCapabilityListener("volume_set", async (value) => {
      await this.marshallAPIManager.set_volume(value);
    });

    const modeChangeTrigger = this.homey.flow.getDeviceTriggerCard('marshall_mode_changed');
    this.registerCapabilityListener("marshall_mode", async (value) => {
      await this.marshallAPIManager.set_mode(value);
      modeChangeTrigger.trigger(this)
        .catch(this.error);
    });

    const modeChanged = this.homey.flow.getActionCard('marshall_mode');
    modeChanged.registerRunListener(async (args, state) => {
      const { mode } = args;
      this.log(`Changing mode to ${mode}`);
      this.setCapabilityValue('marshall_mode', mode);
      await this.marshallAPIManager.set_mode(mode);
    });

    const modeIs = this.homey.flow.getConditionCard("marshall_mode");
    modeIs.registerRunListener(async (args, state) => {
      const { mode } = args;
      this.log(`Checking if mode is ${mode}`);
      return this.getCapabilityValue('marshall_mode') === mode;
    })


    this.scheduleSpeakerStatus();
    this.log('MarshallSpeakerDevice has been initialized');
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MarshallSpeakerDevice has been added');

    await this.setSettings({
      address: this.getStoreValue("address"),
      pincode: this.getStoreValue("pincode"),
    });
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings(event: { oldSettings: { [key: string]: any }, newSettings: { [key: string]: any }, changedKeys: string[] }): Promise<string | void> {
    this.log('MarshallSpeakerDevice settings where changed');

    event.changedKeys.forEach(async changedKey => {
      this.log(`${changedKey} changed`);
      if (this.getStoreKeys().includes(changedKey))
        await this.setStoreValue("address", event.newSettings.address);
    });

    this.marshallAPIManager = new MarshallAPIManager(this.getStoreValue('address'), this.getStoreValue('pincode'), this.getStoreValue('api'));
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('MarshallSpeakerDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MarshallSpeakerDevice has been deleted');
    this.deleted = true
    this.clearSpeakerStatusTimeout();
  }

  clearSpeakerStatusTimeout() {
    if (this.speakerStatusTimeout) {
      clearTimeout(this.speakerStatusTimeout);
      this.speakerStatusTimeout = undefined;
    }
  }

  async scheduleSpeakerStatus(timeoutSeconds = 10) {
    if (this.deleted)
      return;
    this.clearSpeakerStatusTimeout();
    this.speakerStatusTimeout = setTimeout(this.checkSpeakerStatus.bind(this), timeoutSeconds * 1000);
  }

  async checkSpeakerStatus() {
    if (this.deleted) {
      return;
    }

    await this.checkSpeakerAvailability();
    
    try {
      this.clearSpeakerStatusTimeout();

      if (this.getAvailable()) {
        const [volume, mode, modeList] = await Promise.all([
          this.marshallAPIManager.get_volume(),
          this.marshallAPIManager.get_mode() as Promise<string>,
          this.marshallAPIManager.get_mode_list() as Promise<string[]>
        ]);

        if (volume !== undefined) {
          this.setCapabilityValue('volume_set', volume);
        }
        if (mode !== undefined) {
          const modeIndex = modeList.indexOf(mode).toString();
          this.setCapabilityValue('marshall_mode', modeIndex);
        }
      }
    } catch (err) {
      this.error('Check Speaker status failed', err);
    } finally {
      this.scheduleSpeakerStatus();
    }
  }

  async checkSpeakerAvailability() {
    try {
      await this.marshallAPIManager.healthCheck();
      if (this.marshallAPIManager.sid === null) {
        await this.marshallAPIManager.init();
      }
      await this.setAvailable();
    } catch (error) {
      await this.setUnavailable().catch(this.error);
      this.marshallAPIManager.sid = null;
    }
  }
}

module.exports = MarshallSpeakerDevice;
