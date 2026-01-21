import { HomeWithCarousel } from "@/components/home/HomeWithCarousel";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeWithCarousel />
    </Suspense>
  );
}
