
-- Word bank table
CREATE TABLE public.word_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'EN',
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  word TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  min_players INT NOT NULL DEFAULT 4,
  max_players INT NOT NULL DEFAULT 8,
  total_rounds INT NOT NULL DEFAULT 3,
  current_round INT NOT NULL DEFAULT 0,
  reveal_time INT NOT NULL DEFAULT 10,
  discussion_time INT NOT NULL DEFAULT 90,
  voting_time INT NOT NULL DEFAULT 45,
  language TEXT NOT NULL DEFAULT 'EN',
  phase TEXT NOT NULL DEFAULT 'lobby',
  secret_word TEXT,
  imposter_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Room players
CREATE TABLE public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT true,
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, session_id)
);

-- Votes
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round INT NOT NULL,
  voter_session_id TEXT NOT NULL,
  target_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, round, voter_session_id)
);

-- Room events log
CREATE TABLE public.room_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rooms_code ON public.rooms(code);
CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_room_players_room ON public.room_players(room_id);
CREATE INDEX idx_room_players_session ON public.room_players(session_id);
CREATE INDEX idx_votes_room_round ON public.votes(room_id, round);
CREATE INDEX idx_word_bank_lang ON public.word_bank(language, is_active);
CREATE INDEX idx_room_events_room ON public.room_events(room_id);

-- Enable RLS on all tables
ALTER TABLE public.word_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;

-- Word bank: anyone can read active words (no secret data)
CREATE POLICY "Anyone can read active words" ON public.word_bank
  FOR SELECT USING (is_active = true);

-- Rooms: anyone can read (secret_word is hidden via edge function, not raw query)
-- We'll use a view or edge function to hide secret_word
CREATE POLICY "Anyone can read rooms" ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert rooms" ON public.rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update rooms" ON public.rooms
  FOR UPDATE USING (true);

-- Room players: anyone can read/insert/update
CREATE POLICY "Anyone can read players" ON public.room_players
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert players" ON public.room_players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update players" ON public.room_players
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete players" ON public.room_players
  FOR DELETE USING (true);

-- Votes: anyone can read/insert
CREATE POLICY "Anyone can read votes" ON public.votes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert votes" ON public.votes
  FOR INSERT WITH CHECK (true);

-- Room events: anyone can read/insert
CREATE POLICY "Anyone can read events" ON public.room_events
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert events" ON public.room_events
  FOR INSERT WITH CHECK (true);

-- Enable realtime for rooms and room_players
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- Create a secure view that hides secret_word and imposter_session_id
CREATE VIEW public.rooms_safe AS
SELECT id, code, host_session_id, status, min_players, max_players,
  total_rounds, current_round, reveal_time, discussion_time, voting_time,
  language, phase, created_at, updated_at, closed_at
FROM public.rooms;

