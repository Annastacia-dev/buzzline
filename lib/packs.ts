// Ready-made quizzes: public pages at /quiz/<slug> that anyone can host in one click (/host?pack=<slug>).
// Seasonal packs first, so they're easy to find in December.
import type { Question } from './types';
import type { ThemeId } from './themes';
import type { EffectId } from './effect-ids';

export type PackCategory = 'christmas' | 'party' | 'classroom';
export interface Pack {
  slug: string; title: string; emoji: string; category: PackCategory; theme?: ThemeId; effect?: EffectId;
  /** One or two sentences for the page and search results. */
  blurb: string;
  questions: Question[];
}

export const CATEGORIES: { id: PackCategory; title: string; blurb: string }[] = [
  { id: 'christmas', title: 'Christmas & New Year', blurb: 'For office parties, end-of-term and family games nights.' },
  { id: 'party', title: 'Party & pub quizzes', blurb: 'General knowledge, food, pop culture and icebreakers.' },
  { id: 'classroom', title: 'Classroom', blurb: 'Science, geography and animals, pitched for school.' },
];

const c = (q: string, answers: string[], correct: number, time = 20): Question => ({ q, answers, correct, time });
const tf = (q: string, isTrue: boolean): Question => ({ q, answers: ['True', 'False'], correct: isTrue ? 0 : 1, time: 15 });
const typed = (q: string, accepted: string[], time = 30): Question => ({ q, answers: accepted, correct: 0, time, kind: 'type' });
const order = (q: string, items: string[], time = 30): Question => ({ q, answers: items, correct: 0, time, kind: 'order' });
const poll = (q: string, options: string[], time = 20): Question => ({ q, answers: options, correct: 0, time, kind: 'poll' });

