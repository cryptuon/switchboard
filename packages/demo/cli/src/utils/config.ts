import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface ChainSyncConfig {
  project: {
    name: string;
    description: string;
    version: string;
  };
  chains: string[];
  network: string;
  solana: {
    network: string;
    rpcUrl: string;
  };
  rpcs: { [chain: string]: string };
  deployment: {
    gasLimit: number;
    gasPrice: string | number;
    confirmations: number;
  };
}

const CONFIG_FILE = '.switchboard.yaml';

export async function loadConfig(): Promise<ChainSyncConfig | null> {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = yaml.parse(configContent);
    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error}`);
  }
}

export async function saveConfig(config: ChainSyncConfig): Promise<void> {
  try {
    const configContent = yaml.stringify(config, {
      indent: 2
    });
    fs.writeFileSync(CONFIG_FILE, configContent);
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error}`);
  }
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}