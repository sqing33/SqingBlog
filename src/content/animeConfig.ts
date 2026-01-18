export interface AnimeConfig {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  banner: string;
  circleImage: string;
  author: AuthorConfig;
  characters: CharacterConfig[];
  websites: WebsitesConfig;
}

export interface AuthorConfig {
  name: string;
  title: string;
  avatar: string;
  bio: string; // HTML
  links: LinkConfig[];
  gallery: string[];
}

export interface CharacterConfig {
  name: string;
  realname?: string;
  birthday?: string;
  height?: string;
  weight?: string;
  nature: string;
  favorite?: string;
  fear?: string;
  image: string;
}

export interface WebsitesConfig {
  official: WebsiteConfig[];
  video: WebsiteConfig[];
}

export interface WebsiteConfig {
  name: string;
  url: string;
  image: string;
  description?: string;
}

export interface LinkConfig {
  name: string;
  url: string;
}

const doraemonConfig: AnimeConfig = {
  id: "doraemon",
  name: "哆啦A梦",
  subtitle: "来自未来的蓝色机器人猫",
  color: "#2f76d2",
  banner: "/assets/anime/doraemon/banner.jpg",
  circleImage: "/assets/index/doraemon.webp",
  author: {
    name: "藤子·F·不二雄",
    title: "日本著名漫画家",
    avatar: "/assets/anime/doraemon/author-avatar.png",
    bio: `
      <p>藤子·F·不二雄（ふじこ·F·ふじお）（1933年12月1日—1996年9月23日），原名藤本弘，又名藤子不二雄F。</p>
      <p>日本男性漫画家，出生于日本富山县的高冈市，毕业于富山县立高冈工艺高等学校电气科。小学馆的代表漫画家之一，代表作《哆啦A梦》《小鬼Q太郎》《小超人帕门》《超能力魔美》。</p>
      <p>曾经长期与另一位著名日本漫画家安孙子素雄（笔名藤子不二雄A）以藤子不二雄作为共用的笔名，先后在艰难的生存环境下画了十多年，并未造成太大热潮，直至实际上可以算是两个人最后的合作《Q太郎》。</p>
      <p>1947年受到漫画大师手冢治虫的启发，立志成为儿童漫画家。</p>
      <p>1964年凭《Q太郎》一炮走红，从此奠定了他在日本漫画界的重要地位，而他的代表作《哆啦A梦》更掀起了无法抵挡的旋风，成为了成千上万儿童心目中永恒的经典。</p>
    `,
    links: [
      { name: "维基百科", url: "https://zh.wikipedia.org/wiki/藤子·F·不二雄" },
      { name: "百度百科", url: "https://baike.baidu.com/item/藤子·F·不二雄" },
    ],
    gallery: [
      "/assets/anime/doraemon/author-gallery-1.jpg",
      "/assets/anime/doraemon/author-gallery-2.jpg",
      "/assets/anime/doraemon/author-gallery-3.jpg",
    ],
  },
  characters: [
    {
      name: "大雄",
      realname: "野比大雄",
      birthday: "8月7日",
      height: "140公分",
      weight: "30公斤",
      nature: "心地善良，并乐于助人",
      favorite: "射击、翻花绳、睡觉、考试抱鸭蛋",
      fear: "青椒",
      image: "/assets/map/character/Nobita/3.png",
    },
    {
      name: "哆啦A梦",
      birthday: "2112.9.3",
      height: "129.3公分",
      weight: "129.3公斤",
      nature: "有时表现出正经，但不时会有脱线的表现",
      favorite: "铜锣烧",
      fear: "老鼠",
      image: "/assets/map/character/Nobita/4.png",
    },
    {
      name: "哆啦美",
      birthday: "2114.12.2",
      height: "100公分",
      weight: "91公斤",
      nature: "性格温和，但是很容易被惹而发脾气（多数是因哥哥）",
      favorite: "唱歌、蜜瓜面包",
      fear: "蟑螂",
      image: "/assets/map/character/Nobita/5.png",
    },
    {
      name: "大雄的妈妈",
      realname: "野比玉子",
      birthday: "2月16日",
      nature:
        "一位勤劳的家庭主妇，个性相当保守，对于新产品及科技等毫无兴趣，常为家中赤字烦恼。",
      favorite: "插画",
      fear: "大雄考试得零分",
      image: "/assets/map/character/Nobita/2.png",
    },
    {
      name: "大雄的爸爸",
      realname: "野比伸助",
      birthday: "1月24日",
      nature:
        "朝九晚五的典型上班族，有抽烟的不良嗜好，对于音乐也甚喜好，曾经花钱买了很贵的音响。",
      favorite: "音乐",
      fear: "驾照考试",
      image: "/assets/map/character/Nobita/1.png",
    },
    {
      name: "胖虎",
      realname: "刚田武",
      birthday: "6月15日",
      height: "145公分",
      weight: "60公斤",
      nature: "调皮，喜欢欺负人，但是疼爱家人，有责任感",
      favorite: "唱歌、做菜、欺负人",
      fear: "做家务",
      image: "/assets/map/character/Giant/1.png",
    },
    {
      name: "小朱",
      realname: "刚田小朱",
      birthday: "7月19日",
      nature:
        "在故事初期较为凶悍粗鲁，后期个性变得较为文静多愁善感，她喜欢画漫画，并梦想成为一名漫画家。",
      favorite: "画漫画",
      image: "/assets/map/character/Giant/2.png",
    },
  ],
  websites: {
    official: [
      {
        name: "哆啦A梦官网",
        url: "http://www.dora-world.com.cn/",
        image: "/assets/anime/doraemon/websites/official-1.png",
        description:
          '影(上海)商贸有限公司经授权在中国大陆地区独家享有"哆啦A梦"形象的著作权权益。',
      },
    ],
    video: [],
  },
};

