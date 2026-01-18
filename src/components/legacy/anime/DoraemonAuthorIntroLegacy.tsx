"use client";

import { useEffect, useState } from "react";

const contentLeft =
  "       藤子·F·不二雄（ふじこ·F·ふじお）（1933年12月1日—1996年9月23日），原名藤本弘，又名藤子不二雄F。\n" +
  "       日本男性漫画家，出生于日本富山县的高冈市，毕业于富山县立高冈工艺高等学校电气科。小学馆的代表漫画家之一，代表作《哆啦A梦》" +
  "《小鬼Q太郎》《小超人帕门》《超能力魔美》。\n" +
  "       曾经长期与另一位著名日本漫画家安孙子素雄（笔名藤子不二雄A）以藤子不二雄作为共用的笔名，" +
  "先后在艰难的生存环境下画了十多年，并未造成太大热潮，直至实际上可以算是两个人最后的合作《Q太郎》。";

const contentRight =
  "       1947年受到漫画大师手冢治虫的启发，立志成为儿童漫画家。\n" +
  "       1964年凭《Q太郎》一炮走红，从此奠定了他在日本漫画界的重要地位，而他的代表作《哆啦A梦》更掀起了无法抵挡的旋风，\n" +
  "       成为了成千上万儿童心目中永恒的经典，《哆啦A梦》为藤本弘的单人作品。\n" +
  "       1993年，为了纪念藤本弘的成就，在日本的高冈市建成了“哆啦A梦散步道”。\n" +
  "       1996年9月23日凌晨02：10，藤本弘因肝衰竭逝世，享年63岁。";

const contentAuthor =
  "藤子·F·不二雄（藤本弘，ふじもと ひろし，Fujimoto Hiroshi，1933年12月1日－1996年9月23日），是日本著名的漫画家，以创作《哆啦A梦》（Doraemon）而闻名于世。他出生于日本富山县高冈市，从小对绘画和漫画表现出浓厚的兴趣，并在中学时结识了同样热爱漫画的安孙子素雄（藤子不二雄A），两人合作多年，共同使用“藤子不二雄”这一笔名创作了多部作品。1969年，《哆啦A梦》首次连载，讲述了一只来自未来的机器人猫哆啦A梦和小学生野比大雄的冒险故事，该作品迅速获得了广泛欢迎，成为日本乃至全球的经典作品。1987年，两人分道扬镳，藤本弘独自使用“藤子·F·不二雄”的名义继续创作，包括《奇天烈大百科》和《大雄的恐龙》等著名作品。藤子·F·不二雄以其独特的创作风格和深刻的故事内涵，在日本漫画史上占有重要地位，他的作品不仅影响了几代日本读者，也在全球范围内拥有广泛的影响力。1997年，在他的家乡高冈市建立了藤子·F·不二雄纪念馆，以纪念他的贡献和展示他的创作历程。他的创作不仅给无数读者带来了欢乐，也启迪了许多后来者投身于漫画创作，成为日本漫画文化的重要象征，至今仍被广泛阅读和喜爱。";

export function DoraemonAuthorIntroLegacy() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    let leftIndex = 0;
    const leftTimer = window.setInterval(() => {
      if (leftIndex >= contentLeft.length) {
        window.clearInterval(leftTimer);
        return;
      }
      const nextChar = contentLeft[leftIndex] ?? "";
      leftIndex += 1;
      setLeft((prev) => prev + nextChar);
    }, 50);

    let rightIndex = 0;
    const rightTimer = window.setInterval(() => {
      if (rightIndex >= contentRight.length) {
        window.clearInterval(rightTimer);
        return;
      }
      const nextChar = contentRight[rightIndex] ?? "";
      rightIndex += 1;
      setRight((prev) => prev + nextChar);
    }, 50);

    let index = 0;
    let iterationCount = 0;
    const maxIterations = 4;
    const intervalTime = 2;
    const authorTimer = window.setInterval(() => {
      if (iterationCount >= maxIterations) {
        window.clearInterval(authorTimer);
        return;
      }

      const nextChar = contentAuthor[index] ?? "";
      index += 1;
      if (index >= contentAuthor.length) {
        index = 0;
        iterationCount += 1;
      }
      setAuthor((prev) => prev + nextChar);
    }, intervalTime);

    return () => {
      window.clearInterval(leftTimer);
      window.clearInterval(rightTimer);
      window.clearInterval(authorTimer);
    };
  }, []);

  return (
    <div className="author-intro">
      <div className="author-search">
        <a href="https://zh.wikipedia.org/wiki/藤子·F·不二雄" target="_blank" rel="noreferrer">
          去维基百科搜索
          <br />
          藤子·F·不二雄
        </a>
        <br />
        <br />
        <a href="https://baike.baidu.com/item/藤子·F·不二雄" target="_blank" rel="noreferrer">
          去百度百科搜索
          <br />
          藤子·F·不二雄
        </a>
      </div>

      <div className="author-content">
        <div className="left">
          <span>{left}</span>
        </div>
        <div className="right">
          <span>{right}</span>
        </div>
      </div>

      <div className="author-img" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i}>{author}</span>
        ))}
      </div>
    </div>
  );
}

