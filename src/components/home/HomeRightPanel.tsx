"use client";

import Image from "next/image";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type BubbleVars = CSSProperties & {
  ["--home-right-float-delay"]?: string;
  ["--home-right-float-duration"]?: string;
};

type TechItem = {
  name: string;
  src: string;
  href: string;
};

const TECH_ITEMS: TechItem[] = [  { name: "Vue", src: "/assets/index/svg/Vue.svg", href: "https://vuejs.org" },
  {
    name: "React",
    src: "/assets/index/svg/React.svg",
    href: "https://react.dev",
  },
  {
    name: "Python",
    src: "/assets/index/svg/Python.svg",
    href: "https://www.python.org",
  },{
    name: "MySQL",
    src: "/assets/index/svg/MySQL.svg",
    href: "https://www.mysql.com",
  },
  {
    name: "Linux",
    src: "/assets/index/svg/Linux.svg",
    href: "https://www.kernel.org",
  },{
    name: "Docker",
    src: "/assets/index/svg/Docker.svg",
    href: "https://www.docker.com",
  },
  {
    name: "Git",
    src: "/assets/index/svg/Git.svg",
    href: "https://git-scm.com",
  },
];

type FunItem = {
  name: string;
  src: string;
};

const FUN_ITEMS: FunItem[] = [
  { name: "坤坤", src: "/assets/index/svg/kunkun.webp" },
  { name: "耄耄", src: "/assets/index/svg/maomao.webp" },
];

const TYPEWRITER_TEXTS = [
  "编程，从入门到入土！",
  "编程，从入门到放弃！",
  "编程，从入门到跑路！",
  "编程，从入门到转行！",
  "编程，从入门到失业！",
];

function Typewriter({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  // Blink cursor
  useEffect(() => {
    const timeout2 = setInterval(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(timeout2);
  }, []);

  useEffect(() => {
    if (subIndex === texts[index].length + 1 && !reverse) {
      const timeout = setTimeout(() => {
        setReverse(true);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && reverse) {
      const timeout = setTimeout(() => {
        setReverse(false);
        setIndex((prev) => (prev + 1) % texts.length);
      }, 0);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        setSubIndex((prev) => prev + (reverse ? -1 : 1));
      },
      reverse ? 75 : 150,
    );

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, texts]);

  return (
    <>
      {texts[index].substring(0, subIndex)}
      <span
        className={`ml-[1px] inline-block h-[18px] w-[2px] bg-[#3F3E3E] align-middle ${blink ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

function bubbleVars(index: number): BubbleVars {
  const delay = `${index * 0.35}s`;
  const duration = `${7.2 + index * 0.6}s`;
  return {
    "--home-right-float-delay": delay,
    "--home-right-float-duration": duration,
  };
}

function BubbleFrame(props: {
  children: ReactNode;
  className?: string;
  style?: BubbleVars;
}) {
  return (
    <div className="home-right-bubble-float" style={props.style}>
      <div
        className={cn(
          "relative overflow-hidden rounded-full border border-black/15 bg-white/85 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02]",
          props.className,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

export function HomeRightPanel() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center gap-4">
        {FUN_ITEMS.map((item, index) => (
          <BubbleFrame
            key={item.name}
            className="h-24 w-24 sm:h-28 sm:w-28"
            style={bubbleVars(index)}
          >
            <Image
              src={item.src}
              alt={item.name}
              fill
              sizes="112px"
              className="object-cover"
              priority={index === 0}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/35 px-2 py-1 text-center text-[11px] font-semibold text-white">
              {item.name}
            </div>
          </BubbleFrame>
        ))}
      </div>

      <BubbleFrame
        className="flex h-56 w-56 flex-col items-center justify-center gap-3 px-6 text-center overflow-visible"
        style={bubbleVars(3)}
      >
        <div className="text-[#3F3E3E] text-base text-[14px] font-semibold tracking-wide h-7 whitespace-nowrap">
          {"Ciallo ～(∠・ω< )⌒★!"}
        </div>
        <div className="text-[#3F3E3E] text-base text-[17px] font-semibold tracking-wide h-7 whitespace-nowrap">
          <Typewriter texts={TYPEWRITER_TEXTS} />
        </div>
        <div className="text-[#3F3E3E]/60 text-xs whitespace-nowrap">（不想学了）</div>
      </BubbleFrame>

      <div className="flex max-w-[18rem] flex-wrap items-center justify-center gap-3">
        {TECH_ITEMS.map((item, index) => (
          <div
            key={item.name}
            className="home-right-bubble-float"
            style={bubbleVars(index + 6)}
          >
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`打开 ${item.name} 官网`}
              title={item.name}
              className="group block"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-black/15 bg-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.04]">
                <Image
                  src={item.src}
                  alt={item.name}
                  width={36}
                  height={36}
                  className="h-9 w-9"
                />
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
