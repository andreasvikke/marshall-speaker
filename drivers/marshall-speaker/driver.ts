import Homey from 'homey';

class MarshallSpeakerDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MarshallSpeakerDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResult = discoveryStrategy.getDiscoveryResults();

    const devices = Object.values(discoveryResult).map(discoveryResult => {
      let txt: any = ('txt' in discoveryResult ? discoveryResult.txt : null)

      return {
        name: "name" in discoveryResult ? discoveryResult.name : "Marshall Speaker",

        data: {
          id: discoveryResult.id,
        },
        
        settings: {
          address: discoveryResult.address,
          pincode: '1234',
        },
        store: {
          address: discoveryResult.address,
          api: 'fsapilocation' in txt ? txt.fsapilocation : null,
          pincode: '1234',
        }
      };
    });
    return devices;
  }

}

module.exports = MarshallSpeakerDriver;