const koeNoKatachiConfig: AnimeConfig = {
  id: "koe-no-katachi",
  name: "声之形",
  subtitle: "关于理解、成长与救赎",
  color: "#7a66c7",
  banner: "/assets/anime/koe-no-katachi/banner.jpg",
  circleImage: "/assets/index/koe-no-katachi.webp",
  author: {
    name: "大今良时",
    title: "日本漫画家",
    avatar: "/assets/anime/koe-no-katachi/author-avatar.png",
    bio: `
      <p>《声之形》以细腻笔触描绘校园霸凌与自我救赎，温柔却锋利。</p>
    `,
    links: [],
    gallery: [],
  },
  characters: [
    {
      name: "石田将也",
      nature: "从轻率到反省，努力修复关系",
      image: "/assets/anime/koe-no-katachi/characters/shoya.png",
    },
    {
      name: "西宫硝子",
      nature: "温柔坚强，努力与世界沟通",
      image: "/assets/anime/koe-no-katachi/characters/shoko.png",
    },
  ],
  websites: { official: [], video: [] },
};

const bunnyGirlConfig: AnimeConfig = {
  id: "bunny-girl",
  name: "青春猪头少年",
  subtitle: "青春期综合征的奇妙物语",
  color: "#ef5da8",
  banner: "/assets/anime/bunny-girl/banner.jpg",
  circleImage: "/assets/index/bunny-girl.webp",
  author: {
    name: "鸭志田一",
    title: "日本轻小说作家",
    avatar: "/assets/anime/bunny-girl/author-avatar.png",
    bio: `
      <p>以轻快叙事与青春悬疑融合，讲述“看不见”的烦恼。</p>
    `,
    links: [],
    gallery: [],
  },
  characters: [
    {
      name: "梓川咲太",
      birthday: "10月23日",
      height: "171公分",
      weight: "60公斤",
      nature: "性格直率，关心他人",
      favorite: "阅读",
      fear: "失去重要的人",
      image: "/assets/anime/bunny-girl/characters/sakuta.png",
    },
    {
      name: "樱岛麻衣",
      birthday: "12月2日",
      height: "165公分",
      weight: "50公斤",
      nature: "知名女演员，性格独立",
      favorite: "表演",
      fear: "被遗忘",
      image: "/assets/anime/bunny-girl/characters/mai.png",
    },
  ],
  websites: { official: [], video: [] },
};

export const animeConfig: Record<string, AnimeConfig> = {
  doraemon: doraemonConfig,
  "koe-no-katachi": koeNoKatachiConfig,
  "bunny-girl": bunnyGirlConfig,
};

export const animeList = Object.values(animeConfig).map((a) => ({
  id: a.id,
  name: a.name,
  subtitle: a.subtitle,
  image: a.circleImage,
  color: a.color,
}));

