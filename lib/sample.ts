import type { Quiz, Question } from './types';

export const blankQuestion = (): Question => ({ q: '', answers: ['', '', '', ''], correct: 0, time: 20 });

export const sampleQuiz = (): Quiz => ({
  id: 'sample',
  title: 'Around the World Warm-up',
  questions: [
    { q: 'Which planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correct: 1, time: 20 },
    { q: 'What is the largest ocean on Earth?', answers: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3, time: 20 },
    { q: 'Octopuses have three hearts.', answers: ['True', 'False'], correct: 0, time: 15 },
    { q: 'Which language has the most native speakers?', answers: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], correct: 2, time: 20 },
    { q: 'How many sides does a hexagon have?', answers: ['5', '6', '7', '8'], correct: 1, time: 10 },
    { q: 'What gas do plants absorb from the air?', answers: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], correct: 2, time: 20, double: true },
  ],
});
