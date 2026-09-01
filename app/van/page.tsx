import type { Metadata } from "next";
import { BodhVan } from "./BodhVan";

export const metadata: Metadata = {
  title: "Bodh Van",
  description: "A world you walk through with Bodh. Places light up as you understand; the map is your own growth.",
};

export default function BodhVanPage() {
  return <BodhVan />;
}
