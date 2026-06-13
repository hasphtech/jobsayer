import { redirect } from "next/navigation";

// Upgrade plans are now embedded in /profile
export default function UpgradePage() {
  redirect("/profile");
}
