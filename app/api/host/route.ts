import { hostAction } from '@/lib/game';
import { post } from '@/lib/http';

export const POST = post(b => hostAction(b.pin, b.token, b.action, b.playerId));
