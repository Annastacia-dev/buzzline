import { createGame } from '@/lib/game';
import { post } from '@/lib/http';
import type { Quiz } from '@/lib/types';

export const POST = post(b => createGame(b.quiz as Quiz));
