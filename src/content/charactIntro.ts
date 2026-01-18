export type CharacterIntroItem = {
  name: string;
  realname?: string;
  birthday?: string;
  age?: string;
  constellation?: string;
  height?: string;
  weight?: string;
  nature: string;
  favorite?: string;
  fear?: string;
  img: string;
};

export type CharacterIntroGroup = Record<string, CharacterIntroItem>;

export const charactIntro: Record<string, CharacterIntroGroup> = {
  Nobita: {
    "1": {
      name: "大雄",
      realname: "野比大雄",
      birthday: "8月7日",
      height: "140公分",
      weight: "30公斤",
      nature: "心地善良，并乐于助人",
      favorite: "射击、翻花绳、睡觉、考试抱鸭蛋",
      fear: "青椒",
      img: "/assets/map/character/Nobita/3.png",
    },
    "2": {
      name: "哆啦A梦",
      birthday: "2112.9.3",
      height: "129.3公分",
      weight: "129.3公斤",
      nature: "有时表现出正经，但不时会有脱线的表现",
      favorite: "铜锣烧",
      fear: "老鼠",
      img: "/assets/map/character/Nobita/4.png",
    },
    "3": {
      name: "哆啦美",
      birthday: "2114.12.2",
      constellation: "射手座",
      height: "100公分",
      weight: "91公斤",
      nature: "性格温和，但是很容易被惹而发脾气（多数是因哥哥）",
      favorite: "唱歌、蜜瓜面包",
      fear: "蟑螂",
      img: "/assets/map/character/Nobita/5.png",
    },
    "4": {
      name: "大雄的妈妈",
      realname: "野比玉子",
      birthday: "2月16日",
      age: "38岁",
      nature:
        "一位勤劳的家庭主妇，个性相当保守，对于新产品及科技等毫无兴趣，常为家中赤字烦恼。",
      favorite: "插画",
      fear: "大雄考试得零分",
      img: "/assets/map/character/Nobita/2.png",
    },
    "5": {
      name: "大雄的爸爸",
      realname: "野比伸助",
      birthday: "1月24日",
      age: "36岁",
      nature:
        "朝九晚五的典型上班族，有抽烟的不良嗜好，对于音乐也甚喜好，曾经花钱买了很贵的音响。",
      favorite: "音乐",
      fear: "驾照考试",
      img: "/assets/map/character/Nobita/1.png",
    },
  },
  Giant: {
    "1": {
      name: "胖虎",
      realname: "刚田武",
      birthday: "6月15日",
      constellation: "双子座",
      height: "145公分",
      weight: "60公斤",
      nature: "调皮，喜欢欺负人，但是疼爱家人，有责任感",
      favorite: "唱歌、做菜、欺负人",
      fear: "做家务",
      img: "/assets/map/character/Giant/1.png",
    },
    "2": {
      name: "小朱",
      realname: "刚田小朱",
      birthday: "7月19日",
      age: "8-9岁",
      nature:
        "在故事初期较为凶悍粗鲁，后期个性变得较为文静多愁善感，她喜欢画漫画，并梦想成为一名漫画家。",
      favorite: "画漫画",
      img: "/assets/map/character/Giant/2.png",
    },
    "3": {
      name: "胖虎的妈妈",
      realname: "不详",
      birthday: "7月19日",
      age: "30-40岁",
      nature:
        "对胖虎实行的教育方式比较严厉，但对其他人包括大雄、静香、小夫都是和颜悦色，客客气气，没有任何脾气。",
      img: "/assets/map/character/Giant/3.png",
    },
  },
};

