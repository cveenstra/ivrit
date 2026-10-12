"""Candidate vocabulary. Nothing here is trusted: build_data.py looks every title up on English
Wiktionary and keeps an entry only when a Hebrew headword on that page has a sense matching
`gloss` (or the `match` keywords). Spelling with niqqud, the unpointed (ktiv male) spelling,
the transliteration and gender all come from Wiktionary, never from this file.

Line format:  id | wiktionary title (unpointed) | learner gloss | category | match keywords (optional) | flags
flags: inf = informal/slang, pos=<noun|verb|adj|...> to prefer a part of speech
"""

RAW = r"""
# --- greetings & politeness
hello | שלום | hello, peace | greet | hello
good-morning | בוקר טוב | good morning | greet
good-evening | ערב טוב | good evening | greet
good-night | לילה טוב | good night | greet
thanks | תודה | thank you, thanks | greet | thank
thanks-a-lot | תודה רבה | thank you very much | greet | thank
please | בבקשה | please; you're welcome | greet | please
excuse-me | סליחה | excuse me, sorry | greet | sorry
yes | כן | yes | greet
no | לא | no, not | greet | no
goodbye | להתראות | goodbye, see you | greet | goodbye
bye | ביי | bye | greet | bye | inf
okay | בסדר | okay, all right | greet | okay | inf
yalla | יאללה | come on, let's go | greet | come on | inf
sababa | סבבה | cool, great | greet | cool | inf
achla | אחלה | awesome, the best | greet | awesome | inf
nice-to-meet | נעים מאוד | nice to meet you | greet | nice to meet
welcome | ברוך הבא | welcome | greet | welcome
bon-appetit | בתיאבון | bon appetit | greet | bon appetit
congrats | מזל טוב | congratulations | greet | congratulations
shabbat-shalom | שבת שלום | Shabbat shalom (said on the Sabbath) | greet | shabbat shalom
cheers | לחיים | a toast, cheers (literally "to life") | greet | toast
happy-holiday | חג שמח | holiday greeting (literally "happy holiday") | greet | greeting
whats-up | מה נשמע | what's up?, how are things? | greet | how | inf
fine | בסדר גמור | totally fine | greet | fine | inf

# --- pronouns & people
i | אני | I | people
you-m | אתה | you (m. sg.) | people | you
you-f | את | you (f. sg.) | people | you
he | הוא | he | people
she | היא | she | people
we | אנחנו | we | people
you-mp | אתם | you (m. pl.) | people | you
you-fp | אתן | you (f. pl.) | people | you
they-m | הם | they (m.) | people | they
they-f | הן | they (f.) | people | they
man | איש | man | people | man
woman | אישה | woman; wife | people | woman
boy | ילד | boy, child | people | child
girl | ילדה | girl | people | girl
person | אדם | human, man | people | human
friend-m | חבר | friend (m.) | people | friend
friend-f | חברה | friend (f.) | people | friend
name | שם | name | people | name
guy | בחור | young man, guy | people | young man
neighbor | שכן | neighbor | people | neighbo
guest | אורח | guest | people | guest
baby | תינוק | baby | people | baby
everyone | כולם | everyone | people | everyone
someone | מישהו | someone | people | someone

# --- family
dad | אבא | father (dad) | family | father
mom | אמא | mother (mom) | family | mother
brother | אח | brother | family | brother
sister | אחות | sister; nurse | family | sister
son | בן | son | family | son
daughter | בת | daughter | family | daughter
grandpa | סבא | grandfather (grandpa) | family | grandfather
grandma | סבתא | grandmother (grandma) | family | grandmother
family | משפחה | family | family | family
uncle | דוד | uncle | family | uncle
aunt | דודה | aunt | family | aunt
husband | בעל | husband | family | husband
cousin | בן דוד | cousin (m.) | family | cousin
twins | תאומים | twins | family | twin
wedding | חתונה | wedding | family | wedding
home | בית | house, home | family | house

# --- numbers
zero | אפס | zero | num
one-f | אחת | one (f., used for counting) | num | one
two-f | שתיים | two (f., used for counting) | num | two
three-f | שלוש | three (f., used for counting) | num | three
four-f | ארבע | four (f., used for counting) | num | four
five-f | חמש | five (f., used for counting) | num | five
six-f | שש | six (f., used for counting) | num | six
seven-f | שבע | seven (f., used for counting) | num | seven
eight-f | שמונה | eight | num | eight
nine-f | תשע | nine (f., used for counting) | num | nine
ten-f | עשר | ten (f., used for counting) | num | ten
one-m | אחד | one (m.) | num | one
three-m | שלושה | three (m.) | num | three
four-m | ארבעה | four (m.) | num | four
five-m | חמישה | five (m.) | num | five
six-m | שישה | six (m.) | num | six
seven-m | שבעה | seven (m.) | num | seven
nine-m | תשעה | nine (m.) | num | nine
ten-m | עשרה | ten (m.) | num | ten
two-m | שניים | two (m.) | num | two
twenty | עשרים | twenty | num
thirty | שלושים | thirty | num
forty | ארבעים | forty | num
fifty | חמישים | fifty | num
hundred | מאה | hundred | num | hundred
two-hundred | מאתיים | two hundred | num | two hundred
thousand | אלף | thousand | num | thousand
million | מיליון | million | num | million
number | מספר | number | num | number
first | ראשון | first | num | first
second | שני | second; Monday | num | second
half | חצי | half | num | half
many | הרבה | a lot, many | num | lot
little | קצת | a little, a bit | num | little
more | עוד | more, another | num | more

# --- food & drink
food | אוכל | food | food | food
bread | לחם | bread | food | bread
water | מים | water | food | water
coffee | קפה | coffee | food | coffee
tea | תה | tea | food | tea
milk | חלב | milk | food | milk
egg | ביצה | egg | food | egg
cheese | גבינה | cheese | food | cheese
chicken | עוף | chicken | food | chicken
meat | בשר | meat | food | meat
fish | דג | fish | food | fish
rice | אורז | rice | food | rice
salad | סלט | salad | food | salad
fruit | פרי | fruit | food | fruit
vegetable | ירק | vegetable | food | vegetable
apple | תפוח | apple | food | apple
banana | בננה | banana | food | banana
orange | תפוז | orange | food | orange
tomato | עגבנייה | tomato | food | tomato
cucumber | מלפפון | cucumber | food | cucumber
hummus | חומוס | hummus; chickpea | food | chickpea
falafel | פלאפל | falafel | food | falafel
pita | פיתה | pita | food | pita
chocolate | שוקולד | chocolate | food | chocolate
cake | עוגה | cake | food | cake
sugar | סוכר | sugar | food | sugar
salt | מלח | salt | food | salt
wine | יין | wine | food | wine
beer | בירה | beer | food | beer
juice | מיץ | juice | food | juice
breakfast | ארוחת בוקר | breakfast | food | breakfast
dinner | ארוחת ערב | dinner | food | dinner
meal | ארוחה | meal | food | meal
restaurant | מסעדה | restaurant | food | restaurant
menu | תפריט | menu | food | menu
bill | חשבון | bill, check; account | food | bill
tasty | טעים | tasty, delicious | food | tasty
soup | מרק | soup | food | soup
honey | דבש | honey | food | honey
olive | זית | olive | food | olive
oil | שמן | oil | food | oil
ice-cream | גלידה | ice cream | food | ice cream
cup | כוס | cup, glass | food | cup
plate | צלחת | plate | food | plate
fork | מזלג | fork | food | fork
knife | סכין | knife | food | knife
spoon | כף | spoon | food | spoon
potato | תפוח אדמה | potato | food | potato
onion | בצל | onion | food | onion
lemon | לימון | lemon | food | lemon
grape | ענב | grape | food | grape
watermelon | אבטיח | watermelon | food | watermelon
schnitzel | שניצל | schnitzel | food | schnitzel

# --- places & directions
where | איפה | where | place | where
here | פה | here | place | here
here2 | כאן | here | place | here
there | שם | there | place | there
right | ימין | right | place | right
left | שמאל | left | place | left
straight | ישר | straight | place | straight
near | קרוב | near, close | place | near
far | רחוק | far | place | far
street | רחוב | street | place | street
city | עיר | city | place | city
room | חדר | room | place | room
toilet | שירותים | toilet, restroom | place | toilet
station | תחנה | station, stop | place | station
hotel | מלון | hotel | place | hotel
apartment | דירה | apartment | place | apartment
store | חנות | store, shop | place | shop
market | שוק | market | place | market
bank | בנק | bank | place | bank
hospital | בית חולים | hospital | place | hospital
school | בית ספר | school | place | school
university | אוניברסיטה | university | place | university
sea | ים | sea | place | sea
beach | חוף | beach, shore | place | beach
park | פארק | park | place | park
airport | שדה תעופה | airport | place | airport
country | ארץ | country, land | place | country
israel | ישראל | Israel | place | israel
jerusalem | ירושלים | Jerusalem | place | jerusalem
tel-aviv | תל אביב | Tel Aviv | place | tel aviv
synagogue | בית כנסת | synagogue | place | synagogue
museum | מוזיאון | museum | place | museum
office | משרד | office; ministry | place | office
pharmacy | בית מרקחת | pharmacy | place | pharmacy
kiosk | קיוסק | kiosk | place | kiosk
north | צפון | north | place | north
south | דרום | south | place | south
inside | בפנים | inside | place | inside
outside | בחוץ | outside | place | outside
up | למעלה | up, upstairs | place | up
down | למטה | down, downstairs | place | down
next-to | ליד | next to, near | place | next to
between | בין | between | place | between

# --- transport
bus | אוטובוס | bus | travel | bus
train | רכבת | train | travel | train
taxi | מונית | taxi | travel | taxi
car | מכונית | car | travel | car
car2 | אוטו | car | travel | car | inf
bicycle | אופניים | bicycle | travel | bicycle
plane | מטוס | airplane | travel | airplane
ticket | כרטיס | ticket, card | travel | ticket
road | כביש | road | travel | road
way | דרך | way, road | travel | way
passport | דרכון | passport | travel | passport
suitcase | מזוודה | suitcase | travel | suitcase
map | מפה | map | travel | map
trip | טיול | tour, trip, hike | travel | tour
driver | נהג | driver | travel | driver
ship | אונייה | ship | travel | ship

# --- time & days
day | יום | day | time | day
night | לילה | night | time | night
morning | בוקר | morning | time | morning
evening | ערב | evening | time | evening
noon | צהריים | noon, midday | time | noon
today | היום | today | time | today
tomorrow | מחר | tomorrow | time | tomorrow
yesterday | אתמול | yesterday | time | yesterday
now | עכשיו | now | time | now
later | אחר כך | later, afterwards | time | after
week | שבוע | week | time | week
month | חודש | month | time | month
year | שנה | year | time | year
hour | שעה | hour; o'clock, time | time | hour
minute | דקה | minute | time | minute
sunday | יום ראשון | Sunday | time | sunday
monday | יום שני | Monday | time | monday
tuesday | יום שלישי | Tuesday | time | tuesday
wednesday | יום רביעי | Wednesday | time | wednesday
thursday | יום חמישי | Thursday | time | thursday
friday | יום שישי | Friday | time | friday
saturday | שבת | Saturday, Shabbat | time | saturday
weekend | סוף שבוע | weekend | time | weekend
time | זמן | time | time | time
always | תמיד | always | time | always
never | אף פעם | never | time | never
sometimes | לפעמים | sometimes | time | sometimes
already | כבר | already | time | already
again | שוב | again | time | again
soon | בקרוב | soon | time | soon
early | מוקדם | early | time | early
late | מאוחר | late | time | late
holiday | חג | holiday, festival | time | holiday
birthday | יום הולדת | birthday | time | birthday
summer | קיץ | summer | time | summer
winter | חורף | winter | time | winter
spring | אביב | spring | time | spring
autumn | סתיו | autumn, fall | time | autumn

# --- shopping & money
how-much | כמה | how much, how many | shop | how
money | כסף | money; silver | shop | money
shekel | שקל | shekel | shop | shekel
price | מחיר | price | shop | price
expensive | יקר | expensive; dear | shop | expensive
cheap | זול | cheap | shop | cheap
bag | שקית | bag | shop | bag
receipt | קבלה | receipt | shop | receipt
discount | הנחה | discount | shop | discount
cash | מזומן | cash | shop | cash
open | פתוח | open | shop | open
closed | סגור | closed | shop | closed
sale | מבצע | sale, special offer; operation | shop | sale
size | מידה | size | shop | size
gift | מתנה | gift, present | shop | gift
credit-card | כרטיס אשראי | credit card | shop | credit card
change-money | עודף | change (money) | shop | change

# --- adjectives & feelings
good | טוב | good | feel | good | pos=adj
bad | רע | bad | feel | bad | pos=adj
big | גדול | big | feel | big | pos=adj
small | קטן | small | feel | small | pos=adj
new | חדש | new | feel | new | pos=adj
old | ישן | old | feel | old | pos=adj
beautiful | יפה | beautiful, pretty | feel | beautiful | pos=adj
hot | חם | hot, warm | feel | hot | pos=adj
cold | קר | cold | feel | cold | pos=adj
happy | שמח | happy, glad | feel | happy | pos=adj
sad | עצוב | sad | feel | sad | pos=adj
tired | עייף | tired | feel | tired | pos=adj
hungry | רעב | hungry | feel | hungry | pos=adj
thirsty | צמא | thirsty | feel | thirsty | pos=adj
sick | חולה | sick, ill | feel | sick | pos=adj
busy | עסוק | busy | feel | busy | pos=adj
ready | מוכן | ready | feel | ready | pos=adj
easy | קל | easy, light | feel | easy | pos=adj
hard | קשה | hard, difficult | feel | difficult | pos=adj
right-correct | נכון | correct, right | feel | correct | pos=adj
important | חשוב | important | feel | important | pos=adj
interesting | מעניין | interesting | feel | interesting | pos=adj
nice | נחמד | nice | feel | nice | pos=adj
sweet | מתוק | sweet | feel | sweet | pos=adj
quiet | שקט | quiet | feel | quiet | pos=adj
clean | נקי | clean | feel | clean | pos=adj
long | ארוך | long | feel | long | pos=adj
short | קצר | short | feel | short | pos=adj
young | צעיר | young | feel | young | pos=adj
strong | חזק | strong | feel | strong | pos=adj
afraid | מפחד | afraid, scared | feel | afraid
love-noun | אהבה | love | feel | love
glad | שמחה | joy, happiness | feel | joy
very | מאוד | very | feel | very
excellent | מצוין | exceptional, excellent | feel | exceptional | pos=adj
crazy | משוגע | crazy | feel | crazy | pos=adj | inf
funny | מצחיק | funny | feel | funny | pos=adj

# --- questions & little words
what | מה | what | qword | what
who | מי | who | qword | who
when | מתי | when | qword | when
why | למה | why | qword | why
how | איך | how | qword | how
which | איזה | which (m.) | qword | which
is-it | האם | question particle (starts a yes-or-no question) | qword | interrogative
also | גם | also, too | qword | also
only | רק | only | qword | only
with | עם | with; people, nation | qword | with
without | בלי | without | qword | without
but | אבל | but | qword | but
because | כי | because | qword | because
if | אם | if | qword | if
or | או | or | qword | or
this-m | זה | this, it (m.) | qword | this
this-f | זאת | this (f.) | qword | this
there-is | יש | there is, there are | qword | there is
there-isnt | אין | there is not, there are not | qword | there is not
maybe | אולי | maybe, perhaps | qword | maybe
all | כל | all, every | qword | all
so | אז | so, then | qword | then
of | של | of, belonging to | qword | belonging
like | כמו | like, as | qword | like
thing | דבר | thing; word | qword | thing
something | משהו | something | qword | something
together | ביחד | together | qword | together
enough | מספיק | enough | qword | enough
really | באמת | really, truly | qword | really

# --- home & things
door | דלת | door | home | door
window | חלון | window | home | window
table | שולחן | table | home | table
chair | כיסא | chair | home | chair
bed | מיטה | bed | home | bed
kitchen | מטבח | kitchen | home | kitchen
shower | מקלחת | shower | home | shower
phone | טלפון | telephone | home | telephone
cellphone | פלאפון | mobile phone | home | mobile phone | inf
computer | מחשב | computer | home | computer
book | ספר | book | home | book
pen | עט | pen | home | pen
key | מפתח | key | home | key
bag-handbag | תיק | bag, briefcase | home | bag
clothes | בגד | garment, clothing | home | garment | pos=noun
shoes | נעליים | shoes | home | shoe
light | אור | light | home | light
picture | תמונה | picture, photo | home | picture
television | טלוויזיה | television | home | television
refrigerator | מקרר | refrigerator | home | refrigerator
newspaper | עיתון | newspaper | home | newspaper
letter-mail | מכתב | letter (mail) | home | letter
paper | נייר | paper | home | paper
box | קופסה | box | home | box
garden | גינה | garden | home | garden
wall | קיר | wall | home | wall
floor | רצפה | floor | home | floor
roof | גג | roof | home | roof
balcony | מרפסת | balcony | home | balcony
stairs | מדרגות | stairs | home | stair
elevator | מעלית | elevator | home | elevator
neighborhood | שכונה | neighborhood | home | neighborhood

# --- body & health
head | ראש | head | body | head
hand | יד | hand | body | hand
leg | רגל | leg, foot | body | leg
eye | עין | eye | body | eye
ear | אוזן | ear | body | ear
mouth | פה | mouth | body | mouth
nose | אף | nose | body | nose
heart | לב | heart | body | heart
stomach | בטן | belly, abdomen | body | belly
back | גב | back | body | back
tooth | שן | tooth | body | tooth
hair | שיער | hair | body | hair
face | פנים | face | body | face
body | גוף | body | body | body
doctor | רופא | doctor | body | doctor
medicine | תרופה | medicine | body | medicine
pain | כאב | pain | body | pain
healthy | בריא | healthy | body | healthy | pos=adj
nurse | אחות | nurse; sister | body | nurse
fever | חום | fever; heat | body | fever
blood | דם | blood | body | blood
help | עזרה | help | body | help
emergency | חירום | emergency | body | emergency
ambulance | אמבולנס | ambulance | body | ambulance

# --- weather & nature
sun | שמש | sun | nature | sun
rain | גשם | rain | nature | rain
wind | רוח | wind; spirit | nature | wind
cloud | ענן | cloud | nature | cloud
snow | שלג | snow | nature | snow
weather | מזג אוויר | weather | nature | weather
air | אוויר | air | nature | air
tree | עץ | tree; wood | nature | tree
flower | פרח | flower | nature | flower
mountain | הר | mountain | nature | mountain
river | נהר | river | nature | river
desert | מדבר | desert | nature | desert
sky | שמים | sky, heaven | nature | sky
moon | ירח | moon | nature | moon
star | כוכב | star | nature | star
earth | אדמה | earth, soil | nature | soil
stone | אבן | stone | nature | stone
fire | אש | fire | nature | fire
world | עולם | world | nature | world
sand | חול | sand | nature | sand
lake | אגם | lake | nature | lake
forest | יער | forest | nature | forest

# --- colors & clothes
red | אדום | red | color | red | pos=adj
blue | כחול | blue | color | blue | pos=adj
green | ירוק | green | color | green | pos=adj
yellow | צהוב | yellow | color | yellow | pos=adj
white | לבן | white | color | white | pos=adj
black | שחור | black | color | black | pos=adj
brown | חום | brown | color | brown | pos=adj
pink | ורוד | pink | color | pink | pos=adj
purple | סגול | purple | color | purple | pos=adj
orange-color | כתום | orange (colour) | color | orange | pos=adj
gray | אפור | grey | color | grey | pos=adj
color | צבע | color | color | colo
shirt | חולצה | shirt | color | shirt
pants | מכנסיים | trousers, pants | color | trousers
dress | שמלה | dress | color | dress
hat | כובע | hat | color | hat
shoe | נעל | shoe | color | shoe
coat | מעיל | coat | color | coat
skirt | חצאית | skirt | color | skirt
glasses | משקפיים | glasses, spectacles | color | glasses

# --- work & study
work | עבודה | work, job | work | work
teacher | מורה | teacher | work | teacher
student | תלמיד | pupil, student | work | pupil
student-uni | סטודנט | student (university) | work | student
lesson | שיעור | lesson | work | lesson
test | מבחן | test, exam | work | test
notebook | מחברת | notebook | work | notebook
hebrew | עברית | Hebrew (language) | work | hebrew
english | אנגלית | English (language) | work | english
language | שפה | language; lip | work | language
word | מילה | word | work | word
question | שאלה | question | work | question
answer | תשובה | answer | work | answer
problem | בעיה | problem | work | problem
idea | רעיון | idea | work | idea
meeting | פגישה | meeting | work | meeting
boss | בוס | boss | work | boss | inf
salary | משכורת | salary | work | salary
class | כיתה | class, classroom | work | class
homework | שיעורי בית | homework | work | homework
army | צבא | army | work | army
soldier | חייל | soldier | work | soldier
engineer | מהנדס | engineer | work | engineer
police | משטרה | police | work | police

# --- animals
dog | כלב | dog | animal | dog
cat | חתול | cat | animal | cat
bird | ציפור | bird | animal | bird
horse | סוס | horse | animal | horse
cow | פרה | cow | animal | cow
sheep | כבש | sheep | animal | sheep
lion | אריה | lion | animal | lion
camel | גמל | camel | animal | camel
donkey | חמור | donkey | animal | donkey
snake | נחש | snake | animal | snake
mouse | עכבר | mouse | animal | mouse
monkey | קוף | monkey | animal | monkey
bear | דוב | bear | animal | bear
elephant | פיל | elephant | animal | elephant
butterfly | פרפר | butterfly | animal | butterfly
bee | דבורה | bee | animal | bee
""".strip()

