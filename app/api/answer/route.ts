import { answer } from '@/lib/game';
import { post } from '@/lib/http';

export const POST = post(b => answer(b.pin, b.id, b.token, b.choice));