-- Seed word bank with words (English)
INSERT INTO public.word_bank (language, category, word, difficulty) VALUES
-- Animals
('EN','Animals','Dog','easy'),('EN','Animals','Cat','easy'),('EN','Animals','Elephant','easy'),('EN','Animals','Tiger','easy'),('EN','Animals','Lion','easy'),('EN','Animals','Bear','easy'),('EN','Animals','Wolf','easy'),('EN','Animals','Fox','easy'),('EN','Animals','Rabbit','easy'),('EN','Animals','Horse','easy'),('EN','Animals','Dolphin','medium'),('EN','Animals','Eagle','medium'),('EN','Animals','Shark','medium'),('EN','Animals','Penguin','medium'),('EN','Animals','Giraffe','medium'),('EN','Animals','Zebra','medium'),('EN','Animals','Monkey','easy'),('EN','Animals','Snake','medium'),('EN','Animals','Owl','medium'),('EN','Animals','Whale','medium'),('EN','Animals','Crocodile','medium'),('EN','Animals','Parrot','medium'),('EN','Animals','Butterfly','easy'),('EN','Animals','Turtle','easy'),('EN','Animals','Frog','easy'),('EN','Animals','Deer','easy'),('EN','Animals','Bat','medium'),('EN','Animals','Octopus','medium'),('EN','Animals','Peacock','medium'),('EN','Animals','Camel','medium'),
-- Food
('EN','Food','Pizza','easy'),('EN','Food','Burger','easy'),('EN','Food','Sushi','medium'),('EN','Food','Pasta','easy'),('EN','Food','Bread','easy'),('EN','Food','Chocolate','easy'),('EN','Food','Ice Cream','easy'),('EN','Food','Rice','easy'),('EN','Food','Cheese','easy'),('EN','Food','Salad','easy'),('EN','Food','Steak','medium'),('EN','Food','Soup','easy'),('EN','Food','Cake','easy'),('EN','Food','Cookie','easy'),('EN','Food','Pancake','easy'),('EN','Food','Sandwich','easy'),('EN','Food','Taco','easy'),('EN','Food','Donut','easy'),('EN','Food','Popcorn','easy'),('EN','Food','Apple','easy'),('EN','Food','Banana','easy'),('EN','Food','Orange','easy'),('EN','Food','Grape','easy'),('EN','Food','Mango','medium'),('EN','Food','Watermelon','easy'),('EN','Food','Strawberry','easy'),('EN','Food','Lemon','easy'),('EN','Food','Tomato','easy'),('EN','Food','Potato','easy'),('EN','Food','Onion','easy'),
-- Objects
('EN','Objects','Phone','easy'),('EN','Objects','Computer','easy'),('EN','Objects','Chair','easy'),('EN','Objects','Table','easy'),('EN','Objects','Book','easy'),('EN','Objects','Pen','easy'),('EN','Objects','Key','easy'),('EN','Objects','Clock','easy'),('EN','Objects','Mirror','easy'),('EN','Objects','Lamp','easy'),('EN','Objects','Camera','medium'),('EN','Objects','Guitar','medium'),('EN','Objects','Umbrella','easy'),('EN','Objects','Glasses','easy'),('EN','Objects','Wallet','easy'),('EN','Objects','Backpack','easy'),('EN','Objects','Pillow','easy'),('EN','Objects','Candle','easy'),('EN','Objects','Scissors','easy'),('EN','Objects','Hammer','easy'),('EN','Objects','Ladder','medium'),('EN','Objects','Telescope','medium'),('EN','Objects','Compass','medium'),('EN','Objects','Balloon','easy'),('EN','Objects','Crown','medium'),('EN','Objects','Shield','medium'),('EN','Objects','Sword','medium'),('EN','Objects','Map','easy'),('EN','Objects','Flag','easy'),('EN','Objects','Bell','easy'),
-- Jobs
('EN','Jobs','Doctor','easy'),('EN','Jobs','Teacher','easy'),('EN','Jobs','Chef','easy'),('EN','Jobs','Pilot','easy'),('EN','Jobs','Firefighter','easy'),('EN','Jobs','Police Officer','easy'),('EN','Jobs','Farmer','easy'),('EN','Jobs','Painter','easy'),('EN','Jobs','Singer','easy'),('EN','Jobs','Actor','easy'),('EN','Jobs','Dentist','medium'),('EN','Jobs','Engineer','medium'),('EN','Jobs','Astronaut','medium'),('EN','Jobs','Mechanic','medium'),('EN','Jobs','Barber','easy'),('EN','Jobs','Baker','easy'),('EN','Jobs','Photographer','medium'),('EN','Jobs','Magician','medium'),('EN','Jobs','Plumber','medium'),('EN','Jobs','Scientist','medium'),('EN','Jobs','Judge','medium'),('EN','Jobs','Soldier','medium'),('EN','Jobs','Sailor','medium'),('EN','Jobs','Detective','medium'),('EN','Jobs','Librarian','medium'),('EN','Jobs','Carpenter','medium'),('EN','Jobs','Electrician','medium'),('EN','Jobs','Architect','medium'),('EN','Jobs','Surgeon','hard'),('EN','Jobs','Journalist','medium'),
-- Places
('EN','Places','Beach','easy'),('EN','Places','Mountain','easy'),('EN','Places','Forest','easy'),('EN','Places','Desert','easy'),('EN','Places','Hospital','easy'),('EN','Places','School','easy'),('EN','Places','Airport','easy'),('EN','Places','Museum','medium'),('EN','Places','Library','easy'),('EN','Places','Park','easy'),('EN','Places','Restaurant','easy'),('EN','Places','Cinema','easy'),('EN','Places','Church','easy'),('EN','Places','Castle','medium'),('EN','Places','Bridge','easy'),('EN','Places','Stadium','medium'),('EN','Places','Zoo','easy'),('EN','Places','Gym','easy'),('EN','Places','Market','easy'),('EN','Places','Farm','easy'),('EN','Places','Island','medium'),('EN','Places','Volcano','medium'),('EN','Places','Cave','medium'),('EN','Places','Lighthouse','medium'),('EN','Places','Prison','medium'),('EN','Places','Palace','medium'),('EN','Places','Temple','medium'),('EN','Places','Jungle','medium'),('EN','Places','Waterfall','medium'),('EN','Places','Garden','easy'),
-- Nature
('EN','Nature','Sun','easy'),('EN','Nature','Moon','easy'),('EN','Nature','Star','easy'),('EN','Nature','Rain','easy'),('EN','Nature','Snow','easy'),('EN','Nature','Thunder','medium'),('EN','Nature','Rainbow','easy'),('EN','Nature','River','easy'),('EN','Nature','Ocean','easy'),('EN','Nature','Cloud','easy'),('EN','Nature','Wind','easy'),('EN','Nature','Fire','easy'),('EN','Nature','Tree','easy'),('EN','Nature','Flower','easy'),('EN','Nature','Rock','easy'),('EN','Nature','Sand','easy'),('EN','Nature','Ice','easy'),('EN','Nature','Lightning','medium'),('EN','Nature','Earthquake','medium'),('EN','Nature','Tornado','medium'),('EN','Nature','Fog','medium'),('EN','Nature','Wave','easy'),('EN','Nature','Sunset','easy'),('EN','Nature','Storm','medium'),('EN','Nature','Frost','medium'),('EN','Nature','Coral','medium'),('EN','Nature','Mushroom','easy'),('EN','Nature','Cactus','medium'),('EN','Nature','Bamboo','medium'),('EN','Nature','Volcano','medium'),
-- Daily Items
('EN','Daily Items','Toothbrush','easy'),('EN','Daily Items','Soap','easy'),('EN','Daily Items','Towel','easy'),('EN','Daily Items','Spoon','easy'),('EN','Daily Items','Fork','easy'),('EN','Daily Items','Knife','easy'),('EN','Daily Items','Plate','easy'),('EN','Daily Items','Cup','easy'),('EN','Daily Items','Bottle','easy'),('EN','Daily Items','Bag','easy'),('EN','Daily Items','Shoe','easy'),('EN','Daily Items','Hat','easy'),('EN','Daily Items','Belt','easy'),('EN','Daily Items','Watch','easy'),('EN','Daily Items','Ring','easy'),('EN','Daily Items','Brush','easy'),('EN','Daily Items','Blanket','easy'),('EN','Daily Items','Rope','easy'),('EN','Daily Items','Needle','medium'),('EN','Daily Items','Button','easy'),('EN','Daily Items','Zipper','easy'),('EN','Daily Items','Eraser','easy'),('EN','Daily Items','Stapler','easy'),('EN','Daily Items','Tape','easy'),('EN','Daily Items','Glue','easy'),('EN','Daily Items','Envelope','easy'),('EN','Daily Items','Stamp','easy'),('EN','Daily Items','Battery','easy'),('EN','Daily Items','Charger','easy'),('EN','Daily Items','Headphones','easy'),
-- Abstract
('EN','Abstract','Love','medium'),('EN','Abstract','Freedom','medium'),('EN','Abstract','Time','medium'),('EN','Abstract','Dream','medium'),('EN','Abstract','Peace','medium'),('EN','Abstract','Music','easy'),('EN','Abstract','Dance','easy'),('EN','Abstract','Shadow','medium'),('EN','Abstract','Secret','medium'),('EN','Abstract','Memory','medium'),('EN','Abstract','Luck','medium'),('EN','Abstract','Power','medium'),('EN','Abstract','Speed','medium'),('EN','Abstract','Silence','medium'),('EN','Abstract','Magic','medium'),('EN','Abstract','Fear','medium'),('EN','Abstract','Joy','medium'),('EN','Abstract','Hope','medium'),('EN','Abstract','Trust','medium'),('EN','Abstract','Truth','medium'),
-- Arabic words
('AR','Animals','كلب','easy'),('AR','Animals','قطة','easy'),('AR','Animals','فيل','easy'),('AR','Animals','نمر','easy'),('AR','Animals','أسد','easy'),('AR','Animals','دب','easy'),('AR','Animals','ذئب','easy'),('AR','Animals','ثعلب','easy'),('AR','Animals','أرنب','easy'),('AR','Animals','حصان','easy'),('AR','Animals','دلفين','medium'),('AR','Animals','نسر','medium'),('AR','Animals','قرش','medium'),('AR','Animals','بطريق','medium'),('AR','Animals','زرافة','medium'),('AR','Animals','حمار وحشي','medium'),('AR','Animals','قرد','easy'),('AR','Animals','أفعى','medium'),('AR','Animals','بومة','medium'),('AR','Animals','حوت','medium'),('AR','Animals','تمساح','medium'),('AR','Animals','ببغاء','medium'),('AR','Animals','فراشة','easy'),('AR','Animals','سلحفاة','easy'),('AR','Animals','ضفدع','easy'),('AR','Animals','غزال','easy'),('AR','Animals','خفاش','medium'),('AR','Animals','أخطبوط','medium'),('AR','Animals','طاووس','medium'),('AR','Animals','جمل','medium'),
('AR','Food','بيتزا','easy'),('AR','Food','برغر','easy'),('AR','Food','سوشي','medium'),('AR','Food','معكرونة','easy'),('AR','Food','خبز','easy'),('AR','Food','شوكولاتة','easy'),('AR','Food','آيس كريم','easy'),('AR','Food','أرز','easy'),('AR','Food','جبنة','easy'),('AR','Food','سلطة','easy'),('AR','Food','ستيك','medium'),('AR','Food','شوربة','easy'),('AR','Food','كيك','easy'),('AR','Food','بسكويت','easy'),('AR','Food','بان كيك','easy'),('AR','Food','ساندويتش','easy'),('AR','Food','تاكو','easy'),('AR','Food','دونات','easy'),('AR','Food','فشار','easy'),('AR','Food','تفاحة','easy'),('AR','Food','موز','easy'),('AR','Food','برتقال','easy'),('AR','Food','عنب','easy'),('AR','Food','مانجو','medium'),('AR','Food','بطيخ','easy'),('AR','Food','فراولة','easy'),('AR','Food','ليمون','easy'),('AR','Food','طماطم','easy'),('AR','Food','بطاطا','easy'),('AR','Food','بصل','easy'),
('AR','Objects','هاتف','easy'),('AR','Objects','حاسوب','easy'),('AR','Objects','كرسي','easy'),('AR','Objects','طاولة','easy'),('AR','Objects','كتاب','easy'),('AR','Objects','قلم','easy'),('AR','Objects','مفتاح','easy'),('AR','Objects','ساعة','easy'),('AR','Objects','مرآة','easy'),('AR','Objects','مصباح','easy'),('AR','Objects','كاميرا','medium'),('AR','Objects','غيتار','medium'),('AR','Objects','مظلة','easy'),('AR','Objects','نظارات','easy'),('AR','Objects','محفظة','easy'),('AR','Objects','حقيبة','easy'),('AR','Objects','وسادة','easy'),('AR','Objects','شمعة','easy'),('AR','Objects','مقص','easy'),('AR','Objects','مطرقة','easy'),
('AR','Jobs','طبيب','easy'),('AR','Jobs','معلم','easy'),('AR','Jobs','طاهٍ','easy'),('AR','Jobs','طيار','easy'),('AR','Jobs','إطفائي','easy'),('AR','Jobs','شرطي','easy'),('AR','Jobs','مزارع','easy'),('AR','Jobs','رسام','easy'),('AR','Jobs','مغني','easy'),('AR','Jobs','ممثل','easy'),('AR','Jobs','مهندس','medium'),('AR','Jobs','رائد فضاء','medium'),('AR','Jobs','ميكانيكي','medium'),('AR','Jobs','حلاق','easy'),('AR','Jobs','خباز','easy'),('AR','Jobs','مصور','medium'),('AR','Jobs','ساحر','medium'),('AR','Jobs','سباك','medium'),('AR','Jobs','عالم','medium'),('AR','Jobs','قاضي','medium'),
('AR','Places','شاطئ','easy'),('AR','Places','جبل','easy'),('AR','Places','غابة','easy'),('AR','Places','صحراء','easy'),('AR','Places','مستشفى','easy'),('AR','Places','مدرسة','easy'),('AR','Places','مطار','easy'),('AR','Places','متحف','medium'),('AR','Places','مكتبة','easy'),('AR','Places','حديقة','easy'),('AR','Places','مطعم','easy'),('AR','Places','سينما','easy'),('AR','Places','مسجد','easy'),('AR','Places','قلعة','medium'),('AR','Places','جسر','easy'),('AR','Places','ملعب','medium'),('AR','Places','حديقة حيوان','easy'),('AR','Places','صالة رياضية','easy'),('AR','Places','سوق','easy'),('AR','Places','مزرعة','easy'),
('AR','Nature','شمس','easy'),('AR','Nature','قمر','easy'),('AR','Nature','نجمة','easy'),('AR','Nature','مطر','easy'),('AR','Nature','ثلج','easy'),('AR','Nature','رعد','medium'),('AR','Nature','قوس قزح','easy'),('AR','Nature','نهر','easy'),('AR','Nature','محيط','easy'),('AR','Nature','سحابة','easy'),('AR','Nature','رياح','easy'),('AR','Nature','نار','easy'),('AR','Nature','شجرة','easy'),('AR','Nature','وردة','easy'),('AR','Nature','صخرة','easy'),('AR','Nature','رمل','easy'),('AR','Nature','جليد','easy'),('AR','Nature','برق','medium'),('AR','Nature','زلزال','medium'),('AR','Nature','إعصار','medium'),
('AR','Daily Items','فرشاة أسنان','easy'),('AR','Daily Items','صابون','easy'),('AR','Daily Items','منشفة','easy'),('AR','Daily Items','ملعقة','easy'),('AR','Daily Items','شوكة','easy'),('AR','Daily Items','سكين','easy'),('AR','Daily Items','صحن','easy'),('AR','Daily Items','كوب','easy'),('AR','Daily Items','زجاجة','easy'),('AR','Daily Items','حذاء','easy'),
-- Kurdish Central (Sorani)
('KU_CENTRAL','Animals','سەگ','easy'),('KU_CENTRAL','Animals','پشیلە','easy'),('KU_CENTRAL','Animals','فیل','easy'),('KU_CENTRAL','Animals','پڵنگ','easy'),('KU_CENTRAL','Animals','شێر','easy'),('KU_CENTRAL','Animals','ورچ','easy'),('KU_CENTRAL','Animals','گورگ','easy'),('KU_CENTRAL','Animals','رێوی','easy'),('KU_CENTRAL','Animals','کەروێشک','easy'),('KU_CENTRAL','Animals','ئەسپ','easy'),('KU_CENTRAL','Animals','دۆڵفین','medium'),('KU_CENTRAL','Animals','هەڵۆ','medium'),('KU_CENTRAL','Animals','شارک','medium'),('KU_CENTRAL','Animals','پەنگوین','medium'),('KU_CENTRAL','Animals','زەرافە','medium'),('KU_CENTRAL','Animals','مەیمون','easy'),('KU_CENTRAL','Animals','مار','medium'),('KU_CENTRAL','Animals','کوند','medium'),('KU_CENTRAL','Animals','نەهەنگ','medium'),('KU_CENTRAL','Animals','تمساح','medium'),
('KU_CENTRAL','Food','پیتزا','easy'),('KU_CENTRAL','Food','بەرگەر','easy'),('KU_CENTRAL','Food','سوشی','medium'),('KU_CENTRAL','Food','نان','easy'),('KU_CENTRAL','Food','شیکۆلاتە','easy'),('KU_CENTRAL','Food','بەستەنی','easy'),('KU_CENTRAL','Food','برنج','easy'),('KU_CENTRAL','Food','پەنیر','easy'),('KU_CENTRAL','Food','زەلاتە','easy'),('KU_CENTRAL','Food','شۆربا','easy'),('KU_CENTRAL','Food','کێک','easy'),('KU_CENTRAL','Food','بیسکویت','easy'),('KU_CENTRAL','Food','ساندویچ','easy'),('KU_CENTRAL','Food','سێو','easy'),('KU_CENTRAL','Food','مۆز','easy'),('KU_CENTRAL','Food','پرتەقاڵ','easy'),('KU_CENTRAL','Food','ترێ','easy'),('KU_CENTRAL','Food','شوتی','easy'),('KU_CENTRAL','Food','تەماتە','easy'),('KU_CENTRAL','Food','پەتاتە','easy'),
('KU_CENTRAL','Objects','مۆبایل','easy'),('KU_CENTRAL','Objects','کۆمپیوتەر','easy'),('KU_CENTRAL','Objects','کورسی','easy'),('KU_CENTRAL','Objects','مێز','easy'),('KU_CENTRAL','Objects','کتێب','easy'),('KU_CENTRAL','Objects','پێنووس','easy'),('KU_CENTRAL','Objects','کلیل','easy'),('KU_CENTRAL','Objects','کاتژمێر','easy'),('KU_CENTRAL','Objects','ئاوێنە','easy'),('KU_CENTRAL','Objects','لامپ','easy'),
('KU_CENTRAL','Jobs','پزیشک','easy'),('KU_CENTRAL','Jobs','مامۆستا','easy'),('KU_CENTRAL','Jobs','چێشتکەر','easy'),('KU_CENTRAL','Jobs','فڕۆکەوان','easy'),('KU_CENTRAL','Jobs','ئاگرکوژێنەوە','easy'),('KU_CENTRAL','Jobs','پۆلیس','easy'),('KU_CENTRAL','Jobs','جوتیار','easy'),('KU_CENTRAL','Jobs','وێنەکێش','easy'),('KU_CENTRAL','Jobs','گۆرانیبێژ','easy'),('KU_CENTRAL','Jobs','ئەکتەر','easy'),
('KU_CENTRAL','Places','کەناری دەریا','easy'),('KU_CENTRAL','Places','شاخ','easy'),('KU_CENTRAL','Places','دارستان','easy'),('KU_CENTRAL','Places','بیابان','easy'),('KU_CENTRAL','Places','نەخۆشخانە','easy'),('KU_CENTRAL','Places','قوتابخانە','easy'),('KU_CENTRAL','Places','فڕۆکەخانە','easy'),('KU_CENTRAL','Places','مۆزەخانە','medium'),('KU_CENTRAL','Places','کتێبخانە','easy'),('KU_CENTRAL','Places','پارک','easy'),
('KU_CENTRAL','Nature','خۆر','easy'),('KU_CENTRAL','Nature','مانگ','easy'),('KU_CENTRAL','Nature','ئەستێرە','easy'),('KU_CENTRAL','Nature','باران','easy'),('KU_CENTRAL','Nature','بەفر','easy'),('KU_CENTRAL','Nature','هەورەترەشە','medium'),('KU_CENTRAL','Nature','کەوانەباران','easy'),('KU_CENTRAL','Nature','ڕووبار','easy'),('KU_CENTRAL','Nature','دەریا','easy'),('KU_CENTRAL','Nature','هەور','easy');