# Verbs: the lemma page (3rd person masc. sg. past) gives the present-tense forms in its
# conjugation table; each form's own page gives its transliteration.
VERBS = r"""
eat | אכל | eat | eat
drink | שתה | drink | drink
go | הלך | go, walk | go
live | גר | live, reside | live
speak | דיבר | speak, talk | speak
love | אהב | love, like | love
want | רצה | want | want
work-v | עבד | work | work
study | למד | learn, study | learn
read | קרא | read; call | read
write | כתב | write | write
see | ראה | see | see
hear | שמע | hear, listen | hear
know | ידע | know | know
do | עשה | do, make | do
come | בא | come | come
sit | ישב | sit | sit
buy | קנה | buy | buy
travel | נסע | travel, go (by vehicle) | travel
think | חשב | think | think
understand | הבין | understand | understand
sleep | ישן | sleep | sleep
help-v | עזר | help | help
look-for | חיפש | look for, search | search
open-v | פתח | open | open
close-v | סגר | close | close
say | אמר | say | say
give | נתן | give | give
take | לקח | take | take
ask | שאל | ask | ask
pay | שילם | pay | pay
need | צריך | need, must | need
can | יכול | can, be able | able
cook | בישל | cook | cook
play | שיחק | play | play
dance | רקד | dance | dance
sing | שר | sing | sing
run | רץ | run | run
wait | חיכה | wait | wait
""".strip()


def parse_lines(raw, fields):
    out = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = [p.strip() for p in line.split('|')]
        rec = dict(zip(fields, parts + [''] * (len(fields) - len(parts))))
        out.append(rec)
    return out


def words():
    out = []
    for r in parse_lines(RAW, ['id', 'title', 'gloss', 'cat', 'match', 'flags']):
        flags = r['flags'].split() if r['flags'] else []
        r['informal'] = 'inf' in flags
        r['pos'] = next((f.split('=', 1)[1] for f in flags if f.startswith('pos=')), None)
        r['match'] = r['match'] or r['gloss'].split(',')[0].split('(')[0].strip()
        out.append(r)
    return out


def verbs():
    return parse_lines(VERBS, ['id', 'title', 'gloss', 'match'])
