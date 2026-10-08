// Источники: «Снаряжение Пармы и правки предысторий.md», «Расширение предысторий Пармы.md».
import type { Item } from './items';
import type { Weapon, Armor, Shield } from './weapons';

export const EQUIPMENT_ITEMS: Item[] = [
  {
    "id": "dagger",
    "name": "Боевой нож",
    "category": "weapon",
    "price": 5,
    "description": "1к4 колющий. Лёгкое. ПР 4. За действие быстрой атаки можно нанести два удара без обычного штрафа −5. Другие источники второго удара не дают третью атаку.",
    "durability": 4
  },
  {
    "id": "short_sword",
    "name": "Короткий меч",
    "category": "weapon",
    "price": 12,
    "description": "1к6 рубящий. Быстрый натиск. ПР 4. Каждый успешный удар быстрой атаки снижает Броню цели на 1 до начала следующего хода атакующего; суммарно не более 5. Прочность не меняется.",
    "durability": 4
  },
  {
    "id": "druzhina_sword",
    "name": "Дружинный меч",
    "category": "weapon",
    "price": 15,
    "description": "1к8 рубящий / колющий. Тип урона выбирается перед атакой. ПР 5.",
    "durability": 5
  },
  {
    "id": "sabre",
    "name": "Сабля",
    "category": "weapon",
    "price": 25,
    "description": "1к8 рубящий. Конный удар. ПР 5. Раз за свой ход +5 к обычной атаке, если перед ударом всадник переместился верхом минимум на 2 сажени.",
    "durability": 5
  },
  {
    "id": "battle_axe",
    "name": "Боевой топор",
    "category": "weapon",
    "price": 10,
    "description": "1к6 / 1к8 рубящий. Одна / две руки; Сокрушение щита. ПР 5. При особом попадании силовой атакой прочность щита цели снижается на 2.",
    "durability": 5
  },
  {
    "id": "war_pick",
    "name": "Чекан",
    "category": "weapon",
    "price": 18,
    "description": "1к6 колющий. Силовая атака игнорирует 2 Брони от доспеха. ПР 5.",
    "durability": 5
  },
  {
    "id": "mace",
    "name": "Булава",
    "category": "weapon",
    "price": 8,
    "description": "1к6 дробящий. Сбивание с ног. ПР 5. При особом попадании цель падает, если провалит Избавление Силы.",
    "durability": 5
  },
  {
    "id": "flanged_mace",
    "name": "Шестопёр",
    "category": "weapon",
    "price": 20,
    "description": "1к8 дробящий. Сокрушение доспеха. ПР 5. При особом попадании силовой атакой прочность доспеха цели снижается на 1.",
    "durability": 5
  },
  {
    "id": "flail",
    "name": "Кистень",
    "category": "weapon",
    "price": 12,
    "description": "1к6 дробящий. Игнорирует 2 Брони от щита. ПР 5.",
    "durability": 5
  },
  {
    "id": "club",
    "name": "Дубинка",
    "category": "weapon",
    "price": 1,
    "description": "1к4 дробящий. Удар для пленения. ПР 4. Удар для пленения объявляется до броска. Если здравие снижается до 0, цель без сознания и стабильна; от дальнейших повреждений это не защищает.",
    "durability": 4
  },
  {
    "id": "staff",
    "name": "Посох",
    "category": "weapon",
    "price": 2,
    "description": "1к6 дробящий. Сбивание с ног. ПР 5. При особом попадании цель падает, если провалит Избавление Силы.",
    "durability": 5
  },
  {
    "id": "spear",
    "name": "Копьё",
    "category": "weapon",
    "price": 8,
    "description": "1к6 / 1к8 колющий. Хват выбирается перед атакой. ПР 5.",
    "durability": 5
  },
  {
    "id": "boar_spear",
    "name": "Рогатина",
    "category": "weapon",
    "price": 20,
    "description": "1к10 колющий. Встречная атака. ПР 6. Реакция: одна обычная атака, когда противник своим перемещением входит в ближнюю дистанцию, до его первой атаки. Принудительное перемещение не вызывает приём.",
    "durability": 6
  },
  {
    "id": "long_spear",
    "name": "Длинное копьё",
    "category": "weapon",
    "price": 15,
    "description": "1к10 колющий. +5 против всадника; -10 в тесноте. ПР 5.",
    "durability": 5
  },
  {
    "id": "two_handed_axe",
    "name": "Двуручная секира",
    "category": "weapon",
    "price": 30,
    "description": "1к10 рубящий. Отсечение. ПР 6. При особом попадании силовой атакой можно выбрать Отсечение по правилам травм.",
    "durability": 6
  },
  {
    "id": "berdysh",
    "name": "Бердыш",
    "category": "weapon",
    "price": 40,
    "description": "1к12 рубящий. Сокрушение щита или доспеха. ПР 6. При особом попадании силовой атакой выберите один эффект: −2 прочности щита или −1 прочности доспеха.",
    "durability": 6
  },
  {
    "id": "throwing_knives",
    "name": "Метательный нож",
    "category": "weapon",
    "price": 4,
    "description": "1к4 колющий. До 3 саженей. ПР 3.",
    "durability": 3
  },
  {
    "id": "throwing_axe",
    "name": "Метательный топор",
    "category": "weapon",
    "price": 6,
    "description": "1к6 рубящий. До 3 саженей; тот же урон в ближнем бою. ПР 3.",
    "durability": 3
  },
  {
    "id": "javelin",
    "name": "Сулица",
    "category": "weapon",
    "price": 5,
    "description": "1к6 колющий. До 5 саженей; в ближнем бою 1к4. ПР 3.",
    "durability": 3
  },
  {
    "id": "sling",
    "name": "Праща",
    "category": "weapon",
    "price": 1,
    "description": "1к4 дробящий. До 10 саженей; камни или пули. ПР 3.",
    "durability": 3
  },
  {
    "id": "short_bow",
    "name": "Простой лук",
    "category": "weapon",
    "price": 20,
    "description": "1к6 колющий. Обычный охотничий лук. ПР 4.",
    "durability": 4
  },
  {
    "id": "long_bow",
    "name": "Составной лук",
    "category": "weapon",
    "price": 50,
    "description": "1к8 колющий. Стрельба верхом; при Силе ниже 42 урон -2. ПР 4.",
    "durability": 4
  },
  {
    "id": "crossbow",
    "name": "Самострел",
    "category": "weapon",
    "price": 60,
    "description": "1к10 колющий. Перезарядка за действие; быстрая атака недоступна. ПР 5.",
    "durability": 5
  },
  {
    "id": "leather_vest",
    "name": "Кожаная безрукавка",
    "category": "armor",
    "price": 15,
    "description": "Броня +3; Скрытность 0; ПР 4. Лёгкая броня.",
    "durability": 4
  },
  {
    "id": "light_armor_item",
    "name": "Кожаный доспех",
    "category": "armor",
    "price": 30,
    "description": "Броня +5; Скрытность 0; ПР 5. Лёгкая броня.",
    "durability": 5
  },
  {
    "id": "reinforced_leather",
    "name": "Усиленный кожаный доспех",
    "category": "armor",
    "price": 50,
    "description": "Броня +6; Скрытность 0; ПР 6. Лёгкая броня.",
    "durability": 6
  },
  {
    "id": "short_chainmail",
    "name": "Короткая кольчуга",
    "category": "armor",
    "price": 120,
    "description": "Броня +8; Скрытность -5; ПР 6. Тяжёлая броня.",
    "durability": 6
  },
  {
    "id": "heavy_armor_item",
    "name": "Длинная кольчуга",
    "category": "armor",
    "price": 200,
    "description": "Броня +10; Скрытность -10; ПР 7. Тяжёлая броня.",
    "durability": 7
  },
  {
    "id": "lamellar_vest",
    "name": "Пластинчатая безрукавка",
    "category": "armor",
    "price": 140,
    "description": "Броня +8; Скрытность -5; ПР 7. Тяжёлая броня.",
    "durability": 7
  },
  {
    "id": "lamellar_armor",
    "name": "Пластинчатый панцирь",
    "category": "armor",
    "price": 220,
    "description": "Броня +10; Скрытность -10; ПР 8. Тяжёлая броня.",
    "durability": 8
  },
  {
    "id": "scale_armor",
    "name": "Чешуйчатый панцирь",
    "category": "armor",
    "price": 180,
    "description": "Броня +9; Скрытность -5; ПР 7. Тяжёлая броня.",
    "durability": 7
  },
  {
    "id": "composite_armor",
    "name": "Составной доспех",
    "category": "armor",
    "price": 250,
    "description": "Броня +10; Скрытность -5; ПР 7. Тяжёлая броня.",
    "durability": 7
  },
  {
    "id": "bakhterets",
    "name": "Бахтерец",
    "category": "armor",
    "price": 350,
    "description": "Броня +11; Скрытность -10; ПР 8. Тяжёлая броня.",
    "durability": 8
  },
  {
    "id": "plate_breastplate",
    "name": "Латный нагрудник с защитой рук",
    "category": "armor",
    "price": 450,
    "description": "Броня +11; Скрытность -5; ПР 8. Тяжёлая броня.",
    "durability": 8
  },
  {
    "id": "full_plate",
    "name": "Полный латный доспех",
    "category": "armor",
    "price": 700,
    "description": "Броня +12; Скрытность -10; ПР 9. Тяжёлая броня. Скорость −1 сажень.",
    "durability": 9
  },
  {
    "id": "small_round_shield",
    "name": "Малый круглый щит",
    "category": "armor",
    "price": 5,
    "description": "Броня +2; ПР 4. Отведение клинка: реакция и 1 бодрость дают -5 к одной рукопашной атаке по владельцу.",
    "durability": 4
  },
  {
    "id": "wicker_shield",
    "name": "Лёгкий плетёный щит",
    "category": "armor",
    "price": 6,
    "description": "Броня +3; ПР 3. Ещё +2 к Броне против стрел, болтов, сулиц и метательных топоров.",
    "durability": 3
  },
  {
    "id": "wooden_shield",
    "name": "Круглый деревянный щит",
    "category": "armor",
    "price": 15,
    "description": "Броня +5; ПР 5. Прикрытие товарища: обычный блок за соседнего союзника стоит 1 бодрость вместо 2.",
    "durability": 5
  },
  {
    "id": "reinforced_round_shield",
    "name": "Круглый с металлической оковкой щит",
    "category": "armor",
    "price": 25,
    "description": "Броня +5; ПР 7. Потеря прочности от свойства оружия, повреждающего щит, уменьшается на 1, минимум до 0.",
    "durability": 7
  },
  {
    "id": "kite_shield",
    "name": "Каплевидный щит",
    "category": "armor",
    "price": 20,
    "description": "Броня +5; ПР 6. Верхом ещё +2 к Броне против рукопашных атак по владельцу.",
    "durability": 6
  },
  {
    "id": "infantry_shield",
    "name": "Большой пехотный щит",
    "category": "armor",
    "price": 30,
    "description": "Броня +6; ПР 7. Щитовая стена; скорость владельца со щитом в руке -1 сажень.",
    "durability": 7
  },
  {
    "id": "siege_shield",
    "name": "Осадный с упором щит",
    "category": "armor",
    "price": 45,
    "description": "Броня +6; ПР 8. Устанавливается как укрытие; в руке скорость владельца -1 сажень.",
    "durability": 8
  },
  {
    "id": "wooden_arrows",
    "name": "Деревянная заострённая стрела (10 шт.)",
    "category": "ammunition",
    "price": 0.2,
    "description": "Урон лука -2; колющий. Против доспеха с базовой Бронёй +8 или выше урон лука -4 вместо -2",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "arrow",
    "damageModifier": -2
  },
  {
    "id": "blunt_arrows",
    "name": "Тупая деревянная охотничья стрела (10 шт.)",
    "category": "ammunition",
    "price": 0.3,
    "description": "Урон лука -2; дробящий. При особом попадании не накладывает Руду и не вызывает Отсечение",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "arrow",
    "damageModifier": -2
  },
  {
    "id": "bone_arrows",
    "name": "Костяной томар (10 шт.)",
    "category": "ammunition",
    "price": 0.5,
    "description": "Урон лука -1; дробящий. Для охоты на мелкого пушного зверя; не накладывает Руду и не вызывает Отсечение",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "arrow",
    "damageModifier": -1
  },
  {
    "id": "arrows",
    "name": "Обычная железная стрела (10 шт.)",
    "category": "ammunition",
    "price": 1,
    "description": "Полный урон лука; колющий. Обычный выбор для охоты и боя",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "arrow",
    "damageModifier": 0
  },
  {
    "id": "broadhead_arrows",
    "name": "Широколезвийная железная стрела (10 шт.)",
    "category": "ammunition",
    "price": 2,
    "description": "Полный урон лука; колющий. При особом попадании можно выбрать Руду вместо случайного эффекта",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "arrow",
    "damageModifier": 0
  },
  {
    "id": "piercing_arrows",
    "name": "Узкая бронебойная стрела (10 шт.)",
    "category": "ammunition",
    "price": 3,
    "description": "Полный урон лука; колющий. Игнорирует 2 Брони от металлического доспеха, но не от щита или Ловкости",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "arrow",
    "damageModifier": 0
  },
  {
    "id": "bolts",
    "name": "Обычный болт (10 шт.)",
    "category": "ammunition",
    "price": 2,
    "description": "Полный урон самострела; колющий",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "bolt",
    "damageModifier": 0
  },
  {
    "id": "piercing_bolts",
    "name": "Бронебойный болт (10 шт.)",
    "category": "ammunition",
    "price": 4,
    "description": "Полный урон самострела; игнорирует 2 Брони от металлического доспеха",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "bolt",
    "damageModifier": 0
  },
  {
    "id": "sling_bullets",
    "name": "Свинцовая пуля для пращи (10 шт.)",
    "category": "ammunition",
    "price": 0.2,
    "description": "Полный урон пращи; дробящий. Подходящий обычный камень бесплатен и наносит тот же урон",
    "stackable": true,
    "bundleQuantity": 10,
    "ammunition": "sling",
    "damageModifier": 0
  },
  {
    "id": "quiver",
    "name": "Колчан на 20 стрел или болтов",
    "category": "misc",
    "price": 2,
    "description": "Колчан на 20 стрел или болтов"
  },
  {
    "id": "spare_bowstring",
    "name": "Запасная тетива",
    "category": "misc",
    "price": 0.5,
    "description": "Запасная тетива"
  },
  {
    "id": "sling_stones",
    "name": "Пращевые камни на 10 выстрелов",
    "category": "ammunition",
    "price": 0,
    "description": "Полный урон пращи. Можно собрать бесплатно.",
    "ammunition": "sling",
    "stackable": true,
    "bundleQuantity": 10
  },
  {
    "id": "smith_hammer",
    "name": "Кузнечный молот",
    "category": "weapon",
    "price": 3,
    "description": "1к6 дробящий + мод. Силы; ПР 5. Без особых свойств боевого оружия."
  },
  {
    "id": "carpenter_hammer",
    "name": "Плотницкий молоток",
    "category": "weapon",
    "price": 1,
    "description": "1к4 дробящий + мод. Силы; ПР 3. Без особых свойств боевого оружия."
  },
  {
    "id": "smithing_kit",
    "name": "Кузнечный набор",
    "category": "tool",
    "price": 20,
    "description": "Кузнечный набор"
  },
  {
    "id": "alchemy_kit",
    "name": "Алхимический набор",
    "category": "tool",
    "price": 20,
    "description": "Алхимический набор"
  },
  {
    "id": "medical_kit",
    "name": "Медицинский набор",
    "category": "tool",
    "price": 10,
    "description": "Медицинский набор"
  },
  {
    "id": "thieves_tools",
    "name": "Воровские инструменты",
    "category": "tool",
    "price": 15,
    "description": "Воровские инструменты"
  },
  {
    "id": "skinning_kit",
    "name": "Набор для снятия шкур",
    "category": "tool",
    "price": 3,
    "description": "Набор для снятия шкур"
  },
  {
    "id": "ritual_kit",
    "name": "Простой ритуальный набор",
    "category": "tool",
    "price": 5,
    "description": "Простой ритуальный набор"
  },
  {
    "id": "disguise_kit",
    "name": "Гримёрный набор",
    "category": "tool",
    "price": 3,
    "description": "Гримёрный набор"
  },
  {
    "id": "cartographer_kit",
    "name": "Набор картографа",
    "category": "tool",
    "price": 10,
    "description": "Набор картографа"
  },
  {
    "id": "acid_flask",
    "name": "Метательная колба с кислотой",
    "category": "consumable",
    "price": 2,
    "description": "До 3 саженей; 1к4 + мод. Ловкости кислотного урона по одной цели. Колба расходуется.",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "rations",
    "name": "Обычный дорожный паёк на день",
    "category": "consumable",
    "price": 0.05,
    "description": "Еда на один день.",
    "stackable": true,
    "consumable": true
  },
  {
    "id": "worn_short_chainmail",
    "name": "Поношенная короткая кольчуга",
    "category": "armor",
    "price": 60,
    "description": "Броня +8; Скрытность −5; ПР 5. Исправна до своего уменьшенного максимума.",
    "durability": 5
  },
  {
    "id": "hunting_net",
    "name": "Ловчая сеть",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "tent_cloak",
    "name": "Плащ-палатка",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "warm_pelt",
    "name": "Тёплая шкура",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "dried_herbs",
    "name": "Сушёные травы",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "shepherd_horn",
    "name": "Пастуший рожок",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "signal_horn",
    "name": "Сигнальный рожок",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "wedges",
    "name": "Клинья",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "whetstone",
    "name": "Точильный камень",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "work_gloves",
    "name": "Рабочие рукавицы",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "paddle",
    "name": "Весло",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "tarred_cloak",
    "name": "Смоляной плащ",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "fishing_tackle",
    "name": "Рыболовные снасти",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "letter_bag",
    "name": "Сумка для грамот",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "service_badge",
    "name": "Знак прежней службы",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "druzhina_badge",
    "name": "Знак дружины",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "plain_clothes",
    "name": "Неприметная одежда",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "ink",
    "name": "Чернила",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "quills",
    "name": "Перья",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "paper",
    "name": "Запас бумаги",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "counting_tools",
    "name": "Счётные принадлежности",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "ledger",
    "name": "Счётная книга",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "scales",
    "name": "Набор весов",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "fine_clothes",
    "name": "Добротная одежда",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "lantern",
    "name": "Фонарь",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "shovel",
    "name": "Лопата",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "worn_clothes",
    "name": "Поношенная одежда",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "blanket",
    "name": "Одеяло",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "patron_symbol",
    "name": "Символ покровителя",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "ritual_notes",
    "name": "Записи праздничных обрядов",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "family_badge",
    "name": "Родовой знак",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "memory_tablets",
    "name": "Памятные дощечки",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "mortar_pestle",
    "name": "Ступка с пестиком",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "herb_pouches",
    "name": "Мешочки с обычными травами",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "thread",
    "name": "Моток нитей",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "empty_vial",
    "name": "Пустой флакон",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "herb_gathering_kit",
    "name": "Набор для сбора трав",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "empty_pouch",
    "name": "Пустой мешочек",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "salt",
    "name": "Соль",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "travel_notes",
    "name": "Походные записи",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "practice_notebook",
    "name": "Тетрадь упражнений",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "metal_cup",
    "name": "Металлическая чашка",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "material_sample",
    "name": "Образец камня или металла",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "wood_chisel",
    "name": "Резец для дерева",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "chisel",
    "name": "Резец",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "mentor_notes",
    "name": "Записи наставника",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "leather_apron",
    "name": "Кожаный фартук",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "dream_notes",
    "name": "Записи снов",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "sketch_charcoal",
    "name": "Уголь для зарисовок",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "simple_mask",
    "name": "Простая маска",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "divination_tablets",
    "name": "Набор гадательных дощечек",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "omen_notes",
    "name": "Записи примет",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "offerings",
    "name": "Мешочек обычных приношений",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "taboo_notes",
    "name": "Записи имён и запретов",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "white_cloth",
    "name": "Белое полотно",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "funeral_notes",
    "name": "Записи погребальных обрядов",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "study_notes",
    "name": "Учебные записи",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "apprentice_badge",
    "name": "Знак ученичества",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  },
  {
    "id": "charm_blanks",
    "name": "Деревянные заготовки оберегов",
    "category": "misc",
    "description": "Снаряжение из новых предысторий. Цена и вес в источнике не указаны."
  }
];
export const EQUIPMENT_WEAPONS: Weapon[] = [
  {
    "id": "dagger",
    "name": "Боевой нож",
    "category": "one_handed",
    "damageOneHand": "1d4",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к4 колющий. Лёгкое. ПР 4. За действие быстрой атаки можно нанести два удара без обычного штрафа −5. Другие источники второго удара не дают третью атаку.",
    "durability": 4
  },
  {
    "id": "short_sword",
    "name": "Короткий меч",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 рубящий. Быстрый натиск. ПР 4. Каждый успешный удар быстрой атаки снижает Броню цели на 1 до начала следующего хода атакующего; суммарно не более 5. Прочность не меняется.",
    "durability": 4
  },
  {
    "id": "druzhina_sword",
    "name": "Дружинный меч",
    "category": "one_handed",
    "damageOneHand": "1d8",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к8 рубящий / колющий. Тип урона выбирается перед атакой. ПР 5.",
    "durability": 5
  },
  {
    "id": "sabre",
    "name": "Сабля",
    "category": "one_handed",
    "damageOneHand": "1d8",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к8 рубящий. Конный удар. ПР 5. Раз за свой ход +5 к обычной атаке, если перед ударом всадник переместился верхом минимум на 2 сажени.",
    "durability": 5
  },
  {
    "id": "battle_axe",
    "name": "Боевой топор",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageTwoHands": "1d8",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 / 1к8 рубящий. Одна / две руки; Сокрушение щита. ПР 5. При особом попадании силовой атакой прочность щита цели снижается на 2.",
    "durability": 5
  },
  {
    "id": "war_pick",
    "name": "Чекан",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 колющий. Силовая атака игнорирует 2 Брони от доспеха. ПР 5.",
    "durability": 5
  },
  {
    "id": "mace",
    "name": "Булава",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageType": "crushing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 дробящий. Сбивание с ног. ПР 5. При особом попадании цель падает, если провалит Избавление Силы.",
    "durability": 5
  },
  {
    "id": "flanged_mace",
    "name": "Шестопёр",
    "category": "one_handed",
    "damageOneHand": "1d8",
    "damageType": "crushing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к8 дробящий. Сокрушение доспеха. ПР 5. При особом попадании силовой атакой прочность доспеха цели снижается на 1.",
    "durability": 5
  },
  {
    "id": "flail",
    "name": "Кистень",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageType": "crushing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 дробящий. Игнорирует 2 Брони от щита. ПР 5.",
    "durability": 5
  },
  {
    "id": "club",
    "name": "Дубинка",
    "category": "one_handed",
    "damageOneHand": "1d4",
    "damageType": "crushing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к4 дробящий. Удар для пленения. ПР 4. Удар для пленения объявляется до броска. Если здравие снижается до 0, цель без сознания и стабильна; от дальнейших повреждений это не защищает.",
    "durability": 4
  },
  {
    "id": "staff",
    "name": "Посох",
    "category": "two_handed",
    "damageOneHand": "1d6",
    "damageType": "crushing",
    "parent": "strength",
    "skill": "two_handed",
    "description": "1к6 дробящий. Сбивание с ног. ПР 5. При особом попадании цель падает, если провалит Избавление Силы.",
    "durability": 5
  },
  {
    "id": "spear",
    "name": "Копьё",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageTwoHands": "1d8",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 / 1к8 колющий. Хват выбирается перед атакой. ПР 5.",
    "durability": 5
  },
  {
    "id": "boar_spear",
    "name": "Рогатина",
    "category": "two_handed",
    "damageOneHand": "1d10",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "two_handed",
    "description": "1к10 колющий. Встречная атака. ПР 6. Реакция: одна обычная атака, когда противник своим перемещением входит в ближнюю дистанцию, до его первой атаки. Принудительное перемещение не вызывает приём.",
    "durability": 6
  },
  {
    "id": "long_spear",
    "name": "Длинное копьё",
    "category": "two_handed",
    "damageOneHand": "1d10",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "two_handed",
    "description": "1к10 колющий. +5 против всадника; -10 в тесноте. ПР 5.",
    "durability": 5
  },
  {
    "id": "two_handed_axe",
    "name": "Двуручная секира",
    "category": "two_handed",
    "damageOneHand": "1d10",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "two_handed",
    "description": "1к10 рубящий. Отсечение. ПР 6. При особом попадании силовой атакой можно выбрать Отсечение по правилам травм.",
    "durability": 6
  },
  {
    "id": "berdysh",
    "name": "Бердыш",
    "category": "two_handed",
    "damageOneHand": "1d12",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "two_handed",
    "description": "1к12 рубящий. Сокрушение щита или доспеха. ПР 6. При особом попадании силовой атакой выберите один эффект: −2 прочности щита или −1 прочности доспеха.",
    "durability": 6
  },
  {
    "id": "throwing_knives",
    "name": "Метательный нож",
    "category": "one_handed",
    "damageOneHand": "1d4",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к4 колющий. До 3 саженей. ПР 3.",
    "durability": 3
  },
  {
    "id": "throwing_axe",
    "name": "Метательный топор",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageType": "cutting",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 рубящий. До 3 саженей; тот же урон в ближнем бою. ПР 3.",
    "durability": 3
  },
  {
    "id": "javelin",
    "name": "Сулица",
    "category": "one_handed",
    "damageOneHand": "1d6",
    "damageType": "piercing",
    "parent": "strength",
    "skill": "one_handed",
    "description": "1к6 колющий. До 5 саженей; в ближнем бою 1к4. ПР 3.",
    "durability": 3
  },
  {
    "id": "sling",
    "name": "Праща",
    "category": "ranged",
    "damageOneHand": "1d4",
    "damageType": "crushing",
    "parent": "dexterity",
    "skill": "archery",
    "description": "1к4 дробящий. До 10 саженей; камни или пули. ПР 3.",
    "durability": 3,
    "ammunition": "sling"
  },
  {
    "id": "short_bow",
    "name": "Простой лук",
    "category": "ranged",
    "damageOneHand": "1d6",
    "damageType": "piercing",
    "parent": "dexterity",
    "skill": "archery",
    "description": "1к6 колющий. Обычный охотничий лук. ПР 4.",
    "durability": 4,
    "ammunition": "arrow"
  },
  {
    "id": "long_bow",
    "name": "Составной лук",
    "category": "ranged",
    "damageOneHand": "1d8",
    "damageType": "piercing",
    "parent": "dexterity",
    "skill": "archery",
    "description": "1к8 колющий. Стрельба верхом; при Силе ниже 42 урон -2. ПР 4.",
    "durability": 4,
    "ammunition": "arrow"
  },
  {
    "id": "crossbow",
    "name": "Самострел",
    "category": "ranged",
    "damageOneHand": "1d10",
    "damageType": "piercing",
    "parent": "dexterity",
    "skill": "archery",
    "description": "1к10 колющий. Перезарядка за действие; быстрая атака недоступна. ПР 5.",
    "durability": 5,
    "ammunition": "bolt",
    "noFastAttack": true
  },
  {
    "id": "carpenter_hammer",
    "name": "Плотницкий молоток",
    "category": "one_handed",
    "damageOneHand": "1d4",
    "damageType": "crushing",
    "parent": "strength",
    "skill": "one_handed",
    "durability": 3,
    "description": "1к4 дробящий + мод. Силы; ПР 3. Без особых свойств боевого оружия."
  }
];
export const EQUIPMENT_ARMORS: Armor[] = [
  {
    "id": "leather_vest",
    "itemId": "leather_vest",
    "name": "Кожаная безрукавка",
    "armorBonus": 3,
    "category": "light",
    "skill": "light_armor",
    "stealthPenalty": 0,
    "durability": 4,
    "description": "Броня +3; Скрытность 0; ПР 4. Лёгкая броня."
  },
  {
    "id": "light_armor",
    "itemId": "light_armor_item",
    "name": "Кожаный доспех",
    "armorBonus": 5,
    "category": "light",
    "skill": "light_armor",
    "stealthPenalty": 0,
    "durability": 5,
    "description": "Броня +5; Скрытность 0; ПР 5. Лёгкая броня."
  },
  {
    "id": "reinforced_leather",
    "itemId": "reinforced_leather",
    "name": "Усиленный кожаный доспех",
    "armorBonus": 6,
    "category": "light",
    "skill": "light_armor",
    "stealthPenalty": 0,
    "durability": 6,
    "description": "Броня +6; Скрытность 0; ПР 6. Лёгкая броня."
  },
  {
    "id": "short_chainmail",
    "itemId": "short_chainmail",
    "name": "Короткая кольчуга",
    "armorBonus": 8,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -5,
    "durability": 6,
    "description": "Броня +8; Скрытность -5; ПР 6. Тяжёлая броня."
  },
  {
    "id": "heavy_armor",
    "itemId": "heavy_armor_item",
    "name": "Длинная кольчуга",
    "armorBonus": 10,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -10,
    "durability": 7,
    "description": "Броня +10; Скрытность -10; ПР 7. Тяжёлая броня."
  },
  {
    "id": "lamellar_vest",
    "itemId": "lamellar_vest",
    "name": "Пластинчатая безрукавка",
    "armorBonus": 8,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -5,
    "durability": 7,
    "description": "Броня +8; Скрытность -5; ПР 7. Тяжёлая броня."
  },
  {
    "id": "lamellar_armor",
    "itemId": "lamellar_armor",
    "name": "Пластинчатый панцирь",
    "armorBonus": 10,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -10,
    "durability": 8,
    "description": "Броня +10; Скрытность -10; ПР 8. Тяжёлая броня."
  },
  {
    "id": "scale_armor",
    "itemId": "scale_armor",
    "name": "Чешуйчатый панцирь",
    "armorBonus": 9,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -5,
    "durability": 7,
    "description": "Броня +9; Скрытность -5; ПР 7. Тяжёлая броня."
  },
  {
    "id": "composite_armor",
    "itemId": "composite_armor",
    "name": "Составной доспех",
    "armorBonus": 10,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -5,
    "durability": 7,
    "description": "Броня +10; Скрытность -5; ПР 7. Тяжёлая броня."
  },
  {
    "id": "bakhterets",
    "itemId": "bakhterets",
    "name": "Бахтерец",
    "armorBonus": 11,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -10,
    "durability": 8,
    "description": "Броня +11; Скрытность -10; ПР 8. Тяжёлая броня."
  },
  {
    "id": "plate_breastplate",
    "itemId": "plate_breastplate",
    "name": "Латный нагрудник с защитой рук",
    "armorBonus": 11,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -5,
    "durability": 8,
    "description": "Броня +11; Скрытность -5; ПР 8. Тяжёлая броня."
  },
  {
    "id": "full_plate",
    "itemId": "full_plate",
    "name": "Полный латный доспех",
    "armorBonus": 12,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -10,
    "durability": 9,
    "description": "Броня +12; Скрытность -10; ПР 9. Тяжёлая броня. Скорость −1 сажень."
  },
  {
    "id": "worn_short_chainmail",
    "itemId": "worn_short_chainmail",
    "name": "Поношенная короткая кольчуга",
    "armorBonus": 8,
    "category": "heavy",
    "skill": "heavy_armor",
    "stealthPenalty": -5,
    "durability": 5
  }
];
export const EQUIPMENT_SHIELDS: Shield[] = [
  {
    "id": "small_round_shield",
    "name": "Малый круглый щит",
    "armorBonus": 2,
    "skill": "blocking",
    "durability": 4,
    "description": "Броня +2; ПР 4. Отведение клинка: реакция и 1 бодрость дают -5 к одной рукопашной атаке по владельцу."
  },
  {
    "id": "wicker_shield",
    "name": "Лёгкий плетёный щит",
    "armorBonus": 3,
    "skill": "blocking",
    "durability": 3,
    "description": "Броня +3; ПР 3. Ещё +2 к Броне против стрел, болтов, сулиц и метательных топоров."
  },
  {
    "id": "wooden_shield",
    "name": "Круглый деревянный щит",
    "armorBonus": 5,
    "skill": "blocking",
    "durability": 5,
    "description": "Броня +5; ПР 5. Прикрытие товарища: обычный блок за соседнего союзника стоит 1 бодрость вместо 2."
  },
  {
    "id": "reinforced_round_shield",
    "name": "Круглый с металлической оковкой щит",
    "armorBonus": 5,
    "skill": "blocking",
    "durability": 7,
    "description": "Броня +5; ПР 7. Потеря прочности от свойства оружия, повреждающего щит, уменьшается на 1, минимум до 0."
  },
  {
    "id": "kite_shield",
    "name": "Каплевидный щит",
    "armorBonus": 5,
    "skill": "blocking",
    "durability": 6,
    "description": "Броня +5; ПР 6. Верхом ещё +2 к Броне против рукопашных атак по владельцу."
  },
  {
    "id": "infantry_shield",
    "name": "Большой пехотный щит",
    "armorBonus": 6,
    "skill": "blocking",
    "durability": 7,
    "description": "Броня +6; ПР 7. Щитовая стена; скорость владельца со щитом в руке -1 сажень."
  },
  {
    "id": "siege_shield",
    "name": "Осадный с упором щит",
    "armorBonus": 6,
    "skill": "blocking",
    "durability": 8,
    "description": "Броня +6; ПР 8. Устанавливается как укрытие; в руке скорость владельца -1 сажень."
  }
];

/** Сохраняем прежние ID и известный вес; новые данные заменяют совпадающие записи. */
export function mergeEquipment<T extends { id: string }>(legacy: T[], current: T[]): T[] {
 const entries = new Map(legacy.map(entry => [entry.id, entry]));
 for (const entry of current) entries.set(entry.id, { ...entries.get(entry.id), ...entry });
 return [...entries.values()];
}
