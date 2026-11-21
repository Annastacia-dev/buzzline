import { join } from '@/lib/game';
import { post } from '@/lib/http';

export const POST = post(b => join(b.pin, b.name));
