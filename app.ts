import { App } from 'homey';

class MarshallSpeakerApp extends App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Marshall Speaker App has been initialized');
  }

}

module.exports = MarshallSpeakerApp;
