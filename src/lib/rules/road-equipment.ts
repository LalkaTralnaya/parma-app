// Источник: «Дорожное и полезное снаряжение Пармы.md». Вес новых вещей в источнике не указан.
import type { Item } from './items';
export const ROAD_EQUIPMENT: Item[] = [
  {
    "id": "backpack",
    "name": "Заплечный мешок",
    "category": "misc",
    "price": 1.0,
    "description": "Холщовый мешок с лямками для личных вещей",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "leather_satchel",
    "name": "Кожаная дорожная сума",
    "category": "misc",
    "price": 3.0,
    "description": "Закрытая сумка с ремнями; бережёт вещи от брызг",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "belt_pouch",
    "name": "Поясной кошель",
    "category": "misc",
    "price": 0.2,
    "description": "Для монет и мелочей",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "canvas_sack",
    "name": "Холщовый мешок",
    "category": "misc",
    "price": 0.05,
    "description": "Для зерна, припасов или находок",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "waxed_pouch",
    "name": "Вощёный мешочек",
    "category": "misc",
    "price": 0.3,
    "description": "Для трута, трав и записок; защищает от сырости, пока закрыт",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "blanket",
    "name": "Одеяло шерстяное",
    "category": "misc",
    "price": 1.0,
    "description": "Для сна и укрывания на привале",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "felt_sleeping_mat",
    "name": "Подстилка войлочная",
    "category": "misc",
    "price": 0.8,
    "description": "Отделяет спящего от холодной земли",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "travel_tarp",
    "name": "Полог дорожный",
    "category": "misc",
    "price": 2.0,
    "description": "Полотнище с петлями; натягивается на опоры, верёвка приобретается отдельно",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "two_person_tent",
    "name": "Шатёр на двоих",
    "category": "misc",
    "price": 6.0,
    "description": "Полотно, стойки, растяжки и колышки; места для двух спящих",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "waterskin",
    "name": "Бурдюк для воды",
    "category": "misc",
    "price": 0.5,
    "description": "Кожаная ёмкость на суточный запас одного путника в обычных условиях",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "wooden_flask",
    "name": "Фляга деревянная",
    "category": "misc",
    "price": 0.3,
    "description": "Небольшой сосуд с пробкой для воды или взвара",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "cooking_kit",
    "name": "Котёл походный",
    "category": "misc",
    "price": 2.0,
    "description": "Для приготовления общей еды на небольшом привале",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "bowl_spoon",
    "name": "Миска и ложка",
    "category": "misc",
    "price": 0.15,
    "description": "Простой деревянный столовый набор",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "mug",
    "name": "Кружка деревянная",
    "category": "misc",
    "price": 0.1,
    "description": "Для питья; не герметичная тара",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "rations",
    "name": "Сухой дорожный паёк на день",
    "category": "consumable",
    "price": 0.05,
    "description": "Обычный запас еды для одного путника",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "soap",
    "name": "Мыло, кусок",
    "category": "misc",
    "price": 0.1,
    "description": "Для мытья и ухода за одеждой",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "sewing_kit",
    "name": "Игла, нить и заплаты",
    "category": "misc",
    "price": 0.3,
    "description": "Небольшой набор для починки ткани",
    "equipmentGroup": "В дорогу и к ночлегу",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "matches",
    "name": "Огниво",
    "category": "misc",
    "price": 0.5,
    "description": "Кремень и кресало; нужен сухой трут ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "tinderbox",
    "name": "Трутница с сухим трутом",
    "category": "misc",
    "price": 0.2,
    "description": "Коробочка и запас растопки для нескольких огней ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "tinder",
    "name": "Запас трута",
    "category": "misc",
    "price": 0.05,
    "description": "Сухая растопка без коробочки ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "torch",
    "name": "Факел",
    "category": "consumable",
    "price": 0.05,
    "description": "Смоляной факел; горит около часа Ясный свет 4 сажени, слабый ещё 2. ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "candle",
    "name": "Свеча восковая",
    "category": "consumable",
    "price": 0.2,
    "description": "Одна свеча; около часа света. Десяток стоит 2 с Ясный свет 1 сажень, слабый ещё 1. ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "wood_splints",
    "name": "Лучины, связка",
    "category": "consumable",
    "price": 0.05,
    "description": "Для неподвижного освещения у держателя; не дорожный факел ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "oil_lamp",
    "name": "Лампа масляная",
    "category": "misc",
    "price": 0.5,
    "description": "Простой сосуд с фитилём; масло приобретается отдельно Ясный свет 4 сажени, слабый ещё 2. ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "lantern",
    "name": "Фонарь закрытый",
    "category": "misc",
    "price": 3.0,
    "description": "Лампа в корпусе со створками; защищает огонь от умеренного ветра Ясный свет 4 сажени, слабый ещё 2. ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "oil_flask",
    "name": "Масло светильное, фляга",
    "category": "consumable",
    "price": 0.2,
    "description": "Одна заправка обычной лампы примерно на 6 часов Масло для освещения: без автоматического боевого урона.",
    "equipmentGroup": "Огонь и освещение",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "lamp_wicks",
    "name": "Фитили, 5 штук",
    "category": "misc",
    "price": 0.1,
    "description": "Запас для лампы или фонаря ",
    "equipmentGroup": "Огонь и освещение",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 5
  },
  {
    "id": "rope",
    "name": "Верёвка пеньковая, 10 саженей",
    "category": "tool",
    "price": 3.0,
    "description": "Обычная бухта для лазанья и страховки",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "rope_15",
    "name": "Верёвка пеньковая, 15 саженей",
    "category": "tool",
    "price": 4.5,
    "description": "Более длинная бухта для спуска, страховки и растяжек",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "cord_5",
    "name": "Шнур прочный, 5 саженей",
    "category": "tool",
    "price": 0.3,
    "description": "Для тюков и мелких креплений; не страховочная верёвка",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "iron_chain_2",
    "name": "Цепь железная, 2 сажени",
    "category": "tool",
    "price": 5.0,
    "description": "Для крепления груза или препятствия; не заменяет замок",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "grappling_hook",
    "name": "Крюк с несколькими зубьями",
    "category": "tool",
    "price": 2.0,
    "description": "Для зацепа за подходящую опору; верёвка отдельно",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "iron_stakes",
    "name": "Железные колья, 5 штук",
    "category": "tool",
    "price": 1.0,
    "description": "Для растяжек и креплений в подходящем грунте",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 5
  },
  {
    "id": "climbing_pitons",
    "name": "Крепёжные крючья, 10 штук",
    "category": "tool",
    "price": 8.0,
    "description": "Набор для лазанья и креплений в подходящей породе",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 10
  },
  {
    "id": "safety_harness",
    "name": "Страховочная перевязь",
    "category": "tool",
    "price": 2.0,
    "description": "Ремни и петли для крепления человека к верёвке",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "wooden_ladder",
    "name": "Лестница деревянная, 2 сажени",
    "category": "tool",
    "price": 1.0,
    "description": "Для доступного подъёма; громоздкая вещь",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "wooden_pole",
    "name": "Шест деревянный, 2 сажени",
    "category": "tool",
    "price": 0.1,
    "description": "Для проверки глубины, опоры и перемещения лёгких предметов",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "crowbar",
    "name": "Лом железный",
    "category": "tool",
    "price": 2.0,
    "description": "Рычаг для подъёма крышки, снятия скобы и вскрытия преграды Рычаг даёт +5 к одной подходящей проверке Силы. Не к атакам или Взлому отмычкой; несколько ломов не складывают бонус.",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "lifting_winch",
    "name": "Блок с подъёмным воротом",
    "category": "tool",
    "price": 8.0,
    "description": "Для медленного подъёма груза; требует крепкой опоры и подходящей верёвки",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "shovel",
    "name": "Лопата",
    "category": "tool",
    "price": 1.0,
    "description": "Для земляных работ и расчистки",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "pickaxe",
    "name": "Кирка",
    "category": "tool",
    "price": 2.0,
    "description": "Для каменистой земли и горных работ",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "hand_saw",
    "name": "Пила ручная",
    "category": "tool",
    "price": 2.0,
    "description": "Для распиловки дерева",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "whetstone",
    "name": "Точильный камень",
    "category": "tool",
    "price": 0.1,
    "description": "Для обычного ухода за режущим инструментом",
    "equipmentGroup": "Верёвки, подъём и тяжёлая работа",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "snares",
    "name": "Силки, 3 штуки",
    "category": "tool",
    "price": 0.5,
    "description": "Петли для мелкой дичи; нужна подходящая постановка",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 3
  },
  {
    "id": "hunting_trap",
    "name": "Капкан охотничий",
    "category": "tool",
    "price": 5.0,
    "description": "Железная ловушка с короткой цепью и креплением для добычи среднего размера Установка около минуты. Избавление Ловкости −5: при провале 1к4 колющего без модификатора и остановка движения; закреплённая цепь ограничивает движение до 1 сажени. Освобождение: основное действие и Сила −5; неудача без повторного урона. Руда автоматически не накладывается.",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "fishing_kit",
    "name": "Рыболовный набор",
    "category": "tool",
    "price": 1.0,
    "description": "Леска, крючки, грузила, поплавок и простое удилище",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "fishing_net",
    "name": "Рыболовная сеть",
    "category": "tool",
    "price": 3.0,
    "description": "Для подходящего водоёма и местной рыбы",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "bell",
    "name": "Колокольчик",
    "category": "tool",
    "price": 0.3,
    "description": "Для предупреждения о движении; шнур отдельно",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "signal_whistle",
    "name": "Свисток сигнальный",
    "category": "tool",
    "price": 0.1,
    "description": "Подаёт условный сигнал; значение заранее согласуют",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "caltrops",
    "name": "Железные шипы, сумка 20 штук",
    "category": "tool",
    "price": 2.0,
    "description": "Для опасного участка на дороге или в проходе Сумка покрывает до 1 квадратной сажени за основное действие. Незаметившая цель: Избавление Ловкости −5, при провале 1 колющего и конец движения. Замеченные шипы обходят или проходят с половиной скорости. Несколько сумок увеличивают площадь, не урон.",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 20
  },
  {
    "id": "manacles",
    "name": "Кандалы с ключом",
    "category": "tool",
    "price": 4.0,
    "description": "Оковы для человека; не универсальная тюрьма для любого существа",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "lock",
    "name": "Замок с ключом",
    "category": "tool",
    "price": 3.0,
    "description": "Обычный замок для подходящей двери, сундука или цепи",
    "equipmentGroup": "Охота, ловушки и сигналы",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "writing_quill",
    "name": "Писчее перо",
    "category": "tool",
    "price": 0.05,
    "description": "Подготовленное перо; чернила отдельно",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "ink",
    "name": "Чернила обычные, пузырёк",
    "category": "tool",
    "price": 1.0,
    "description": "Для писем и записей; не магические чернила",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "paper",
    "name": "Бумага, 10 листов",
    "category": "tool",
    "price": 1.0,
    "description": "Для писем, простых схем и счетов",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 10
  },
  {
    "id": "parchment",
    "name": "Пергамент, лист",
    "category": "tool",
    "price": 0.3,
    "description": "Более дорогой прочный материал для документа",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "birch_bark",
    "name": "Береста, 10 подготовленных полос",
    "category": "tool",
    "price": 0.1,
    "description": "Для коротких бытовых записей",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 10
  },
  {
    "id": "stylus",
    "name": "Писало",
    "category": "tool",
    "price": 0.2,
    "description": "Для процарапывания записи на бересте или воске",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "wax_tablet",
    "name": "Восковая дощечка с писалом",
    "category": "tool",
    "price": 1.0,
    "description": "Многоразовые заметки; запись можно стереть",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "writing_kit",
    "name": "Письменный набор",
    "category": "tool",
    "price": 3.0,
    "description": "Перо, пузырёк обычных чернил, 10 листов бумаги и футляр",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "scroll_case",
    "name": "Кожаный футляр для свитков",
    "category": "tool",
    "price": 1.0,
    "description": "До 10 свёрнутых листов; от брызг, не от долгого погружения",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "notebook",
    "name": "Тетрадь для записей",
    "category": "tool",
    "price": 3.0,
    "description": "30 чистых листов в простом переплёте; не книга знаний",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "counting_sticks",
    "name": "Счётные палочки",
    "category": "tool",
    "price": 0.2,
    "description": "Для счёта товаров, долга и запасов",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "scales",
    "name": "Весы торговые с гирьками",
    "category": "tool",
    "price": 5.0,
    "description": "Для небольших товаров, металла и монет",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "personal_seal",
    "name": "Печать простая",
    "category": "tool",
    "price": 2.0,
    "description": "Метка владельца; изготовление по заказу",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "sealing_wax",
    "name": "Воск для печатей, запас",
    "category": "tool",
    "price": 0.2,
    "description": "Для запечатывания нескольких писем",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "chalk",
    "name": "Мел, 5 кусочков",
    "category": "tool",
    "price": 0.05,
    "description": "Метки на сухой поверхности",
    "equipmentGroup": "Письмо, счёт и сохранение сведений",
    "stackable": true,
    "consumable": false,
    "bundleQuantity": 5
  },
  {
    "id": "wooden_bucket",
    "name": "Ведро деревянное",
    "category": "misc",
    "price": 0.2,
    "description": "Для воды и хозяйственных работ",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "wicker_basket",
    "name": "Корзина плетёная",
    "category": "misc",
    "price": 0.2,
    "description": "Для переноски трав, еды и мелких находок",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "clay_jug",
    "name": "Кувшин глиняный",
    "category": "misc",
    "price": 0.1,
    "description": "Для хранения жидкости на месте",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "glass_vial",
    "name": "Пузырёк стеклянный с пробкой",
    "category": "misc",
    "price": 0.3,
    "description": "Для малого образца или жидкости",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "glass_bottle",
    "name": "Бутыль стеклянная",
    "category": "misc",
    "price": 1.0,
    "description": "Для хранения жидкости; требует бережной переноски",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": true,
    "consumable": false
  },
  {
    "id": "small_barrel",
    "name": "Бочонок",
    "category": "misc",
    "price": 2.0,
    "description": "Для запасов; громоздкая тара",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "wooden_chest",
    "name": "Сундук деревянный",
    "category": "misc",
    "price": 3.0,
    "description": "Без замка; замок приобретается отдельно",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "metal_mirror",
    "name": "Зеркальце полированное металлическое",
    "category": "misc",
    "price": 2.0,
    "description": "Для осмотра лица или заглядывания за край",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "small_tongs",
    "name": "Щипцы небольшие",
    "category": "misc",
    "price": 0.5,
    "description": "Для удержания горячего предмета или извлечения мелочи",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "utility_knife",
    "name": "Нож хозяйственный",
    "category": "misc",
    "price": 0.5,
    "description": "Для еды, верёвок и ремесленных мелочей; не боевой нож",
    "equipmentGroup": "Тара и небольшие полезные вещи",
    "stackable": false,
    "consumable": false
  },
  {
    "id": "road_day_kit",
    "name": "На один день пути",
    "category": "misc",
    "price": 2.35,
    "equipmentGroup": "Готовые дорожные покупки",
    "description": "Заплечный мешок — 1 шт.; Бурдюк для воды — 1 шт.; Сухой дорожный паёк на день — 1 шт.; Факел — 2 шт.; Огниво — 1 шт.; Трутница с сухим трутом — 1 шт. При покупке содержимое добавляется отдельными предметами.",
    "contents": [
      {
        "itemId": "backpack",
        "quantity": 1
      },
      {
        "itemId": "waterskin",
        "quantity": 1
      },
      {
        "itemId": "rations",
        "quantity": 1
      },
      {
        "itemId": "torch",
        "quantity": 2
      },
      {
        "itemId": "matches",
        "quantity": 1
      },
      {
        "itemId": "tinderbox",
        "quantity": 1
      }
    ]
  },
  {
    "id": "road_descent_kit",
    "name": "Для спуска",
    "category": "misc",
    "price": 9.5,
    "equipmentGroup": "Готовые дорожные покупки",
    "description": "Верёвка пеньковая, 15 саженей — 1 шт.; Крюк с несколькими зубьями — 1 шт.; Страховочная перевязь — 1 шт.; Железные колья, 5 штук — 1 уп. При покупке содержимое добавляется отдельными предметами.",
    "contents": [
      {
        "itemId": "rope_15",
        "quantity": 1
      },
      {
        "itemId": "grappling_hook",
        "quantity": 1
      },
      {
        "itemId": "safety_harness",
        "quantity": 1
      },
      {
        "itemId": "iron_stakes",
        "quantity": 5
      }
    ]
  },
  {
    "id": "road_writing_kit",
    "name": "Для письма",
    "category": "misc",
    "price": 4.0,
    "equipmentGroup": "Готовые дорожные покупки",
    "description": "Письменный набор — 1 шт.; Кожаный футляр для свитков — 1 шт. При покупке содержимое добавляется отдельными предметами.",
    "contents": [
      {
        "itemId": "writing_kit",
        "quantity": 1
      },
      {
        "itemId": "scroll_case",
        "quantity": 1
      }
    ]
  },
  {
    "id": "road_camp_kit",
    "name": "Для ночлега вдвоём",
    "category": "misc",
    "price": 11.9,
    "equipmentGroup": "Готовые дорожные покупки",
    "description": "Шатёр на двоих — 1 шт.; Одеяло шерстяное — 2 шт.; Подстилка войлочная — 2 шт.; Котёл походный — 1 шт.; Миска и ложка — 2 шт. При покупке содержимое добавляется отдельными предметами.",
    "contents": [
      {
        "itemId": "two_person_tent",
        "quantity": 1
      },
      {
        "itemId": "blanket",
        "quantity": 2
      },
      {
        "itemId": "felt_sleeping_mat",
        "quantity": 2
      },
      {
        "itemId": "cooking_kit",
        "quantity": 1
      },
      {
        "itemId": "bowl_spoon",
        "quantity": 2
      }
    ]
  }
];
