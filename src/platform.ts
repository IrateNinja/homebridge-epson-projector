import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { RequestOptions } from 'urllib';

import { EpsonProjectorAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class EpsonProjectorHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];
  
  // Load configuration values
  private readonly name: string;
  private readonly model: string;
  private readonly serial: string;

  private readonly ipAddress: string;
  private readonly requestTimeout: number;
  private readonly pollingInterval: number;
  
  private readonly referer: string;
  private readonly useDigestAuth: boolean;
  private readonly digestAuthUsername: string;
  private readonly digestAuthPassword: string;

  private readonly debug: boolean;
  public readonly logger = (message: string, ...parameters: unknown[]) => {
    this.log[this.debug ? 'info' : 'debug']('DEBUG', message, ...parameters);
  };
  
  // HTTP request attributes
  public readonly baseURL: string;
  public readonly requestOptions: RequestOptions;

  // private brightnessControl: string

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;


    // Load Configurations values
    this.name = this.config.name!;
    this.model = this.config.model!;
    this.serial = this.config.serial!;

    this.ipAddress = this.config.ipAddress!;
    this.requestTimeout = this.config.requestTimeout!;
    this.pollingInterval = this.config.pollingInterval!;
    
    this.referer = this.config.referer!;
    if (!this.referer.startsWith('http')) {
      // Ensure referer includes the protocol and host
      this.referer = `http://${this.ipAddress}${this.referer}`;
    }
    this.useDigestAuth = this.config.useDigestAuth!;
    this.digestAuthUsername = this.config.digestAuthUsername!;
    this.digestAuthPassword = this.config.digestAuthPassword!;

    this.debug = this.config.debug;

    // HTTP request attributes
    this.baseURL = `http://${this.ipAddress}`;
    const headers = { 'Referer': this.referer };
    this.requestOptions = { method: 'GET', headers, timeout: this.requestTimeout };
    
    if (this.useDigestAuth) {
      // Add the needed digestAuth value to the request options if useDigestAuth is set
      this.requestOptions.digestAuth = `${this.digestAuthUsername}:${this.digestAuthPassword}`;
    }
  

    // Brightness Control
    // this.brightnessControl = this.config.brightnessControl




    this.logger('Finished initializing platform');

    this.api.on('didFinishLaunching', () => {
      this.logger('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.logger('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    const devices = [
      {
        name: this.name,
        model: this.model,
        serial: this.serial,
        ipAddress: this.ipAddress,
      },
    ];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of devices) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.serial);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.logger('Restoring existing accessory from cache:', existingAccessory.UUID);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new EpsonProjectorAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.logger('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.logger('Adding new accessory:', device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new EpsonProjectorAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      // push into discoveredCacheUUIDs
      this.discoveredCacheUUIDs.push(uuid);
    }

    // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
    // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
    // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.logger('Removing existing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
