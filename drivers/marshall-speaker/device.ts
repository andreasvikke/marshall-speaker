import { Device, FlowCardCondition } from 'homey';

import MarshallAPIManager from '../../managers/marshall-api-manager';

class MarshallSpeakerDevice extends Device {
  marshallAPIManager!: MarshallAPIManager;

  speakerStatusTimeout: NodeJS.Timeout | undefined;
  deleated: boolean = false;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MarshallSpeakerDevice has been initialized');
    this.marshallAPIManager = new MarshallAPIManager(this.getStoreValue('address'), this.getStoreValue('pincode'), this.getStoreValue('api'));

    this.registerCapabilityListener("volume_set", async (value) => {
      await this.marshallAPIManager.setVolume(value);
    });

    const modeChangeTrigger = this.homey.flow.getDeviceTriggerCard('marshall_mode_changed');
    this.registerCapabilityListener("marshall_mode", async (value) => {
      await this.marshallAPIManager.setMode(value);
      modeChangeTrigger.trigger(this)
        .catch(this.error);
    });

    const modeChanged = this.homey.flow.getActionCard('marshall_mode');
    modeChanged.registerRunListener(async (args, state) => {
      const { mode } = args;
      this.log(`Changing mode to ${mode}`);
      this.setCapabilityValue('marshall_mode', mode);
      await this.marshallAPIManager.setMode(mode);
    });


    const modeIs = this.homey.flow.getConditionCard("marshall_mode");
    modeIs.registerRunListener(async (args, state) => {
      const { mode } = args;
      this.log(`Checking if mode is ${mode}`);
      return this.getCapabilityValue('marshall_mode') === mode;
    })


    this.scheduleSpeakerStatus();
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
  async onSettings(event: { oldSettings: {[key: string]: any}, newSettings: {[key: string]: any}, changedKeys: string[] }): Promise<string|void> {
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
    this.deleated = true
    this.clearSpeakerStatusTimeout();
  }

  clearSpeakerStatusTimeout() {
    if (this.speakerStatusTimeout) {
      clearTimeout(this.speakerStatusTimeout);
      this.speakerStatusTimeout = undefined;
    }
  }

  async scheduleSpeakerStatus(timeoutSeconds = 10) {
    if (this.deleated)
      return;
    this.clearSpeakerStatusTimeout();
    this.speakerStatusTimeout = setTimeout(this.checkSpeakerStatus.bind(this), timeoutSeconds * 1000);
  }

  async checkSpeakerStatus() {
      if (this.deleated)
          return;
      try {
        this.clearSpeakerStatusTimeout();
        const status = await this.marshallAPIManager.getStatus();
        this.setCapabilityValue('volume_set', status.volume);
        if (status.mode in this.marshallAPIManager.getMappedModes())
          this.setCapabilityValue('marshall_mode', status.mode);
        else
          this.error(`Mode ${status.mode} is not supported`);
      } catch (err) {
          this.error('Check Speaker status failed', err);
      } finally {
          this.scheduleSpeakerStatus();
      }
  }

}

module.exports = MarshallSpeakerDevice;
