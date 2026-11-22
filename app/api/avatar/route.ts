import { setAvatar } from '@/lib/game';
import { post } from '@/lib/http';

export const POST = post(b => setAvatar(b.pin, b.id, b.token, b.avatar));
