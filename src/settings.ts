/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'EpsonProjector';

/**
 * This must match the name of your plugin as defined the package.json `name` property
 */
export const PLUGIN_NAME = '@irateninja/homebridge-epson-projector';


export const PROJECTOR_ERR = 'ERR';
export const PROJECTOR_SUCCESS = 'SUCCESS';
export const PROJECTOR_PROPERTY_POWER = 'PWR';

export const PROJECTOR_PROPERTY_POWER_ACTIVE_MAP: Record<string, boolean> = {
  '00': false, // Standby condition
  '01': true, // Projecting
  '02': true, // Warm-up status
  '03': false, // Cooling status
  '04': false, // Network monitoring status/communication status
  '05': false, // Error standby status
  '09': true, // Standby status (external output of images and audio is possible)
};
