/**
 * Database client for Switchboard services
 */

import mongoose from 'mongoose';

export class DatabaseClient {
  private static instance: DatabaseClient;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public async connect(uri: string): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(uri);
      this.isConnected = true;
      console.log('Connected to database');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from database');
    }
  }
}