export const PACKS: Pack[] = [
  {
    slug: 'christmas-movies', title: 'Christmas movies quiz', emoji: '🎬', category: 'christmas', theme: 'doodlebug', effect: 'snow',
    blurb: 'Twelve questions on the films everyone watches in December, from Home Alone to Elf, with answers.',
    questions: [
      poll('Warm-up: what is the best Christmas film?', ['Home Alone', 'Elf', 'Love Actually', 'Die Hard']),
      c('In “Home Alone”, where are the McCallisters flying to when they leave Kevin behind?', ['London', 'Paris', 'Rome', 'New York'], 1),
      c('Who plays Buddy in “Elf” (2003)?', ['Will Ferrell', 'Jim Carrey', 'Adam Sandler', 'Owen Wilson'], 0),
      c('What is the name of George Bailey’s guardian angel in “It’s a Wonderful Life”?', ['Gabriel', 'Clarence', 'Joseph', 'Harold'], 1),
      typed('Who wrote the story “A Christmas Carol”?', ['Charles Dickens', 'Dickens']),
      c('In “The Nightmare Before Christmas”, Jack Skellington is the king of which town?', ['Christmas Town', 'Spooky Town', 'Halloween Town', 'Pumpkin Town'], 2),
      typed('In “Die Hard”, what is the name of the skyscraper where the action happens?', ['Nakatomi Plaza', 'Nakatomi', 'Nakatomi Tower']),
      c('Which actor plays the Prime Minister in “Love Actually”?', ['Colin Firth', 'Alan Rickman', 'Hugh Grant', 'Liam Neeson'], 2),
      c('In “The Polar Express”, what is the first gift of Christmas?', ['A sleigh bell', 'A train ticket', 'A snow globe', 'A reindeer'], 0),
      c('In “Elf”, which of these is NOT one of the four main food groups of elves?', ['Candy', 'Candy corn', 'Syrup', 'Gingerbread'], 3),
      c('Who plays the Grinch in the 2000 live-action film?', ['Robin Williams', 'Jim Carrey', 'Steve Martin', 'Eddie Murphy'], 1),
      order('Put these Christmas films in release order, oldest first', ['It’s a Wonderful Life', 'Home Alone', 'Elf', 'Arthur Christmas']),
    ],
  },
  {
    slug: 'christmas-around-the-world', title: 'Christmas around the world quiz', emoji: '🌍', category: 'christmas', theme: 'classic', effect: 'lights',
    blurb: 'How Christmas is celebrated from Iceland to Mexico to Japan: twelve questions with answers.',
    questions: [
      c('Decorated Christmas trees are usually traced back to which country, in the 1500s?', ['Germany', 'England', 'Finland', 'France'], 0),
      c('In Japan, a popular Christmas Eve meal is fried chicken from which chain?', ['McDonald’s', 'Burger King', 'KFC', 'Subway'], 2),
      c('Which country sends London a Christmas tree for Trafalgar Square every year?', ['Sweden', 'Denmark', 'Canada', 'Norway'], 3),
      typed('In Iceland, how many Yule Lads visit children in the days before Christmas?', ['13', 'thirteen']),
      c('On the evening before Sinterklaas (5 December), what do Dutch children put out?', ['A stocking', 'A shoe', 'A candle', 'A bowl of milk'], 1),
      typed('In Italy, which kind witch brings presents on 6 January?', ['La Befana', 'Befana']),
      c('The horned Christmas creature Krampus comes from the folklore of which country?', ['Spain', 'Ireland', 'Austria', 'Greece'], 2),
      c('In Mexico, how many nights do the Las Posadas celebrations last?', ['3', '7', '9', '12'], 2),
      c('“Feliz Navidad” means Merry Christmas in which language?', ['Portuguese', 'Spanish', 'Italian', 'Catalan'], 1),
      tf('In Australia, Christmas falls in the summer.', true),
      order('Put these days in date order, starting in December', ['St Nicholas Day', 'Christmas Eve', 'Boxing Day', 'Epiphany']),
      poll('When should the Christmas tree go up?', ['In November', 'On 1 December', 'Mid-December', 'Christmas Eve']),
    ],
  },
  {
    slug: 'christmas-music', title: 'Christmas music quiz', emoji: '🎶', category: 'christmas', theme: 'glass', effect: 'snow',
    blurb: 'Christmas songs and the singers behind them: a festive music round with answers.',
    questions: [
      c('Who sang “All I Want for Christmas Is You” (1994)?', ['Whitney Houston', 'Mariah Carey', 'Celine Dion', 'Kylie Minogue'], 1),
      c('“Last Christmas” was a hit for which duo?', ['Wham!', 'Pet Shop Boys', 'Erasure', 'Hall & Oates'], 0),
      c('Who recorded “Rockin’ Around the Christmas Tree” in 1958?', ['Dolly Parton', 'Brenda Lee', 'Patsy Cline', 'Doris Day'], 1),
      c('Who wrote the song “White Christmas”?', ['Cole Porter', 'George Gershwin', 'Irving Berlin', 'Frank Sinatra'], 2),
      c('“Fairytale of New York” is by The Pogues and which singer?', ['Sinéad O’Connor', 'Kirsty MacColl', 'Dolores O’Riordan', 'Kate Bush'], 1),
      typed('In “The Twelve Days of Christmas”, which bird arrives on the first day?', ['A partridge', 'Partridge', 'A partridge in a pear tree']),
      c('“Silent Night” was first written in which language?', ['English', 'Latin', 'German', 'French'], 2),
      typed('Which singer released “Step into Christmas” in 1973?', ['Elton John']),
      c('Michael Bublé, whose Christmas album is a December favourite, is from which country?', ['USA', 'Canada', 'Ireland', 'Australia'], 1),
      c('“Do They Know It’s Christmas?” (1984) was recorded by which charity supergroup?', ['Live Aid', 'Band Aid', 'USA for Africa', 'Comic Relief'], 1),
      order('Put these songs in release order, oldest first', ['White Christmas', 'Rockin’ Around the Christmas Tree', 'Last Christmas', 'All I Want for Christmas Is You']),
      poll('Which one gets you dancing?', ['All I Want for Christmas Is You', 'Last Christmas', 'Fairytale of New York', 'Jingle Bell Rock']),
    ],
  },
  {
    slug: 'new-years-eve-quiz', title: 'New Year’s Eve quiz', emoji: '🎆', category: 'christmas', theme: 'glass', effect: 'fireworks',
    blurb: 'Midnight traditions from Spain to Japan to Scotland: a quiz to count down to the New Year.',
    questions: [
      c('Which country is one of the very first to welcome the New Year?', ['Kiribati', 'Japan', 'New Zealand', 'Fiji'], 0),
      typed('In Spain, how many grapes do people eat at the stroke of midnight?', ['12', 'twelve']),
      c('A giant ball drops at midnight in Times Square, in which city?', ['Chicago', 'Los Angeles', 'New York', 'Boston'], 2),
      typed('What do the Scots call their New Year’s Eve celebration?', ['Hogmanay']),
      c('Which poet wrote down the words of “Auld Lang Syne”?', ['William Wordsworth', 'Robert Burns', 'Walter Scott', 'Lord Byron'], 1),
      c('In Denmark, what do people traditionally smash on friends’ doors for luck?', ['Eggs', 'Old plates', 'Glasses', 'Pumpkins'], 1),
      c('At New Year, Buddhist temples in Japan ring their bells how many times?', ['12', '50', '100', '108'], 3),
      c('Dragon dances and red envelopes are part of which New Year?', ['Persian New Year', 'Lunar New Year', 'Jewish New Year', 'Ethiopian New Year'], 1),
      c('Fireworks over which famous harbour bridge are one of the first big New Year shows?', ['Sydney', 'San Francisco', 'Hong Kong', 'Rio de Janeiro'], 0),
      order('Midnight arrives in these cities in which order? First to last', ['Sydney', 'Tokyo', 'London', 'New York']),
      poll('Will you make a New Year’s resolution?', ['Yes, and I’ll keep it', 'Yes, until February', 'Maybe', 'Never']),
    ],
  },
  {
    slug: 'winter-science-quiz', title: 'Winter science quiz', emoji: '❄️', category: 'christmas', theme: 'toybox', effect: 'snow',
    blurb: 'Snowflakes, solstices and hibernation: a winter science quiz for the classroom, with answers.',
    questions: [
      typed('At what temperature does water freeze, in degrees Celsius?', ['0', 'zero', '0 degrees'], 20),
      c('How many sides does a snowflake usually have?', ['4', '5', '6', '8'], 2),
      c('Which of these animals turns white in winter?', ['Arctic fox', 'Red fox', 'Badger', 'Hedgehog'], 0),
      typed('What do we call it when animals sleep through the winter?', ['Hibernation', 'Hibernating', 'Hibernate']),
      c('The shortest day of the year in the Northern Hemisphere is called the winter…', ['Equinox', 'Solstice', 'Eclipse', 'Zenith'], 1),
      c('Why does Earth have seasons?', ['Earth’s tilted axis', 'Earth’s distance from the Sun', 'The Moon', 'Clouds'], 0),
      c('About how much of an iceberg is hidden under the water?', ['A quarter', 'Half', 'Three quarters', 'Nine tenths'], 3),
      c('Most penguins live in which half of the world?', ['Northern Hemisphere', 'Southern Hemisphere'], 1, 15),
      order('Put these in order from coldest to hottest', ['Ice', 'Liquid water', 'Steam']),
      tf('No two snowflakes are thought to be exactly the same.', true),
      poll('Snow day: what are you doing?', ['Snowman', 'Snowball fight', 'Sledging', 'Staying in the warm']),
    ],
  },
  {
    slug: 'general-knowledge-pub-quiz', title: 'General knowledge pub quiz', emoji: '🍻', category: 'party', theme: 'classic',
    blurb: 'A classic pub quiz round: twelve general knowledge questions and answers for any crowd.',
    questions: [
      c('What is the largest planet in our solar system?', ['Saturn', 'Jupiter', 'Neptune', 'Earth'], 1),
      typed('What is the capital of Canada?', ['Ottawa']),
      c('How many bones are in the adult human body?', ['106', '206', '306', '406'], 1),
      typed('What is the chemical symbol for gold?', ['Au'], 20),
      c('Who painted the Mona Lisa?', ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Botticelli'], 2),
      c('Which is the longest river in Africa?', ['Congo', 'Niger', 'Zambezi', 'Nile'], 3),
      typed('How many minutes are there in a day?', ['1440', '1,440']),
      c('What is the smallest country in the world?', ['Monaco', 'Vatican City', 'San Marino', 'Malta'], 1),
      c('What is the hardest natural substance?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2),
      tf('A group of crows is called a murder.', true),
      order('Put these planets in order from the Sun', ['Mercury', 'Venus', 'Earth', 'Mars']),
      { ...c('Bonus, double points: which ocean is the largest?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2), double: true },
    ],
  },
  {
    slug: 'food-around-the-world', title: 'Food around the world quiz', emoji: '🍜', category: 'party', theme: 'toybox',
    blurb: 'Where does paella come from? Which spice costs the most? A tasty quiz round with answers.',
    questions: [
      c('Sushi comes from which country?', ['China', 'Japan', 'Thailand', 'Korea'], 1),
      c('Paella is a famous dish from which country?', ['Italy', 'Mexico', 'Spain', 'Portugal'], 2),
      typed('What is the main ingredient of guacamole?', ['Avocado', 'Avocados']),
      c('Feta cheese is most associated with which country?', ['Greece', 'France', 'Turkey', 'Italy'], 0),
      c('Kimchi, made from fermented vegetables, comes from which country?', ['Japan', 'Vietnam', 'Korea', 'Indonesia'], 2),
      c('Which spice is the most expensive by weight?', ['Vanilla', 'Cinnamon', 'Saffron', 'Cardamom'], 2),
      typed('Pho, a noodle soup, is the national dish of which country?', ['Vietnam', 'Viet Nam']),
      c('Which of these is a type of pasta?', ['Paneer', 'Penne', 'Pita', 'Polenta'], 1),
      tf('Tomatoes are a fruit.', true),
      c('Naan bread is most associated with which country?', ['India', 'Egypt', 'Brazil', 'Russia'], 0),
      poll('The big question: pineapple on pizza?', ['Yes, always', 'Sometimes', 'Never', 'What’s pizza?']),
    ],
  },
  {
    slug: '90s-and-2000s-quiz', title: '90s and 2000s quiz', emoji: '📼', category: 'party', theme: 'doodlebug',
    blurb: 'Tamagotchis, Titanic and the Spice Girls: a nostalgia quiz for millennials, with answers.',
    questions: [
      typed('In “Friends”, what is the name of the coffee shop?', ['Central Perk']),
      c('In which year was the first Harry Potter book published?', ['1995', '1997', '1999', '2001'], 1),
      c('Which Pokémon is number 25 in the Pokédex?', ['Charmander', 'Pikachu', 'Bulbasaur', 'Squirtle'], 1),
      c('How many Spice Girls were there?', ['3', '4', '5', '6'], 2),
      c('Who directed “Titanic” (1997)?', ['Steven Spielberg', 'James Cameron', 'Ridley Scott', 'Peter Jackson'], 1),
      c('Which company released the PlayStation in 1994?', ['Nintendo', 'Sega', 'Sony', 'Microsoft'], 2),
      typed('What is the name of Shrek’s wife?', ['Fiona', 'Princess Fiona']),
      c('The Tamagotchi digital pet came from which country?', ['USA', 'Japan', 'South Korea', 'UK'], 1),
      order('Put these films in release order, oldest first', ['Toy Story', 'Titanic', 'Shrek', 'Finding Nemo']),
      poll('Best decade for music?', ['The 90s', 'The 2000s', 'The 2010s', 'Today']),
    ],
  },
  {
    slug: 'office-party-quiz', title: 'Office party quiz', emoji: '🎉', category: 'party', theme: 'glass',
    blurb: 'Icebreaker polls and light trivia for the office party or team meeting. Everyone can join from their phone.',
    questions: [
      poll('First things first: coffee or tea?', ['Coffee', 'Tea', 'Neither', 'Both, constantly']),
      c('In an email, what does “CC” stand for?', ['Carbon copy', 'Courtesy copy', 'Copy chain', 'Central contact'], 0),
      typed('What does “www” stand for in a web address?', ['World Wide Web']),
      poll('Best day of the working week?', ['Monday', 'Wednesday', 'Thursday', 'Friday']),
      c('Which day of the week is known as “hump day”?', ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], 1),
      typed('What does “ASAP” stand for?', ['As soon as possible']),
      poll('Pick a superpower for Monday mornings', ['Teleporting to work', 'Reading minds', 'Never needing sleep', 'Pausing time']),
      order('Put these inventions in order, oldest first', ['Telephone', 'Television', 'Personal computer', 'Smartphone']),
      c('How many hours are in a working week of five eight-hour days?', ['35', '40', '45', '48'], 1, 15),
      poll('Dream team holiday?', ['Beach', 'Mountains', 'City break', 'Staying home']),
    ],
  },
  {
    slug: 'capital-cities-quiz', title: 'Capital cities quiz', emoji: '🗺️', category: 'classroom', theme: 'inkblot',
    blurb: 'Ten capital cities, from Canberra to Nairobi: a geography quiz with answers, good for school.',
    questions: [
      c('What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2),
      typed('What is the capital of Japan?', ['Tokyo']),
      c('What is the capital of Brazil?', ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'], 2),
      typed('What is the capital of Kenya?', ['Nairobi']),
      c('What is the capital of Turkey?', ['Istanbul', 'Ankara', 'Izmir', 'Antalya'], 1),
      c('What is the capital of Egypt?', ['Cairo', 'Alexandria', 'Giza', 'Luxor'], 0),
      c('What is the capital of New Zealand?', ['Auckland', 'Christchurch', 'Wellington', 'Queenstown'], 2),
      c('Which city is the seat of Switzerland’s government?', ['Zurich', 'Geneva', 'Bern', 'Basel'], 2),
      typed('What is the capital of South Korea?', ['Seoul']),
      c('What is the capital of Argentina?', ['Buenos Aires', 'Córdoba', 'Santiago', 'Montevideo'], 0),
    ],
  },
  {
    slug: 'science-quiz-for-kids', title: 'Science quiz for kids', emoji: '🔬', category: 'classroom', theme: 'toybox',
    blurb: 'Plants, planets and the human body: a science quiz for kids, with typed answers and an order round.',
    questions: [
      c('What is H₂O better known as?', ['Salt', 'Water', 'Oxygen', 'Sugar'], 1),
      c('What is the closest star to Earth?', ['The Sun', 'Sirius', 'The North Star', 'Alpha Centauri'], 0),
      typed('What is the process plants use to make food from sunlight?', ['Photosynthesis']),
      typed('Which force keeps our feet on the ground?', ['Gravity']),
      c('How many chambers does the human heart have?', ['2', '3', '4', '5'], 2),
      c('Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1),
      c('Which gas makes up most of the air we breathe?', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], 2),
      order('Put these in order from smallest to biggest', ['Atom', 'Cell', 'Mouse', 'Elephant']),
      tf('Sound travels faster than light.', false),
      c('About how fast does light travel?', ['300 km per second', '3,000 km per second', '300,000 km per second', '3 million km per second'], 2),
    ],
  },
  {
    slug: 'animal-quiz-for-kids', title: 'Animal quiz for kids', emoji: '🐼', category: 'classroom', theme: 'doodlebug',
    blurb: 'Cheetahs, joeys and octopuses: a fun animal quiz for kids, with answers.',
    questions: [
      c('What is the fastest land animal?', ['Lion', 'Cheetah', 'Horse', 'Greyhound'], 1),
      c('What is the largest animal on Earth?', ['African elephant', 'Giraffe', 'Blue whale', 'Great white shark'], 2),
      typed('How many legs does a spider have?', ['8', 'eight'], 20),
      typed('What is a baby kangaroo called?', ['Joey']),
      c('Which of these birds cannot fly?', ['Penguin', 'Eagle', 'Parrot', 'Owl'], 0),
      c('What do giant pandas mostly eat?', ['Fish', 'Bamboo', 'Berries', 'Insects'], 1),
      c('How many hearts does an octopus have?', ['1', '2', '3', '4'], 2),
      typed('What is a group of lions called?', ['Pride', 'A pride']),
      order('Put these animals in order from lightest to heaviest', ['Hummingbird', 'Cat', 'Horse', 'Giraffe']),
      poll('Which animal would you most like as a pet?', ['Dog', 'Cat', 'Rabbit', 'Dragon']),
    ],
  },
];

export const packBySlug = (slug: string) => PACKS.find(p => p.slug === slug);
