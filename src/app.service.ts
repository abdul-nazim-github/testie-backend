import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHealth() {
    return {
      status: 'active',
      state: 'up',
      dbConnected: Number(this.connection.readyState) === 1,
      timestamp: new Date().toISOString(),
    };
  }
}
