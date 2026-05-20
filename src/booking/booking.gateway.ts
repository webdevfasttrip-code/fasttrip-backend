import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: true,
})
export class BookingGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BookingGateway.name);

  emitNewBooking(data: any) {
    this.logger.log(`Emitting new-booking event for PNR: ${data.pnr}`);
    this.server.emit('new-booking', data);
  }
}
