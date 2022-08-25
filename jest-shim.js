import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ArrayBuffer = ArrayBuffer;
global.Uint8Array = Uint8Array;

jest.setTimeout(3600000);