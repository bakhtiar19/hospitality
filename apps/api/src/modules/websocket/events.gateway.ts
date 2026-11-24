import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const propertyId = client.handshake.query.propertyId as string;
    if (propertyId) {
      client.join(`property:${propertyId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // client cleaned up automatically
  }

  @SubscribeMessage('joinProperty')
  handleJoinProperty(client: Socket, propertyId: string) {
    client.join(`property:${propertyId}`);
    return { status: 'joined', propertyId };
  }

  broadcastTapeChartUpdate(propertyId: string, payload: unknown) {
    this.server.to(`property:${propertyId}`).emit('tape_chart:updated', payload);
  }

  broadcastNewBooking(propertyId: string, booking: unknown) {
    this.server.to(`property:${propertyId}`).emit('booking:created', booking);
  }

  broadcastHousekeepingUpdate(propertyId: string, task: unknown) {
    this.server.to(`property:${propertyId}`).emit('housekeeping:updated', task);
  }

  broadcastPaymentSettled(propertyId: string, payload: unknown) {
    this.server.to(`property:${propertyId}`).emit('payment:settled', payload);
  }
}
