import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';

/**
 * Real-time chat transport. REST endpoints remain the source of truth;
 * the gateway reloads identity from the JWT and relays events per conversation room.
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly userRooms = new Map<string, string[]>(); // socketId -> conversationIds

  constructor(private readonly auth: AuthService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    const user = await this.auth.verifyAccessToken(token);
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.userId = user.userId;
    client.data.email = user.email;
    client.join(`user:${user.userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      client.leave(`user:${userId}`);
    }
    const rooms = this.userRooms.get(client.id) ?? [];
    for (const room of rooms) client.leave(room);
    this.userRooms.delete(client.id);
  }

  @SubscribeMessage('conversation:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    if (!data?.conversationId) return;
    client.join(`conversation:${data.conversationId}`);
    const rooms = this.userRooms.get(client.id) ?? [];
    rooms.push(data.conversationId);
    this.userRooms.set(client.id, rooms);
  }

  @SubscribeMessage('conversation:leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    if (!data?.conversationId) return;
    client.leave(`conversation:${data.conversationId}`);
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token as string | undefined;
    if (auth) return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const header = client.handshake.headers?.authorization as string | undefined;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}