import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
  WithUUID,
} from 'homebridge';

import { request } from 'urllib';

import type { EpsonProjectorHomebridgePlatform } from './platform.js';
import { PROJECTOR_ERR, PROJECTOR_PROPERTY_POWER, PROJECTOR_PROPERTY_POWER_ACTIVE_MAP } from './settings.js';

// Commands Reference
// https://files.support.epson.com/pdf/pl600p/pl600pcm.pdf
// http://support.epson.com.tw/i-tech/%E6%8A%80%E8%A1%93%E6%96%87%E4%BB%B6/EB-L1070U_L1070_L1060U_Specification_EN.pdf

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class EpsonProjectorAccessory {
  private tvService: Service;

  private projectorState = {
    On: false,
  };


  constructor(
    private readonly platform: EpsonProjectorHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Epson')
      .setCharacteristic(this.platform.Characteristic.Model, platform.config.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, platform.config.serial);

    this.tvService = this.createService(this.platform.Service.Television);
    this.tvService.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);
    this.tvService.setCharacteristic(this.platform.Characteristic.ConfiguredName, platform.config.name!);
    this.tvService.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode, this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
    
    this.tvService.getCharacteristic(this.platform.Characteristic.Active).onGet(this.getActive.bind(this)).onSet(this.setActive.bind(this));
    
    this.tvService.getCharacteristic(this.platform.Characteristic.RemoteKey)
      .onSet((newValue) => {
        switch(newValue) {
        case this.platform.Characteristic.RemoteKey.REWIND: {
          this.platform.log.info('set Remote Key Pressed: REWIND');
          break;
        }
        case this.platform.Characteristic.RemoteKey.FAST_FORWARD: {
          this.platform.log.info('set Remote Key Pressed: FAST_FORWARD');
          break;
        }
        case this.platform.Characteristic.RemoteKey.NEXT_TRACK: {
          this.platform.log.info('set Remote Key Pressed: NEXT_TRACK');
          break;
        }
        case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK: {
          this.platform.log.info('set Remote Key Pressed: PREVIOUS_TRACK');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_UP: {
          this.platform.log.info('set Remote Key Pressed: ARROW_UP');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
          this.platform.log.info('set Remote Key Pressed: ARROW_DOWN');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
          this.platform.log.info('set Remote Key Pressed: ARROW_LEFT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
          this.platform.log.info('set Remote Key Pressed: ARROW_RIGHT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.SELECT: {
          this.platform.log.info('set Remote Key Pressed: SELECT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.BACK: {
          this.platform.log.info('set Remote Key Pressed: BACK');
          break;
        }
        case this.platform.Characteristic.RemoteKey.EXIT: {
          this.platform.log.info('set Remote Key Pressed: EXIT');
          break;
        }
        case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
          this.platform.log.info('set Remote Key Pressed: PLAY_PAUSE');
          break;
        }
        case this.platform.Characteristic.RemoteKey.INFORMATION: {
          this.platform.log.info('set Remote Key Pressed: INFORMATION');
          break;
        }
        }
      });
  }

  /**
   * Finds an existing service or creates a new one based on the provided service type.
   * 
   * @param service - The service type or UUID to create or find.
   * @returns The existing or newly created service.
   */
  createService(service: string | WithUUID<typeof Service>) {
    // Find the existing service, or create a new one, then return it
    return this.accessory.getService(service) || this.accessory.addService(service as unknown as Service);
  }
  
  /**
   * Returns the URL for sending a command to the Epson projector.
   * @param command - The command to be sent.
   * @returns The URL for the specified command.
   */
  private getCommandURL(command: string): string {
    const encodedCommand = encodeURIComponent(command); // URL encode
    return `${this.platform.baseURL}/cgi-bin/json_query?jsoncallback=${encodedCommand}`;
  }

  /**
   * Executes a command on the Epson projector and returns the response.
   * 
   * @param command - The command to be executed.
   * @returns The response from the projector after executing the command.
   */
  private async runCommand(command: string): Promise<string> {
    const url = this.getCommandURL(command); // Get the command's URL
    const { data, res } = await request(url, this.platform.requestOptions);

    const errorType = this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE;
    const CommandError = new this.platform.api.hap.HapStatusError(errorType); // Default Error

    if (res.status !== 200) {
      throw CommandError;
    }
    
    const json = JSON.parse(data);
    if (json.projector.feature.error === true) {
      throw CommandError;
    }
    if (json.projector.feature.reply === PROJECTOR_ERR) {
      throw CommandError;
    }

    return json.projector.feature.reply;
  }

  private async getProperty(property: string) {
    return this.runCommand(property + '?'); // Add `?`
  }

  private async setProperty(property: string, value: CharacteristicValue) {
    return this.runCommand(property + ' ' + value); // Add value
  }

  async setActive(value: CharacteristicValue) {
    const powerResults = await this.setProperty(PROJECTOR_PROPERTY_POWER, (value ? 'ON' : 'OFF'));

    this.projectorState.On = value as boolean;
    this.platform.logger('Set Characteristic On ->', value, powerResults);
  }

  async getActive(): Promise<CharacteristicValue> {
    const powerStatus = await this.getProperty(PROJECTOR_PROPERTY_POWER);
    const active = PROJECTOR_PROPERTY_POWER_ACTIVE_MAP[powerStatus];
    this.platform.logger('Get Characteristic On ->', active);
    return active;
  }

}
