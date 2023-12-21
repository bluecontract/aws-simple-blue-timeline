import { AxiosRequestConfig } from 'axios';

export const ID_PATTERN = /^[0-9a-f]{64}$/;
export const SIGNATURE_PATTERN = /^[0-9a-f]+$/;
export const RESOURCE_ID_PATTERN = /^[a-f0-9-]+$/;

let axiosConfig: AxiosRequestConfig;
let apiEndpointUrl: string;
let numberOfQueryRetries: number = 10;
let milliecondsBetweenRetries: number = 1000;

export const sleep = async (s: number) => await new Promise((r) => setTimeout(r, s * 1000));

export const msleep = async (m: number) => await new Promise((r) => setTimeout(r, m));

export const initialize = async () => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY environment variable not set');
  }

  if (!process.env.API_ENDPOINT_URL) {
    throw new Error('API_ENDPOINT_URL environment variable not set');
  }

  if (process.env.NUMBER_OF_QUERY_RETRIES) {
    numberOfQueryRetries = parseInt(process.env.NUMBER_OF_QUERY_RETRIES);
  }

  if (process.env.MILLISECONDS_BETWEEN_RETRIES) {
    milliecondsBetweenRetries = parseInt(process.env.MILLISECONDS_BETWEEN_RETRIES);
  }

  axiosConfig = {
    headers: {
      'x-api-key:': process.env.API_KEY,
      'content-type': 'application/json',
    }
  };

  apiEndpointUrl = process.env.API_ENDPOINT_URL;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseJSON = (str: string): any | undefined => {
  try {
    return JSON.parse(str);
  } catch (e) {
      return undefined;
  }
}

export const isJSON = (str: string): boolean => {
  return parseJSON(str) !== undefined;
}
